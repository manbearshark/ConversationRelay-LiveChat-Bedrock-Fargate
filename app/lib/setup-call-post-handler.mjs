import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
const dynClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(dynClient);


export const setupCallPostHandler = async (twilio_body, callSetupSessionId) => {
    // 2) Use From number to look up user record (if exists)    
    let user = null;
    try {
        user = await ddbDocClient.send( new GetCommand( { TableName: process.env.TABLE_NAME, Key: { pk: twilio_body.From, sk: "profile" } } ));
    } catch (err) {
        console.error("Error getting user profile from DynamoDB: ", err);
    }

    let userContext = "";
    if (user.Item) {
        userContext = user.Item;
    }

    console.info("user.Item ==>\n" + JSON.stringify(user.Item, null, 2));    

    // 3) Determine use case and params to use   
    // This is a single stack solution so the use case is determined
    // in the template.yaml file.  The item for this use case is
    // in configuration/dynamo-item.json and needs to exists in DynamoDB
    const useCaseTitle = process.env.STACK_USE_CASE;    
    let useCase = null;
    try {
        useCase = await ddbDocClient.send( new GetCommand( { TableName: process.env.TABLE_NAME, Key: { pk: useCaseTitle, sk: "configuration" } } ));
    } catch (err) {
        console.error("Error getting use case configuration from DynamoDB: ", err);
    }

    let prompt = useCase.Item.prompt;

    if (user.Item) {
        let rString = `The name of the person you are talking to is ${user.Item.firstName} ${user.Item.lastName}. You can use this person's first name. If needed, their phone number is ${twilio_body.From}.`;
        if (user.Item.email) {
            rString = rString + ` Their email address is ${user.Item.email} -- you may offer to send emails.`;
        } else {
            rString = rString + ` You do not have their email address so cannot offer to send emails.`
        }
        prompt = prompt.replace('<<USER_CONTEXT>>', rString);
    } else {
        prompt = prompt.replace('<<USER_CONTEXT>>', `First ask for the user's first and last name to use during the call.`);
    }    

    // Add the current date and time to the prompt
    
    let timeZone = "America/Los_Angeles";  // Edit to your specifications or could be dynamic based on user
    
    const currentDate = new Date();
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        timeZone: timeZone
    });
    
    prompt = prompt.replace('<<CURRENT_DATE>>', dateFormatter.format(currentDate));

    console.info("useCase.Item ==>\n" + JSON.stringify(useCase?.Item, null, 2));    

    // Params for the Conversation Relay Twilio TwiML tag are saved in 
    // an object for the use case record. Each property of the object
    // will be injected into the TwiML tag below. Allows for Params
    // to be pulled in dynamically
    let conversationRelayParams = useCase.Item.conversationRelayParams
 
    // DTMF Handlers are passed into the session from the use case configuration
    // but can be changed dynamically during the session!
    let dtmfHandlers = useCase.Item.dtmfHandlers;

    // This is the function "manifest", or all tools available to call
    // This can be changed dynamically during the session!
    let tools = useCase.Item.tools;

    try {

        // 4) Add DB Records to establish a "session"
        // The pk is event.requestContext.callSetupSessionId which is also passed to
        // the WebSocket connection to tie this initial request to the 
        // WebSocket connection.

        // This item contains core data for the session
        let connectionItem = {
            pk: callSetupSessionId,
            sk: "connection",
            useCase: useCaseTitle,
            userContext: userContext,
            systemPrompt: [
                {
                    text: prompt
                }
            ],
            tools: tools, // tools passed into session -- can be changed dynamically.
            dtmfHandlers: dtmfHandlers, // dtmf handlers passed into session -- can be changed dynamically.
            expireAt: Math.floor(Date.now() / 1000) + 120, // Delete Record after 2 minutes
            ...twilio_body,            
        };
   

        await ddbDocClient.send(
            new PutCommand({
                TableName: process.env.TABLE_NAME,
                Item: connectionItem
            })
        );

        // Persits items to the database
        
        /*let putRequests = [
            { PutRequest: { Item: connectionItem } },
            { PutRequest: { Item: promptItem } }
        ];*/      
        //await ddbDocClient.send(new BatchWriteCommand({ RequestItems: { [process.env.TABLE_NAME]:putRequests } }));
        
        // 5) Create ws url adding cid param using event.requestContext.callSetupSessionId
        // This callSetupSessionId param allows the call set up to be connected to
        // the WebSocket session (connectionId)
        
        let ws_url = `${process.env.WS_URL}?callSetupSessionId=${callSetupSessionId}`;
        
        // 6) Generate Twiml to spin up ConversationRelay connection

        // Pull out params ==> Could be dynamic for language, tts, stt...
        let conversationRelayParamsString = "";
        for (const [key, value] of Object.entries(conversationRelayParams)) {
            conversationRelayParamsString += `${key}="${value}" `;
            //console.log(`${key}: ${value}`);
        }

        let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>    
    <Connect>
        <ConversationRelay url="${ws_url}" ${conversationRelayParamsString} />
    </Connect>
</Response>`;
        
        console.log("twiml ==> ", twiml);
        return twiml;
    } catch (err) {
        console.log("Error writing session details for call => ", err);                
        return;
    }        
};