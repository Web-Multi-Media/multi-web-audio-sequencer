FROM node:carbon

RUN mkdir /usr/src/app
WORKDIR /usr/src/app

ADD package.json /usr/src/app/

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

COPY . .
