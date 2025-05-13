# Framework for Voice AI Applications using Twilio ConversationRelay and Amazon Bedrock and Fargate

Building Voice AI Agents requires implementing several technologies. In this repo, we present an architecture for building Voice AI Agents that could be the foundation for production applications. The architecture leverages key components of the Twilio and AWS platforms.

The diagram below give the high-level overview. Voice calls can enter the Twilio platform via traditional PSTN (telephone numbers), SIP, or WebRTC, and via Twilio Programmable Voice can be connected to your application powered by AWS ECS and Fargate. Speech-to-text and text-to-speech are handled by Twilio ConversationRelay while LLM calling is done through AWS Bedrock. Using these managed services leaves challenging components to Twilio and AWS thus allowing you to focus on key differentiating components like User Experience, Business Logic, Prompt Engineering, and Tool Calling.

![](./diagrams/cr-bedrock-important-architecture.png)

This project can be used in three modes:

1. As a standalone development instance using a local Docker image.  
2. As a cloud-deployed server for production.
3. Run locally as a node application.

## Local Deployment

For this application, state is managed in DynamoDB. The local Docker instance will still need to call out to DynamoDB and Bedrock in the cloud.

When developing locally, you will need to supply a WSS and HTTPS endpoint for Twilio to reach your local machine.

We recommend ngrok.  

Start your ngrok endpoint and point it at your local machine on port 3000 (this is the default set for your local Docker image).

Copy the https and wss endpoints ngrok gives you.

Deploy Bedrock CloudWatch logs and cloud DynamoDB table for the application using these two commands below:

```
sam build --template-file local-dev-cloud-infra-template.yml
sam deploy --stack-name CR-local --template-file local-dev-cloud-infra-template.yml --guided
```

Modify the docker-compose.yml file on the following lines:

```
- INFERENCE_PROFILE_ARN=us.amazon.nova-lite-v1:0\
- TABLE_NAME=CR-local-ConversationRelayAppDatabase
- AWS_REGION=us-east-1
- STACK_USE_CASE=restaurantOrderingUseCase
- WS_URL=wss://<YOUR NGROK ENDPOINT>/
```

Then build your local Docker image, using `docker-compose build`.

And launch your local image `docker-compose up`.

Make sure that your Twilio phone number webhook endpoint is set to the HTTP address from ngrok.  

## Cloud Deployment

### Deploy your Docker image to your ECR repository

If you do not have an ECR repo, create one in the AWS region where you will deploy the app resources.  We use `us-east-1` as a default here and that is the best choice for latency.

If you are using our build script `build-images.sh` you will need to modify the environment variables at the start of the script to reflect your environment:

```
ECR_REPO=<--URL-to-your-ECR repo (like "123456789.dkr.ecr.us-east-1.amazonaws.com") -->
ECR_REPO_NAME=twilio-conversation-relay-bedrock-services
ECR_TAG=latest
```

### Deploy cloud resources to AWS

Deploy the AWS resources to your AWS account using the two commands below:

`sam build --template-file cloud-deploy-infra-template.yml`

`sam deploy --guided --stack-name CR-AWS-BEDROCK --template cloud-deploy-infra-template.yml --capabilities CAPABILITY_NAMED_IAM`

The first time you deploy, add `--guided` (`sam deploy --guided --stack-name...`) to the above command to generate a configuration file. All subsequent commands do not need the --guided.

You will need to provide the repo name you set in the above steps, and you will need to have a certificate, and custom domain set up for the load balancer deployment for your API endpoints.

### Configure your Twilio voice webhook endpoint

Take Output from the stack called "TwimlAPI" and assign it to the Webhook for Voice handler for their desired phone number. The voice handler will direct any inbound call to first call your application to return the TwiML needed to spin up a ConversationRelay session. The TwiML returned can be dynamically generated for each session allowing you to customize every user experience. The TwiML starts the ConversationRelay session which connects the call to your application via websocket connection enabling speech-to-text to connect to your application and LLM and stream back text to be converted to speech for the caller.

### Load the application prompts and user profiles into DynamoDB

To allow you to quickly experiment with use cases, all configuration details are stored as items in the DynamoDB table. The commands below allow you to upload some default/sample "use cases" but you can easily modify these to your own needs. Note that the prompt, LLM Model, and configuration details for ConversationRelay (SST & TTS provider, language, voice) are all available to be set per use case and then modified dynamically per session.

`aws dynamodb put-item --table-name CR-AWS-BEDROCK-ConversationRelayAppDatabase --item "$(node ./configuration/dynamo-loaders/restaurantOrderingUseCase.mjs | cat)"`

First, edit this file [ ./configuration/dynamo-loaders/user-profile-example.json ] with your information. The primary key is the phone number in E164 format! 

`aws dynamodb put-item --table-name CR-AWS-BEDROCK-ConversationRelayAppDatabase --item "$(node ./configuration/user-profile.js | cat)"`