FROM node:carbon

RUN mkdir /usr/src/app
COPY package.json /usr/src/app/
WORKDIR /usr/src/app

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

COPY . .
