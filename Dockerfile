FROM node:latest AS node

ENV NODE_ENV=debug

WORKDIR /usr/src/app

COPY ./app/package*.json ./app/index.js ./app ./

RUN npm install

COPY . .

EXPOSE 3000

RUN chown -R node /usr/src/app

USER node

CMD ["npm", "start"]