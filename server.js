var express = require('express');
var app = express();
var session = require('cookie-session');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var eventEmitter = require('events').EventEmitter
var hostname = process.env.MULT_WEB_SEQ_SERV || 'localhost';
var hostnamePort = process.env.MULT_WEB_SEQ_SERV_P || '8080';

var fullservername=hostname+':'+hostnamePort;
console.log('server is:', fullservername);

var sequencerState = {
  trackNames: ['kick', 'snare', 'hihat'],
  pads: {
    '0': [],
    '1': [],
    '2': []
  },
  sounds: {
    '0': 'http://'+fullservername+'/assets/sounds/drum-samples/TR808/kick.mp3',
    '1': 'http://'+fullservername+'/assets/sounds/drum-samples/TR808/snare.mp3',
    '2': 'http://'+fullservername+'/assets/sounds/drum-samples/TR808/hihat.mp3'
  },
  waves: {
    '0': [false, false],
    '1': [false, false],
    '2': [false, false]
  }
};
// middleware des websockets

//moteur de template
app.set('view engine', 'ejs');

//middleware
app.use(session({
  secret: 'azaezaedzadzea'
}));
app.use('/assets', express.static(__dirname + '/static'));


// ON CONNECTION SEND STATE TO CLIENT
io.on('connection', function (socket) {
  console.log('A user just connected, Send him current state', sequencerState);
  socket.emit('SendCurrentState', sequencerState);
})

io.sockets.on('connection', function (socket) {
  socket.emit('message', 'vous venez de vous connecter');

  // PAD RECEPTION VIA THE CLIENT
  socket.on('pad', function (message) {
    console.log('Réception des pads :' + message);

    socket.broadcast.emit('sendPad', message);
    console.log(message);
    var msg = message.split(' ');
    console.log(msg);
    var instru = msg[msg.length - 1];
    //var tempo = msg[msg.length -1];
    var pad = message.split('_')[1].substring(0, 2);
    console.log('instrument selected : ' + instru);
    // console.log(tempo);
    console.log('pad selected :' + pad);
    console.log('json pads : ', sequencerState.pads[instru]);
    //padsJson.tempo = tempo;
    console.log(sequencerState.pads.instrument);
    var padsFill = {};
    if (sequencerState.pads[instru] === undefined) {
      padsFill = new Map().set(pad, message)

      sequencerState.pads[instru] = padsFill;
      console.log('valeur du message json si map non crée', sequencerState.pads);
    } else if (message.indexOf('selected') !== -1) {
      sequencerState.pads[instru].set(pad, message);
      console.log('valeur du message json si map crée', sequencerState.pads.instru);

      // console.log(JSON.stringify([...sequencerState.pads]));
      //  sequencerState.pads[instru].set(pad, message);
    } else if (sequencerState.pads[instru].has(pad)) {
      sequencerState.pads[instru].delete(pad);
    }

    console.log('valeur du tableau JSON : ', sequencerState);

    // console.log('Valeur du JSON : ' , JSON.stringify([...sequencerState.pads[instru]]));
  });
  
  // NEW TRACK
  socket.on('newTrack', function(message) {
    var trackName = message[0];
    var soundUrl = message[1];
    console.log('new track: ' + message);
    socket.broadcast.emit('sendNewTrack', message);
    sequencerState.pads[trackName] = new Map();
    sequencerState.sounds[trackName] = soundUrl;
    sequencerState.waves[trackName] = [false, false];
  });
  
  // LOAD SOUND INTO A TRACK
  socket.on('loadSound', function(message) {
    var trackName = message[0];
    var soundUrl = message[1];
    console.log('load sound: ' + message);
    socket.broadcast.emit('sendLoadSound', message);
    sequencerState.sounds[trackName] = soundUrl;
  });
  
  // DELETE TRACK
  socket.on('deleteTrack', function(message) {
    var trackName = message;
    console.log('delete track: ' + trackName);
    socket.broadcast.emit('sendDeleteTrack', trackName);
    delete sequencerState.pads[trackName];
    delete sequencerState.sounds[trackName];
    delete sequencerState.waves[trackName];
  });
  
  // CHANGE WAVE REGION
  socket.on('waveRegion', function(message) {
    var trackName = message[0];
    console.log('change wave region: ' + trackName);
    socket.broadcast.emit('sendWaveRegion', message);
    sequencerState.waves[trackName] = [message[1], message[2]];
  });
});

app.get('/', (req, res) => {
  res.render('index.ejs', {fullservername:fullservername});
})


http.listen(hostnamePort, function () {
  console.log('connecté sur le', hostnamePort);
});
