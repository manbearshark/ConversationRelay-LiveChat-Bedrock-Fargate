import {prompt} from './prompt-albert-einstein.mjs';

/**
 * restaurantOrderingUseCase.js
 * 
 * This is a DynamoDB JSON file used to load data into the DynamoDB instance.
 * 
 * The command to load this item is in the "command-..." file in
 * the parent directory of this stack.
 * 
 */

let useCase = 
{
  "pk": {
    "S": "albertEinsteinUseCase"
  },
  "sk": {
    "S": "configuration"
  },
  "conversationRelayParams": {
    "M": {
      "dtmfDetection": {
        "BOOL": true
      },
      "interruptByDtmf": {
        "BOOL": true
      },
      "interruptible": {
        "BOOL": true
      },
      "transcriptionProvider": {
        "S": "Deepgram"
      },
      "ttsProvider": {
        "S": "ElevenLabs"
      },
      "voice": {
        "S": "tnSpp4vdxKPjI9w0GnoV"
      },
      "welcomeGreeting": {
        "S": "Hi, I understand that you want to find out more about Albert Einstein. What do you want to know?"
      }
    }
  },
  "description": {
    "S": "Demonstrate how voice agent can handle an inbound lead."
  },
  "dtmfHandlers": {
    "S": "{\"0\":{\"replyWithText\":true,\"replyText\":\"You pressed 0.\",\"replyWithFunction\":false,\"replyFunction\":\"\"},\"1\":{\"replyWithText\":true,\"replyText\":\"Let me get the available apartments.\",\"replyWithFunction\":true,\"replyFunction\":\"ListAvailableApartmentsFunction\"},\"2\":{\"replyWithText\":true,\"replyText\":\"I'll check on your appointments\",\"replyWithFunction\":true,\"replyFunction\":\"CheckExistingAppointmentsFunction\"},\"3\":{\"replyWithText\":true,\"replyText\":\"You pressed 3.\",\"replyWithFunction\":false,\"replyFunction\":\"\"},\"4\":{\"replyWithText\":true,\"replyText\":\"You pressed 4.\",\"replyWithFunction\":false,\"replyFunction\":\"\"},\"5\":{\"replyWithText\":true,\"replyText\":\"You pressed 5.\",\"replyWithFunction\":false,\"replyFunction\":\"\"},\"6\":{\"replyWithText\":true,\"replyText\":\"You pressed 6.\",\"replyWithFunction\":false,\"replyFunction\":\"\"},\"7\":{\"replyWithText\":true,\"replyText\":\"You pressed 7.\",\"replyWithFunction\":false,\"replyFunction\":\"\"},\"8\":{\"replyWithText\":true,\"replyText\":\"You pressed 8.\",\"replyWithFunction\":false,\"replyFunction\":\"\"},\"9\":{\"replyWithText\":true,\"replyText\":\"You pressed 9.\",\"replyWithFunction\":false,\"replyFunction\":\"\"}}"
  },
  "pk1": {
    "S": "use-case"
  },
  "prompt": {
    "S": JSON.stringify(prompt.text) 
  },
  "sk1": {
    "S": "albertEinsteinUseCase"
  },
  "title": {
    "S": "Albert Einstein Guide"
  },
  "tools": {
    "S": "[{\"toolSpec\":{\"name\":\"CheckRestaurantDeliveryTime\",\"description\":\"This function checks to see when the order will be delivered.\",\"inputSchema\":{\"json\":{\"type\":\"object\",\"properties\":{\"order_type\":{\"type\":\"string\",\"enum\":[\"pickup\",\"delivery\"],\"description\":\"The type of order.\"}},\"required\":[\"order_type\"]}}}}]"
  }
};

console.log(JSON.stringify(useCase));