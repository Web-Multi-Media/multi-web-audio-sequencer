FROM node:carbon

ADD . /src
WORKDIR /src
RUN npm install
