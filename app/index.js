import express from "express";
import bodyParser from "body-parser";
import { WebSocketServer } from "ws";
import { setupCallPostHandler } from './lib/setup-call-post-handler.mjs';
import { onConnectWebsocketHandler } from './lib/onconnect-websocket-handler.mjs';
import querystring from 'node:querystring';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = 3000;
const wsServer = new WebSocketServer({ noServer: true });
const server = app.listen(port, () => {
  console.log(`App is ready.`);
});

app.use(bodyParser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

// Twilio will send a POST request to this endpoint when estabilishing a call
app.post('/call-setup-restaurant-order', async (req, res) => {
  try {
    // 1) Parse BODY of request to extract Call Details
    // 2) Generate a UUID for this call session
    let callSessionId = uuidv4();
    console.log("Twilio Body: ", JSON.stringify(req.body));
    const twilio_body = req.body;
    // 3) Call the setupCallPostHandler function to handle the Twilio request
    const twilmlResponse = await setupCallPostHandler(twilio_body, callSessionId);
    // 4) Send the TwiML response back to Twilio
    res.status(200).type('application/xml').send(twilmlResponse);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while processing your request.");
  }
});

// Healthscheck endpoint for load balancers
app.get('/health', (req, res) => {
  // Health check endpoint
  res.send('Healthy');
});

// WebSocket handlers - this server is shared with the HTTP server
server.on('upgrade', (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, (socket) => {
    const callSessionId = uuidv4();
    wsServer.emit('connection', socket, request, head, callSessionId);
  })
});

wsServer.on('connection', (socket, request, head, callSessionId) => {
  console.log('Client connected request: ', JSON.stringify(request));
  console.log('Client connected headers: ', JSON.stringify(head));

  socket.on('message', async (message, callSessionId) => {

  });
});

    // try {
    //   const userMessage = JSON.parse(message).message;
    //   const conversation = [
    //     {
    //       role: "user",
    //       content: [{ text: userMessage }],
    //     },
    //   ];
    //   console.log(`Sending message: ${userMessage}`);

    //   // Add onconnect call here...

    //   socket.send(JSON.stringify({ message: answer }));
    // } catch (error) {
    //   console.error(error);
    //   socket.send(
    //     JSON.stringify({
    //       message: "An error occurred while processing your request.",
    //     })
    //   );
    // }