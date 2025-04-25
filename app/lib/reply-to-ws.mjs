/**
 * reply-with-text.mjs
 * 
 * This module allows the program to reply with text to the ConversationRelay
 * Service to be converted to speech for the user. The Websocket client
 * is instantiated in the parent lambda and passed in here.
 */

export async function replyToWS(socket, ws_connectionId, replyObj) {
    try {
        console.log("Sending reply to WebSocket.");
        await socket.send(Buffer.from(JSON.stringify(replyObj)));        
        console.log("Reply sent to WebSocket: ", replyObj);
        return true;
    } catch (error) {
        console.error("Error sending message to WebSocket: ", error);
        return false;
    }
}   