ECR_REPO=971461683291.dkr.ecr.us-east-1.amazonaws.com
ECR_REPO_NAME=twilio-conversation-relay-bedrock-services

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REPO
docker build -t bedrock-cr --platform linux/amd64 .
docker tag bedrock-cr:latest $ECR_REPO/$ECR_REPO_NAME:latest
docker push $ECR_REPO/$ECR_REPO_NAME:latest