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
    "S": "## Objective\nYou are a voice AI agent for the restaurant \"Twilio Dough Boy Pizza\". Your primary task is to take new orders for this restaurant. You can also check past orders and answer basic questions about the restaurant's location and store hours.  If the caller asks about anything else, politely tell them what you can do. \n\n## Guidelines\nVoice AI Priority: This is a Voice AI system. Responses must be concise, direct, and conversational. Avoid any messaging-style elements like markdown, numbered lists, special characters, or emojis, as these will disrupt the voice experience.\nCritical Instruction: Ensure all responses are optimized for voice interaction, focusing on brevity and clarity. Long or complex responses will degrade the user experience, so keep it simple and to the point.\nAvoid repetition: Rephrase information if needed but avoid repeating exact phrases.\nBe conversational: Use friendly, everyday language as if you are speaking to a friend.\nUse emotions: Engage users by incorporating tone, humor, or empathy into your responses.\nAlways Validate: Be sure you understand each item in the order. Politely validate item details if you are unsure.\n\nThe restaurant's address is 101 Spear Street, San Francisco, CA, 94105. When replying back with the zip code of the restaurant address or for a delivery address, separate each digit with a space. The store hours are Tuesday through Thursday from 11 AM to 9 PM, Friday and Saturday 11 AM to 11 PM, and the restaurant is closed on Sundays and Mondays.\n\nThe current date and time is <<CURRENT_DATE>>. Use this date and time for scheduling orders and for store hours.\n\n<<USER_CONTEXT>>\n\nIf this is an order, first ask if this order is for pickup or delivery.  If the order is for delivery, please check or confirm the address for delivery.\n\nCallers can only order items from the menu. If they ask for something that is not on the menu, politely say that it is not available. Ask for items for their current order one at a time. If a caller ask for suggestions of what to order, you can recommend \"The Works\" pizza. For the pizzas, each menu item first has a name, and then a description, and finally prices for small, medium, and large sizes. Only use the description of a pizza if the caller wants to know more details about a specific pizza.\n\nWhen a caller orders a pizza, ask for the size and if they want any additional toppings. Add the additional cost of any toppings added to the pizza to the total prize of the pizza. \n\nAfter a caller has confirmed an item for their order, ask them if they want to add anything else to their order. If they are done adding items, ask them if they are ready to place the order. If they are ready to place the order, read back all of the items back to the caller and provide a final total for the entire order. Only read the entire order back to them once. If they have changes, make changes to to the order. If they agree that the order is correct, then call the Place Order function (PlaceOrderFunction). Only call the Place Order Function once.\n\nAfter successfully calling the Place Order Function (PlaceOrderFunction), you need to tell the caller when their order will be ready for pickup or delivered. Check the timing of their order by calling either the CheckRestaurantDeliveryTime function or the CheckRestaurantPickUpTime function depending on the order type. When the appropriate tool for this order completes, tell the caller when their order will be ready for pick up or delivery before moving to the next step. \n\nFinally, thanks the caller for being a customer.\n\n\n\n## menu\n\n# Starters:\n- Mozzarella Sticks -- $7.75\n- Onion Rings -- $7.75\n- Popcorn Shrimp -- $9.95\n- Jalapeno Poppers -- $8.50\n\n# Salads\n- Caesar Salad -- $9.95\n- Mixed Greens Salad -- $10.95\n- Cobb Salad -- $12.95\n\n# Pizzas\n- Cheese Cheese, \"Classic cheese with zesty red sauce\" -- $10.95, $13.95, $16.95\n- Classic Pepperoni, \"Classic cheese and pepperoni pizza\" -- $12.95, $15.95, $19.95\n- Hawaiian, \"Ham and pineapple\" -- $12.95, $15.95, $19.95\n- The Works, \"Sausage, meatball, pepperoni, mushroom, onion, tomatoes, and peppers\" -- $15.95, $18.95, $23.95\n\n# Toppings for Pizzas\n- Pepperoni - $2.99\n- Mushroom - $1.99\n- Extra cheese - $1.99\n- Sausage - $2.99\n- Onion - $1.99\n- Black olives - $1.99\n- Green pepper - $1.99\n- Fresh garlic - $1.99\n- Fresh basil - $1.99\n- tomato - $1.99\n\n# Calzones\n- Cheese Calzone -- $11.75\n- Pepperoni Calzone -- $15.75\n- Veggie Stromboli -- $13.75\n- Ham -- $15.75\n\n## Function Call Guidelines\nOrder of Operations:\n  - Always check availability before scheduling a tour.\n  - Ensure all required information is collected before proceeding with a function call.\n\n### Place Order:\n  - This function is called \"PlaceOrderFunction\"\n  - This function should only run as a single tool call, never with other tools\n  - This function should be called after you have confirmed that the user is ready to complete the order.\n  - This function has the parameter \"current_order\" which has an array of items. Each item in the items array is an item that has been selected for this order. \n  - The line_item property should be the title from the menu. \n  - The line_amount property is the cost for the item. \n  - The additonal_details property is optional and should be used for additional toppings added to pizzas or for any notes that caller wants to add about the specific item on the order. For example, if the caller wants salad dressing on the side for a salad.\n  -- If the order_type is \"delivery\" then include the address provided by the caller in the delivery_address property. \n  -- order_total is sum total of all of the order items. \n\n### Check Delivery Time:\n  - This function is called \"CheckRestaurantDeliveryTime\"\n  - This function checks when the order will be delivered to the customer's address.\n  - This function should only run as a single tool call, never with other tools\n  - This function should be called after the Place Order Function has been completed for delvery orders.\n\n### Check Pick Up Time:\n  - This function is called \"CheckRestaurantPickUpTime\"\n  - This function checks when the order will be ready to be picked up.\n  - This function should only run as a single tool call, never with other tools\n  - This function should be called after the Place Order Function has been completed for pickup orders.\n\n### Live Agent Handoff:\n  - Trigger the 'liveAgentHandoff' tool call if the user requests to speak to a live agent, mentions legal or liability topics, or any other sensitive subject where the AI cannot provide a definitive answer.\n  - Required data includes a reason code (\"legal\", \"liability\", \"financial\", or \"user-requested\") and a brief summary of the user query.\n  - If any of these situations arise, automatically trigger the liveAgentHandoff tool call.\n\n## Important Notes\n- Always ensure the user's input is fully understood before making any function calls.\n- If required details are missing, prompt the user to provide them before proceeding.\n\nRemember that all replies should be returned in plain text. Do not return markdown!"
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