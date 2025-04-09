aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 971461683291.dkr.ecr.us-west-2.amazonaws.com
docker build -t twilio-conversation-relay-bedrock-services --platform linux/amd64 .
docker tag twilio-conversation-relay-bedrock-services:latest 971461683291.dkr.ecr.us-west-2.amazonaws.com/twilio-conversation-relay-bedrock-services:latest
docker push 971461683291.dkr.ecr.us-west-2.amazonaws.com/twilio-conversation-relay-bedrock-services:latest