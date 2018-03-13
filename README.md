# Multi Web Audio Step Sequencer
A web collaborative step sequencer using [Freesound](https://freesound.org/) content.
Built using Express.js, Web Audio API, Socket.io.

The sequencer is available [here](https://labs.freesound.org/sequencer/).

Step sequencer inspired by [Catarak Web Audio Sequencer](https://github.com/catarak/web-audio-sequencer).


INSTALL (Docker)
-------------------
Note: You'll need to have [`docker`](https://docs.docker.com/install/) and [`docker-compose`](https://docs.docker.com/compose/install/) installed.

```
docker-compose up
```

INSTALL
-------------------

```
npm install
npm install nodemon
npm start
```


DEPLOY
-------------------
The server is looking for the environment variables `MULT_WEB_SEQ_SERV`, `MULT_WEB_SEQ_SERV_P` and `BASE_PATH`. If undefined, they are set to *localhost*, *8080* and *""*.
Setting `NODE_ENV` to production gives the best performance.

- `MULT_WEB_SEQ_SERV`: The server where Node (or Docker) starts.
- `MULT_WEB_SEQ_SERV_P`: The port to which the Node server is listening.
- `BASE_PATH`: Base path which will be added to all the request links to the app.

Example for starting the app on your sever using npm:
```
export MULT_WEB_SEQ_SERV=myserver.com
export MULT_WEB_SEQ_SERV_P=9050
export NODE_ENV=production
npm start
```

If you want to use Docker for the deployment, you will have to edit the docker-compose.yml file according to your settings. 
