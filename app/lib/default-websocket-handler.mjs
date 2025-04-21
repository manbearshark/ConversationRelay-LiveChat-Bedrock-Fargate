// Code for this lambda broken into several modules 
import { prepareAndCallLLM } from './prepare-and-call-llm.mjs';
import { savePrompt } from './database-helpers.mjs';
import { makeFunctionCalls } from './functions.mjs';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { onConnectWebsocketHandler } from './onconnect-websocket-handler.mjs';
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(client);       

const getCallConnection = async (connectionId) => {
    try {
        // Get the core details from this connection (included user context,
        // use case, configuration details)
        const callConnection = await ddbDocClient.send( new GetCommand( { TableName: process.env.TABLE_NAME, Key: { pk: connectionId, sk: "connection" } } ));
        if(!callConnection) {
            console.error("No call connection found for connectionId: ", connectionId);
            return;
        }
        return callConnection;
    } catch (error) {
        console.error("Error getting call connection: ", error);
        throw error;
    }
};

export const defaultWebsocketHandler = async (callSetupSessionId, connectionId, ws_domain_name, socket, ws_stage, body, toolCallCompletion) => { 
    try {

        if (body?.type === "error") {
            console.error("Error event received from ConversationRelay server: ", body.description);
        }

        // Text prompts and dtmf events sent via WebSockets 
        // and tool call completion events follow the same steps and call the LLM
        if (body?.type === "prompt" || body?.type === "dtmf") {                        

            const callConnection = await getCallConnection(connectionId);

            const llmResult = await prepareAndCallLLM({
                ddbDocClient: ddbDocClient, 
                connectionId: connectionId, 
                callConnection: callConnection, 
                socket: socket, 
                ws_domain_name: ws_domain_name, 
                ws_stage: ws_stage, 
                body: body, 
                toolCallCompletion: toolCallCompletion
            });
                

            console.info("llmResult\n" + JSON.stringify(llmResult, null, 2));

            // Format the llmResult into a chat message to persist to the database
            let newAssistantChatMessage = {
                role: "assistant",
                content: llmResult.content
            };
            
            // If tool_calls are present, convert the tool call object to
            // an array to adhere to llm chat messaging format
            /*if (Object.keys(llmResult.tool_calls).length > 0 ) {
                // Format tool_calls object into an array
                newAssistantChatMessage.tool_calls = Object.values(llmResult.tool_calls);
            }*/

            //console.info("newChatMessage before saving to dynamo\n" + JSON.stringify(newAssistantChatMessage, null, 2));    

            // Save LLM result prompt to the database            
            await savePrompt(ddbDocClient, connectionId, newAssistantChatMessage);

            //console.info("newAssistantChatMessage after saving to dynamo\n" + JSON.stringify(newAssistantChatMessage, null, 2));
            
            // If the LLM Results includes tool call(s), format the results 
            // and make the tool calls
            if (Object.keys(llmResult.tool_calls).length > 0 ) {
                
                // Send tool call(s) to handler function
                let toolCallResult = await makeFunctionCalls(ddbDocClient, llmResult.tool_calls, connectionId, callConnection, ws_domain_name, ws_stage);

                // Upon successfully running the tool calls...
                if (toolCallResult) {

                    toolCallCompletion = true;

                    // Tool Call(s) successfully completed so 
                    // call the LLM a second time.
                    await prepareAndCallLLM({
                        ddbDocClient: ddbDocClient, 
                        connectionId: connectionId, 
                        callConnection: callConnection, 
                        socket: socket, 
                        ws_domain_name: ws_domain_name, 
                        ws_stage: ws_stage, 
                        body: null, 
                        toolCallCompletion: toolCallCompletion
                    }); 

                }
            }

        } else if (body?.type === "interrupt") {

            /**
             * "interrupt" event sent by the ConversationRelay server when the user speaks 
             * before the text-to-speech has completed.
             * 
             * {
             *  "type" : "interrupt",
             *  "utteranceUntilInterrupt": "Life is a complex set of",
             *  "durationUntilInterruptMs": "460"
             * }
             * 
             * This implementation does not track interruptions.
             * 
             */

            // PUT records
            // pk = event.requestContext.connectionId 
            // sk = interrupt
            // ts = unix timestamp
     
        } else if (body?.type === "setup") {

            /**
             * "setup" event sent from ConversationRelay server as initial session message.
             * This event can be used for additional configuration for this call.
             * 
             * {
             *  "type": "setup",
             *  "sessionId": "",
             *  "callSid": "",
             *  "parentCallSid": null,
             *  "from": "+14085551212",
             *  "to": "+18881234567",
             *  "forwardedFrom": null,
             *  "callerName": null,
             *  "direction": "inbound",
             *  "callType": "PSTN",
             *  "callStatus": "IN-PROGRESS",
             *  "accountSid": "",
             *  "applicationSid": ""
             * }
             * 
             * This implementation does utilize the setup event.
             */
            
            // PUT record
            // pk = event.requestContext.connectionId 
            // sk = setup
            try {
                // Establish the connection in the DB and in the message handler functions...
                console.log("onConnectWebsocketHandler called with callSetupSessionId: ", callSetupSessionId, " connectionId: ", connectionId);
                await onConnectWebsocketHandler(callSetupSessionId, connectionId);
            } catch (error) {
                console.error("Error in onConnectWebsocketHandler: ", error);
            }
        } else if (body?.type === "end") {

            /**
             * "end" event is the last message sent by the ConversationRelay server. This
             * message can be used for any "clean up" processing.
             * 
             * {
             *  "type" : "end",
             *  "handoffData": "{\"reasonCode\":\"live-agent-handoff\", \"reason\": \"The caller wants to talk to a real person\"}"
             * }
             * 
             * This implementation does not use the end event.
             */

            // PUT record
            // pk = event.requestContext.connectionId 
            // sk = end
            
        }
    } catch (error) {
        console.log("defaultWebsocketHandler generated an error => ", error);
        throw new Error(error); 
    }
};