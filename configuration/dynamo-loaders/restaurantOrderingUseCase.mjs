import {prompt} from './prompt-restaurant-ordering.mjs';

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
    "S": "restaurantOrderingUseCase"
  },
  "sk": {
    "S": "configuration"
  },
  "conversationRelayParams": {
    "M": {
      "dtmfDetection": {
        "BOOL": true
      },
      "interruptible": {
        "BOOL": true
      },
      "interruptByDtmf": {
        "BOOL": true
      },
      "ttsProvider": {
        "S": "google"
      },
      "transcriptionProvider": {
        "S": "deepgram"
      },            
      "voice": {
        "S": "en-US-Journey-O"
      },
      "welcomeGreeting": {
        "S": "Thanks for calling Twilio Dough Boy Pizza! How can I help you?"
      }
    }
  },
  "description": {
    "S": "Demonstrate how a customer can call into a restaurant and place an order"
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
    "S": "restaurantOrderingUseCase"
  },
  "title": {
    "S": "Restaurant Ordering"
  },
  "tools": {
    "S": '[{"toolSpec":{"name":"PlaceOrderFunction","description":"When a caller has finished adding items to an order, use this tool to save and place the order.","inputSchema":{"json":{"type":"object","properties":{"current_order":{"type":"array","description":"The restaurant order containing all of the items the user wants in this order.","items":{"type":"object","properties":{"line_item":{"type":"string","description":"The menu title of the item in the order plus any additions like toppings."},"additonal_details":{"type":"string","description":"Additional toppings or any details about this menu item."},"line_amount":{"type":"number","description":"The amount of this item in the order."}},"required":["line_item","line_amount"]}},"order_type":{"type":"string","enum":["pickup","delivery"],"description":"The type of order."},"order_total":{"type":"number","description":"The sum amount of all of order items."},"delivery_address":{"type":"string","description":"Street address, city, state and zip code for the delivery."}},"required":["order_type","order_total"]}}}},{"toolSpec":{"name":"CheckRestaurantPickUpTime","description":"This function checks to see when the order will be ready for pickup.","inputSchema":{"json":{"type":"object","properties":{"order_type":{"type":"string","enum":["pickup","delivery"],"description":"The type of order."}},"required":["order_type"]}}}},{"toolSpec":{"name":"CheckRestaurantDeliveryTime","description":"This function checks to see when the order will be delivered.","inputSchema":{"json":{"type":"object","properties":{"order_type":{"type":"string","enum":["pickup","delivery"],"description":"The type of order."}},"required":["order_type"]}}}}]'
  }
};

console.log(JSON.stringify(useCase));