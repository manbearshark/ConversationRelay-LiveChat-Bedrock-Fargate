import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

import express from "express";
import { WebSocketServer } from "ws";
import { setupCallPostHandler } from './lib/setup-call-post-handler.mjs';

const app = express();
const port = 3000;
const wsServer = new WebSocketServer({ noServer: true });
const server = app.listen(port, () => {
  console.log(`Access your application at`, `http://localhost:${port}`)
});

// Create a Bedrock Runtime client in the AWS Region you want to use and this service is running in.
let client;
const inferenceProfileArn = process.env.INFERENCE_PROFILE_ARN;
const region = process.env.AWS_REGION;

try {
  client = new BedrockRuntimeClient({ region });
  console.log("Client");
  console.log(`Inference Profile ARN: ${inferenceProfileArn}`);
} catch (err) {
  console.error(err);
}

app.get('/', async (req, res) => {
  try {
    const userMessage =
      "Describe the purpose of a 'hello world' program in one line.";
    const conversation = [
      {
        role: "user",
        content: [{ text: userMessage }],
      },
    ];
    console.log(`Sending message: ${userMessage}`);

    // Create a command with the model ID, the message, and a basic configuration.
    const command = new ConverseCommand({
      modelId: inferenceProfileArn,
      messages: conversation,
      inferenceConfig: { maxTokens: 512, temperature: 0.5, topP: 0.9 },
    });
    const response = await client.send(command);
    const answer = response;
    console.log(`Got answer: ${answer}`);

    res.send(answer);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while processing your request.");
  }
});

app.get('/health', (req, res) => {
  // Health check endpoint
  res.send('Healthy');
});

// WebSocket handlers

server.on('upgrade', (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, (socket) => {
    wsServer.emit('connection', socket, request);
  })
});

wsServer.on('connection', (socket, request) => {
  socket.on('message', async (message) => {
    try {
      const userMessage = JSON.parse(message).message;
      const conversation = [
        {
          role: "user",
          content: [{ text: userMessage }],
        },
      ];
      console.log(`Sending message: ${userMessage}`);

      // Create a command with the model ID, the message, and a basic configuration.
      const command = new ConverseCommand({
        modelId: inferenceProfileArn,
        messages: conversation,
        inferenceConfig: { maxTokens: 512, temperature: 0.5, topP: 0.9 },
      });
      const response = await client.send(command);
      const answer = response;
      console.log(`Got answer: ${answer}`);

      socket.send(JSON.stringify({ message: answer }));
    } catch (error) {
      console.error(error);
      socket.send(
        JSON.stringify({
          message: "An error occurred while processing your request.",
        })
      );
    }
  })
});