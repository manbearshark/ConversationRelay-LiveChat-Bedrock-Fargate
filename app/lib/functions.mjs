/**
 *  checkDeliveryTime
 * 
 * Simple sample function for tool call
 */
   
import { PutCommand } from "@aws-sdk/lib-dynamodb";   

// Function to schedule a tour
export async function CheckRestaurantDeliveryTime(ddbDocClient, tool) {

    console.info("in CheckRestaurantDeliveryTime and tool\n" + JSON.stringify(tool, null, 2));    

    let input = tool.input;    

    console.info("input\n" + JSON.stringify(input, null, 2));     

    let deliveryTimes = [
        {time: "45 minutes", message:"We are starting your order right now and can have it to you in 45."},
        {time: "1 hour", message:"We will deliver your order in one hour."},
        {time: "1 hour and 15 minutes", message:"We are a little backed up right now so we will delivery your order in one hour and 15 minutes."}
    ];

    let deliveryTime = deliveryTimes[ ( Math.floor (Math.random() * deliveryTimes.length) ) ];
  
    console.log(`[checkDeliveryTime] successfully run.`);

    let toolResult = { deliveryTime: deliveryTime.time, message: deliveryTime.message };

    await saveToolResult(ddbDocClient, tool, toolResult);

    return true;

}

/**
 *  checkDeliveryTime
 * 
 * Simple sample function for tool call
 */
   

// Function to schedule a tour
export async function CheckRestaurantPickUpTime(ddbDocClient, tool) {

    console.info("in CheckRestaurantPickUpTime and tool\n" + JSON.stringify(tool, null, 2));    
    
    let input = tool.input;

    console.info("input\n" + JSON.stringify(input, null, 2));     

    let pickupTimes = [
        {time: "15 minutes", message:"We are starting your order right now! See you in 15 minutes."},
        {time: "30 minutes", message:"We will have your order ready in 30 minutes."},
        {time: "45 minutes", message:"We are a little backed up right now so you order will be ready in 45 minutes."}
      ];
    
      let pickupTime = pickupTimes[ ( Math.floor (Math.random() * pickupTimes.length) ) ];
    
      // Return confirmation message for the successful scheduling

    console.log(`[CheckPickUptime] successfully run.`);

    let toolResult = { pickupTime: pickupTime.time, message: pickupTime.message };

    console.info("in CheckRestaurantPickUpTime and toolResult\n" + JSON.stringify(toolResult, null, 2));    

    await saveToolResult(ddbDocClient, tool, toolResult);

    return true;

}

/**
 * makeFunctionCalls
 * 
 */


// Functions are called dynamically but ONLY if they match a function
// in this object.
const FunctionHandler = {
    PlaceOrderFunction,
    CheckRestaurantPickUpTime,
    CheckRestaurantDeliveryTime        
};

export async function makeFunctionCalls(ddbDocClient, tool_calls_object, callSid, callConnection) {

  try {
    const tool_calls = Object.values(tool_calls_object).map(tool => {                
        return {             
            ...tool, 
            callSid: callSid, 
            userContext: callConnection.userContext,
            call_details: {
                to_phone: callConnection.To,
                from_phone: callConnection.From,
                twilio_call_sid: callConnection.CallSid,
                twilio_account_sid: callConnection.AccountSid                            
            }
        };                                                
    });          

    await Promise.all(tool_calls.map(async (tool) => {
      try {

        console.log("tool in promise all => ", tool);
        await FunctionHandler[tool.name](ddbDocClient, tool);
      } catch (error) {
        console.error(`Error calling function ${tool.name}: `, error);
        throw new Error(`Error calling function ${tool.name}: ` + error.message);
      }
    }));
    
    return true;
  } catch (error) {
    console.error("Error in makeFunctionCalls: ", error);
    throw new Error('Error in makeFunctionCalls: ' + error.message);
  }
}

async function saveToolResult(ddbDocClient, tool, toolResult) {

    let finalToolResult = { 
      role: "user", 
      content: [
        {
          toolResult: {
            toolUseId: tool.toolUseId,
            content: [
              {
                "json": toolResult            
              }
            ]
          }
        }
      ]
    };        
  
    console.info("in saveToolResult and finalToolResult\n" + JSON.stringify(finalToolResult, null, 2));      
  
    // Persist the current prompt so it is included 
    // in subsequent calls.
    await ddbDocClient.send(
        new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: {
                pk: tool.callSid,
                sk: `chat::${Date.now().toString()}${tool.toolUseId.slice(-5)}`, // add last 5 chars of tool_call_id.slice(-5) ensure unique
                chat: finalToolResult,
                expireAt:  parseInt((Date.now() / 1000) + 86400)  // Expire "demo" session data automatically (can be removed)
            }
        })
    );
  
    return true;
  
  }


/**
 *  PlaceOrderFunction
 * 
 * Simple sample function for tool call
 */

// Function to schedule a tour
export async function PlaceOrderFunction(ddbDocClient, tool) {

  console.info("in PlaceOrderFunction and tool\n" + JSON.stringify(tool, null, 2));    
  
  let input = tool.input;  

  console.info("input\n" + JSON.stringify(input, null, 2));  

  // Create an order id based on the websocket connection id
  // so that this order can be easily pulled up later in this session
  // using "begins_with".
  let order_sk = `restaurantOrder::${tool.callSid.slice(-4)}::${(Math.floor(Date.now() / 1000)).toString()}`;
  console.log("order_sk ==> ", order_sk);

  let pk = (tool.userContext.pk) ? tool.userContext.pk : tool.callSid;
  let sk1 = (tool.call_details) ? tool.call_details.to_phone : tool.callSid;
  
  let confirmedOrder = {
    pk: pk,
    sk: order_sk,
    pk1: 'restaurantOrder', 
    sk1: sk1,
    order: {
      order_items: input.current_order,
      order_type: input.order_type,
      order_total: input.order_total
    },
    expireAt:  parseInt((Date.now() / 1000) + (86400 * 7))  // Expire "demo" session data automatically (can be removed)
  };
  
  await ddbDocClient.send(
    new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: confirmedOrder
  }));  

  console.log(`[PlaceOrderFunction] Order successfully saved.`);

  let toolResult = { message: `Your order has been accepted.`};

  await saveToolResult(ddbDocClient, tool, toolResult);

  return true;
}