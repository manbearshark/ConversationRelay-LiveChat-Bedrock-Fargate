import express from "express";
import bodyParser from "body-parser";
import { WebSocketServer } from "ws";
import { setupCallPostHandler } from './lib/setup-call-post-handler.mjs';
import { defaultWebsocketHandler as websocketTwilioEventsHandler } from './lib/default-websocket-handler.mjs';

import url from 'url';

// Initialize the Express app and websocket server
const app = express();
const port = 3000;
const wsServer = new WebSocketServer({ noServer: true });
const server = app.listen(port, () => {
  console.log(`App is ready.`);  
  console.debug(`TABLE_NAME => ${process.env.TABLE_NAME}`);
  console.debug(`AWS_REGION => ${process.env.AWS_REGION}`);  
  console.debug(`STACK_USE_CASE => ${process.env.STACK_USE_CASE}`);
  console.debug(`WS_URL => ${process.env.WS_URL}`);
  console.debug(`MODEL_IDENTIFIER => ${process.env.MODEL_IDENTIFIER}`);
});

// Twilio sends form url endcoded data
app.use(bodyParser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

/**
 * Twilio will send a POST request to this endpoint when estabilishing a call
 * Twilio expects a TwiML response to be sent back to it 
 */ 
app.post('/twiml', async (req, res) => {
  try {
    
    // Parse BODY of request to extract Call Details
    console.log("Twilio Body: ", JSON.stringify(req.body));
    const twilioBody = req.body;

    // Call the setupCallPostHandler function to dynamically generate the 
    // TwiML needed for this Csession handle the Twilio request and return a TwiML response    
    const twimlResponse = await setupCallPostHandler(twilioBody);
    
    // Send the TwiML response back to Twilio
    res.status(200).type('application/xml').send(twimlResponse);

  } catch (error) {
    console.error("Error in POST /twiml => ", error);
    res.status(500).send("An error occurred while processing your request.");
  }
  
});

// Health check endpoint for load balancers
app.get('/health', (req, res) => {  
  res.send('Healthy');
});

// WebSocket handlers - this server is shared with the HTTP server
server.on('upgrade', (request, socket, head) => {
  
  wsServer.handleUpgrade(request, socket, head, (socket) => {
    
    // Get the Twilio callSid to use as session ID for the WebSocket connection
    const URLparams = url.parse(request.url, true).query;
    if(URLparams.callSid) {      
      request.callSid = URLparams.callSid;
      wsServer.emit('connection', socket, request, head);
    } else {
      console.error('No requestId found in the request URL');
      socket.terminate();
    }
  })
});

function heartbeat() {
  this.isAlive = true;
  console.log("Heartbeat received");
}

const interval = setInterval(function ping() {
  wsServer.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Handler functions for post WS connection
wsServer.on('connection', (socket, request, head) => {
  socket.isAlive = true;
  
  // Message handler for Twilio incoming messages
  // THIS METHOD MUST NOT BE ASYNC - ONLY THE ONMESSAGE HANDLER CAN BE ASYNC
  
  // Session Key is the callSid passed in the URL and from Twilio
  const callSid = request.callSid;  
  
  socket.on('message', async (message) => {
    
    // Parse the incoming message from Twilio
    const messageJSON = JSON.parse(message.toString());
    
    let toolCallCompletion = false; // False because tool call completion events do not come this way
    
    console.info("EVENT\n" + JSON.stringify(messageJSON, null, 2)); 
    console.info(`In onMessage handler: callSid: ${callSid}`);

    try {
      
      // Primarily handler for messages from Twilio ConversationRelay
      await websocketTwilioEventsHandler(callSid, socket, messageJSON, toolCallCompletion); 

    } catch (error) {

        console.log("Message processing error => ", error);
    }  
  });
  
  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  socket.on('close', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });
  
  socket.on('ping', heartbeat);

});



