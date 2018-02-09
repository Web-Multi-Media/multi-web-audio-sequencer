FROM node:carbon

RUN mkdir /src

WORKDIR /src
ADD app/package.json /src/package.json
RUN npm install

