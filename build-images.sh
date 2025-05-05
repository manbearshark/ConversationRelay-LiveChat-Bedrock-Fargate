ECR_REPO=971461683291.dkr.ecr.us-east-1.amazonaws.com
ECR_REPO_NAME=twilio-conversation-relay-bedrock-services
ECR_TAG=latest
DEPLOYMENT_NAME=$ECR_REPO/$ECR_REPO_NAME:$ECR_TAG
echo "Building Docker image for $DEPLOYMENT_NAME"
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REPO
docker build -t bedrock-cr --platform linux/amd64 .
docker tag bedrock-cr:latest $DEPLOYMENT_NAME
docker push $ECR_REPO/$ECR_REPO_NAME:latest