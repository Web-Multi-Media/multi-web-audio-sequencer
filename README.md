# Multi Web Audio Step Sequencer
A web collaborative step sequencer using [Freesound](https://freesound.org/) content.
Built using Express.js, Web Audio API, Socket.io.

The sequencer is available [here](http://the.ndero.ovh:8080/).

Step sequencer inspired by [Catarak Web Audio Sequencer](https://github.com/catarak/web-audio-sequencer).


INSTALL (Docker)
-------------------
Note: You'll need to have `docker` and `docker-compose` installed.

```
docker-compose up
```

INSTALL
-------------------

Linux:
```
npm install
nodejs server.js
```

Windows:
```
npm install
npm install nodemon
npm start
```

DEPLOY
-------------------
* The server is looking for the environment variables MULT_WEB_SEQ_SERV and MULT_WEB_SEQ_SERV_P. If undefined,  they are set to localhost and 8080.

> export MULT_WEB_SEQ_SERV=myserver.com

> export MULT_WEB_SEQ_SERV_P=9050
