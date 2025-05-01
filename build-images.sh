aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 971461683291.dkr.ecr.us-east-1.amazonaws.com
docker build -t twilio-conversation-relay-bedrock-services --platform linux/amd64 .
docker tag twilio-conversation-relay-bedrock-services:latest 971461683291.dkr.ecr.us-east-1.amazonaws.com/twilio-conversation-relay-bedrock-services:latest
docker push 971461683291.dkr.ecr.us-east-1.amazonaws.com/twilio-conversation-relay-bedrock-services:latest