/**
 * invoke-bedrock.mjs
 * 
 * This module formats the prompt, invokes bedrock, handles and 
 * formats the streamed response, and returns a results object.
 * 
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/bedrock-runtime/command/ConverseStreamCommand/
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-bedrock-runtime/Interface/ConverseStreamCommandInput/
 * 
 */
import { BedrockRuntimeClient, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
const bedrockClient = new BedrockRuntimeClient();

export async function invokeBedrock(promptObj) {

    try {
        //console.info("in [ invokeBedrock ] and promptObj ==> \n" + JSON.stringify(promptObj, null, 2));     

        // Use the Bedrock ConverseStreamCommand to call the LLM
        // via the Inference Profile set up in the ENV
        const modelInferenceProfile = process.env.INFERENCE_PROFILE_ARN;
        const bedrockInput = {
            modelId: modelInferenceProfile,
            messages: promptObj.messages,
            system: promptObj.callConnection.systemPrompt,
            toolConfig: { tools: JSON.parse(promptObj.callConnection.tools) },
            inferenceConfig: {
                maxTokens: 1600,
                temperature: 0.3,
                topP: 1.0,
                stopSequences: []
            }
        };
        
        //console.info("in [ invokeBedrock ] and bedrockInput ==> \n" + JSON.stringify(bedrockInput, null, 2));  

        // This is not a tool call completion so provide the 
        // tools available for the LLM to call
        /*if (!promptObj.toolCallCompletion) {
            bedrockInput.toolConfig.tools = JSON.parse(promptObj.callConnection.tools);               
        } */   

        // Instantiate the object that LLM returns.
        let returnObj = {};
        returnObj.role = "assistant";
        returnObj.content = [];    
        returnObj.tool_calls = {};    
        returnObj.last = true;
        returnObj.finish_reason = "";
        
        let llmTextResponse = "";
            
        // Declare WebSocket client to return text to Twilio
        // Client is instantiated in parent lambda.
        const ws_client = promptObj.socket;

        // call Bedrock and wait for response...
        const bedrockCommand = new ConverseStreamCommand(bedrockInput);

        //console.info("in [ invokeBedrock ] and bedrockCommand ==> \n" + JSON.stringify(bedrockCommand, null, 2));  

        const bedrockResponse = await bedrockClient.send(bedrockCommand);

        //console.info("in [ invokeBedrock ] and bedrockResponse ==> \n" + JSON.stringify(bedrockResponse, null, 2));  
    
        const contentBlocks = []; // Array for llm responses (could be text or tool use)
        contentBlocks.push({ responseType: "", content: "" }); // There will be at least one content block

        //console.info("in [ invokeBedrock ] and instantiated contentBlocks ==> \n" + JSON.stringify(contentBlocks, null, 2));
        
        let lastContentBlockIndex = 0;

        // Iterate over stream
        for await (const chunk of bedrockResponse.stream) {
            try {    
                //console.info("chunk => \n" + JSON.stringify(chunk, null, 2)); 
                
                if (chunk.contentBlockStart && chunk.contentBlockStart.contentBlockIndex !== 0) {
                    
                    //console.info("Adding additional contentBlock...");

                    contentBlocks.push({
                        responseType: "toolUse",
                        content: "",
                        toolUseName: chunk.contentBlockStart.start.toolUse.name,
                        toolUseId: chunk.contentBlockStart.start.toolUse.toolUseId
                    });            

                } else if (chunk.contentBlockDelta) {
                    
                    if (chunk.contentBlockDelta.delta?.text) {
                        
                        contentBlocks[chunk.contentBlockDelta.contentBlockIndex].responseType = "text";
                        contentBlocks[chunk.contentBlockDelta.contentBlockIndex].content += chunk.contentBlockDelta.delta.text || '';

                        // Send text (current chunk content) back to WebSocket & Twilio for TTS
                        // Text is streamed back immediately to minimize latency
                        console.info("Sending text to WebSocket ==> ", JSON.stringify({type:"text", token:chunk.contentBlockDelta.delta.text, last:false}));
                        ws_client.send(JSON.stringify({type:"text", token:chunk.contentBlockDelta.delta.text, last:false}));
                        //await ws_client.send(Buffer.from(JSON.stringify({type:"text", token:chunk.contentBlockDelta.delta.text, last:false})));                 


                    } else if (chunk.contentBlockDelta.delta?.toolUse) {

                        // Parse the content to build tool call
                        contentBlocks[chunk.contentBlockDelta.contentBlockIndex].responseType = "toolUse";
                        contentBlocks[chunk.contentBlockDelta.contentBlockIndex].content += chunk.contentBlockDelta.delta.toolUse?.input;

                    }
                
                } else if (chunk.contentBlockStop) {
                    
                    if (contentBlocks[chunk.contentBlockStop.contentBlockIndex].responseType == "text") {

                        // Current text turn has ended
                        console.info("Sending text to WebSocket ==> ");
                        ws_client.send(Buffer.from(JSON.stringify({type:"text", token:"", last:true})));                 
                    }
                    
                } else if (chunk.messageStop) {            

                    returnObj.finish_reason = chunk.messageStop.stopReason;

                } else if (chunk.metadata) {
                    // Metadata
                    //console.log("metadata for this turn => ", chunk.metadata);
                }
            } catch (error) {
                console.error("Error processing chunk: ", error);
                throw new Error('Error processing chunk: ' + error.message);
            }
        }

        // Iterate over contentBlocks to complete returnObj
        contentBlocks.forEach((block) => {

            console.info("in [ invokeBedrock ] and iterating on contentBlocks ==> \n" + JSON.stringify(block, null, 2));  

            if (block.responseType === "text") {

                returnObj.content.push( { "text": block.content } ); 

            } else if (block.responseType == "toolUse") {
                
                let toolCall = {
                    toolUse: {
                        toolUseId: block.toolUseId,
                        name: block.toolUseName,
                        // ConverseStream toolUse input needs to be decoded
                        // and is left as a string and then parsed by the tool
                        input: JSON.parse(decodeURI(block.content))
                    }
                };

                // This is persisted to the conversation
                returnObj.content.push( toolCall ); 

                // This is used to make the tool call
                returnObj.tool_calls[block.toolUseId] = toolCall.toolUse;

            }

        });
        
        //console.info("In Handle Prompt about to return...\n" + JSON.stringify(returnObj, null, 2)); 

        return returnObj;
    } catch (error) {
        console.error("Error in invokeBedrock: ", error);
        if(error.name === 'ThrottlingException') {
            console.error("ThrottlingException: from Bedrock.");
            // In some instances, the Bedrock API may throttle requests.
            // Handle the error accordingly, e.g., retry after a delay
            ws_client.send(Buffer.from(JSON.stringify({type:"text", token:"We are sorry but the Bedrock service is experiencing processing delays.", last:true}))); 
        } else {
            throw new Error('Error in invokeBedrock: ' + error.message);
        }
    }    
}   
