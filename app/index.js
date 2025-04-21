import express from "express";
import bodyParser from "body-parser";
import { WebSocketServer } from "ws";
import { setupCallPostHandler } from './lib/setup-call-post-handler.mjs';
import { defaultWebsocketHandler as websocketTwilioEventsHandler } from './lib/default-websocket-handler.mjs';

import { v4 as uuidv4 } from 'uuid';
import url from 'url';

const app = express();
const port = 3000;
const wsServer = new WebSocketServer({ noServer: true });
const server = app.listen(port, () => {
  console.log(`App is ready.`);
});

// Twilio sends form url endcoded data
app.use(bodyParser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

// Twilio will send a POST request to this endpoint when estabilishing a call
app.post('/call-setup-restaurant-order', async (req, res) => {
  try {
    // 1) Parse BODY of request to extract Call Details
    // 2) Generate a UUID for this call session
    let callSetupSessionId = uuidv4();
    console.log("Twilio Body: ", JSON.stringify(req.body));
    const twilio_body = req.body;
    // 3) Call the setupCallPostHandler function to handle the Twilio request
    const twilmlResponse = await setupCallPostHandler(twilio_body, callSetupSessionId);
    // 4) Send the TwiML response back to Twilio
    res.status(200).type('application/xml').send(twilmlResponse);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while processing your request.");
  }
});

// Health check endpoint for load balancers
app.get('/health', (req, res) => {
  // Health check endpoint
  res.send('Healthy');
});

// WebSocket handlers - this server is shared with the HTTP server
server.on('upgrade', (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, (socket) => {
    // Get the call session ID for the WebSocket connection
    const URLparams = url.parse(request.url, true).query;
    if(URLparams.callSetupSessionId) {
      // The call setuo session ID is passed in the URL as a query parameter object
      request.callSetupSessionId = URLparams.callSetupSessionId;
      wsServer.emit('connection', socket, request, head);
    } else {
      console.error('No requestId found in the request URL');
      socket.terminate();
    }
  })
});

function heartbeat() {
  this.isAlive = true;
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
  // THIS METHOD MUST NOT BE ASYNC - ONLY THE ONMESSAGE HANDLER CAN BE ASYNC
  // Message handler for Twilio incoming messages
  socket.on('message', async (message) => {
    const messageJSON = JSON.parse(message.toString());

    let ws_domain_name = process.env.WS_DOMAIN_NAME;
    let ws_stage = "";
    let toolCallCompletion = false;
    // We will use the session ID from the Twilio session as a way to link logs on the Twilio side JIC
    const wsSessionId = messageJSON.sessionId;
    const callSetupSessionId = request.callSetupSessionId;
    //console.log('Received message:', messageJSON);
    console.info("EVENT\n" + JSON.stringify(messageJSON, null, 2)); 
    console.info(`"callSetupSessionId: ${callSetupSessionId} wsSessionId: ${wsSessionId}`);

    try {
        await websocketTwilioEventsHandler(callSetupSessionId, wsSessionId, ws_domain_name, socket, ws_stage, messageJSON, toolCallCompletion); 
        //socket.send(JSON.stringify({ statusCode: 200, body: 'Completed.' }));

    } catch (error) {
        console.log("Message processing error => ", error);
        //socket.send(JSON.stringify({ statusCode: 500, body: 'Message processing error ' + JSON.stringify(error) }));
    }  
  });
  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  socket.on('close', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });
  socket.on('pong', heartbeat);
});



