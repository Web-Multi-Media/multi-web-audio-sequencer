FROM node:carbon

RUN mkdir /src

WORKDIR /src
ADD package.json /src/package.json
ADD ../../admin-ip.json /src/admin-ip.json
RUN npm install

COPY . /src
