import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
const dynClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(dynClient);

export const setupCallPostHandler = async (twilioBody) => {

    
    console.info("twilioBody.From ==>\n" + twilioBody.From);    
    /**
     * First, use the FROM phone (caller) to get the user profile. This
     * allows you to personalize the experience.
     */    
    let userContext = {}; // Default user with pk as the from phone number
    try {
        let user = await ddbDocClient.send( new GetCommand( { TableName: process.env.TABLE_NAME, Key: { pk: twilioBody.From, sk: "profile" } } ));
        if (user.Item) {
            userContext = user.Item;
        }        
    } catch (err) {
        console.error("Error getting user profile from DynamoDB: ", err);
    }
    console.info("userContext ==>\n" + JSON.stringify(userContext, null, 2));    

    console.info("userContext.useCase ==>\n" + userContext.useCase);    
    /**
     * Use the use case title from the user context if present or default to 
     * use case set in the environment variable.
     * The use case contains the prompt and other configuration details and
     * can be changed dynamically for each call and during a session.
     */
    const useCaseTitle = (userContext.useCase) ? userContext.useCase : process.env.STACK_USE_CASE;    
    
    let useCase = null;
    try {
        let useCaseRecord = await ddbDocClient.send( new GetCommand( { TableName: process.env.TABLE_NAME, Key: { pk: useCaseTitle, sk: "configuration" } } ));
        if (useCaseRecord.Item) {
            useCase = useCaseRecord.Item;
        }   
    } catch (err) {
        console.error("Error getting use case configuration from DynamoDB: ", err);
    }
    console.info("useCase ==>\n" + JSON.stringify(useCase, null, 2));    
    
    // Set the prompt to what was returned from DynamoDB.
    let prompt = useCase.prompt;

    /**
     * This step shows how you dynamically change the prompt based on the user context.
     * Here we are insterting the user's name into the prompt if it exists otherwise,
     * we tell the LLM to ask for the user's name.
    */
    if (Object.keys(userContext).length  > 0 && userContext.firstName && userContext.lastName) {
        prompt = prompt.replace('<<USER_CONTEXT>>', `The name of the person you are talking to is ${userContext.firstName} ${userContext.lastName}. You do not need to ask for their name.`);
    } else {
        prompt = prompt.replace('<<USER_CONTEXT>>', `First ask for the user's first and last name to use during the call.`);
    }    

    // Add the current date and time to the prompt
    let timeZone = process.env.timeZone; 
    
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
    
 
    /**
     * ConversationRelay can handle DTMF events. DTMF handlers can be configured
     * here and then saved into DynamoDB for the session. ConversationRelay will
     * pass DTMF events to your application via the WebSocket connection.
     * For this implementation, the dtmf handlers are stored in the use case
     * configuration in DynamoDB. The dtmf handlers can be changed dynamically
     * for each session.
     * https://www.twilio.com/docs/voice/twiml/connect/conversationrelay#dtmf-message
     */
    const dtmfHandlers = useCase.dtmfHandlers;

    /**
     * For this implementation, the tools are stored in the use case. You can
     * dynamically change the tools available to the LLM during a session.
     */
    const tools = useCase.tools;

    /**
     * Using AWS Bedrock enables your application to dynamically
     * switch models. Select the best model for each session and even change dynamically.
     * Note that any set model needs be available and configured in your account and region.
     * https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html
     * https://docs.aws.amazon.com/bedrock/latest/userguide/amazon-bedrock-marketplace.html
     * https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-use.html
     */
    const llmModel = (useCase.llmModel) ? useCase.llmModel : process.env.MODEL_IDENTIFIER;

    try {

        /**
         * To track each session, we use the CallSid from Twilio. This is a unique
         * identifier for each call and is used as the primary key in DynamoDB.
         * You implementation could be different, but using the CallSid from Twilio 
         * makes sense as it is a unique key and can easily be tied back to Twilio logs.
         * 
         * In the code below, we are saving the details for this session into 
         * DynamoDB so that it will be availble throughout the conversation.
         */
           
        await ddbDocClient.send(
            new PutCommand({
                TableName: process.env.TABLE_NAME,
                Item: {
                    pk: twilioBody.CallSid, // Unique identifier for this call from Twilio
                    sk: "connection",
                    llmModel: llmModel, // LLM model to use for this session
                    useCase: useCaseTitle,
                    userContext: userContext,
                    systemPrompt: [
                        {
                            text: prompt
                        }
                    ],
                    tools: tools, // tools passed into session -- can be changed dynamically.
                    dtmfHandlers: dtmfHandlers, // dtmf handlers passed into session -- can be changed dynamically.
                    expireAt: Math.floor(Date.now() / 1000) + 86400, // Expire "demo" session data automatically (can be removed)
                    ...twilioBody, // include data from Twilio            
                }
            })
        );

        /**
         * ConversationRelay is extremely configurable. Attributes can be passed in
         * to meet your application requirements as well as your user's requirements.
         * Attributes are set here dynamically for each session.
         * Amoung attributes that can be passed in are: welcomeGreeting, speechModel, voice, 
         * ttsProvider, language, interruptible... Full list of attributes can be found here:
         * https://www.twilio.com/docs/voice/twiml/connect/conversationrelay#conversationrelay-attributes
         * For this implementation, the attributes are stored in the use case in DynamoDB. 
         * The object below is instantiated and then converted to a string that is passed
         * into the TwiML tag below.
         */ 
        let conversationRelayParams = {
            ...useCase.conversationRelayParams
        };

        let conversationRelayParamsString = "";
        for (const [key, value] of Object.entries(conversationRelayParams)) {
            conversationRelayParamsString += `${key}="${value}" `;
            //console.log(`${key}: ${value}`);
        }

        /**
         * If needed, you can add custom parameters to the ConversationRelay TwiML
         * verb. These parameters are passed to the WebSocket connection and can be
         * used to pass data to the your applictions. These parmeters will show up
         * ONLY in the "setup" message sent by the ConversationRelay server to your application.
         * After declaring the object, we loop through the customParams object and build 
         * a string of <Parameter></Parameter> tags that get added to the TwiML.
         * https://www.twilio.com/docs/voice/twiml/connect/conversationrelay#parameter-element
         * For this implementation, we are passing the callSid to the WebSocket connection
         * so that we can tie the WebSocket connection to the call session in DynamoDB so
         * using thes Parameters is not required.
         */
        let customParams = {
            callSid:twilioBody.CallSid
            // Additional params can be added here if needed
        }; 
        let customParamsString = "";
        for (const [key, value] of Object.entries(customParams)) {
            customParamsString += `            <Parameter name="${key}" value="${value}" />
`;
            console.log(`${key}: ${value}`);
        }        
                        
        /**
         * Generate the WebSocket URL for the ConversationRelay. Twilio
         * will connect a new WebSocket connection to this URL. The CallSid
         * from Twilio is passed in the url and subsequently used to
         * access and manage the session in DynamoDB.
         */
        let ws_url = `${process.env.WS_URL}?callSid=${twilioBody.CallSid}`;

        /**
         * Generate the TwiML for the ConversationRelay. This is the Twilio's XML Language.
         * https://www.twilio.com/docs/voice/twiml
         * https://www.twilio.com/docs/voice/twiml/connect/conversationrelay
         */
        let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>    
    <Connect>
        <ConversationRelay url="${ws_url}" ${conversationRelayParamsString} >
            ${customParamsString}
        </ConversationRelay>
    </Connect>
</Response>`;
        
        //console.log("twiml ==> ", twiml);
        
        return twiml;

    } catch (err) {
        
        console.log("Error writing session details for call => ", err);                
        return;
        
    }        
};