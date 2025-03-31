import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
const dynClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(dynClient);

export const onConnectWebsocketHandler = async (cid, connectionId) => {
    /**
     * 1) Pull setup record from dynamodb using event.queryStringParameters.cid
     * 2) Create new record using event.requestContext.connectionId
     */

    try {

        // 1) GET the record from dynamodb using event.queryStringParameters.cid
        // cid is the requestID from the initial setup     
        const callConnection = await ddbDocClient.send( new GetCommand( { TableName: process.env.TABLE_NAME, Key: { pk: cid, sk: "connection" } } ));

        // 2) Make a copy of the item but replacing the pk
        // with the WebSocket ConnectionId
        await ddbDocClient.send(
            new PutCommand({
                TableName: process.env.TABLE_NAME,
                Item: {
                    ...callConnection.Item,
                    pk: connectionId,
                    pk1: "connection",
                    sk1: callConnection.Item.From,
                    expireAt:  parseInt((Date.now() / 1000) + 86400)  // Expire "demo" session data automatically (can be removed)
                }
            })
        );

    } catch (error) {
        console.log("Error failed to connect => ", error);
        throw error;
    }    
};