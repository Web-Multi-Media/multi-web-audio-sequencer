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
var rooms = ["1", "2", "3", "4"];

var sequencerState = {
  trackNames: ['kick', 'snare', 'hihat'],
  pads: [
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  sounds: [
    'http://'+fullservername+'/assets/sounds/drum-samples/TR808/kick.mp3',
    'http://'+fullservername+'/assets/sounds/drum-samples/TR808/snare.mp3',
    'http://'+fullservername+'/assets/sounds/drum-samples/TR808/hihat.mp3'
  ],
  waves: [
    [false, false],
    [false, false],
    [false, false]
  ]
};

var sequencerStates = [JSON.parse(JSON.stringify(sequencerState)),
                      JSON.parse(JSON.stringify(sequencerState)),
                      JSON.parse(JSON.stringify(sequencerState)),
                      JSON.parse(JSON.stringify(sequencerState))];


//moteur de template
app.set('view engine', 'ejs');

//middleware
app.use(session({
  secret: 'azaezaedzadzea'
}));
app.use('/assets', express.static(__dirname + '/static'));


// ON CONNECTION CONNECT TO ROOM AND SEND STATE TO CLIENT 
io.sockets.on('connection', function (socket) {
  socket.on('room', function(room) {
    room--;
    socket.join(room);
    io.sockets.in(room).emit('SendCurrentState', sequencerStates[room]);

    // PAD RECEPTION VIA THE CLIENT
    socket.on('pad', function (message) {
      console.log('receive pad change: ' + message);
      socket.in(room).broadcast.emit('sendPad', message);
      var trackId = message[0];
      var padId = message[1];
      var padState = message[2];
      sequencerStates[room]['pads'][trackId][padId] = padState;
    });

    // NEW TRACK
    socket.on('newTrack', function(message) {
      console.log('receive new track: ' + message);
      var trackName = message[0];
      var soundUrl = message[1];
      var trackId = sequencerStates[room].trackNames.length;
      message.unshift(trackId);
      io.sockets.in(room).emit('sendNewTrack', message);
      sequencerStates[room].trackNames[trackId] = trackName;
      sequencerStates[room].pads[trackId] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      sequencerStates[room].sounds[trackId] = soundUrl;
      sequencerStates[room].waves[trackId] = [false, false];
    });

    // LOAD SOUND INTO A TRACK
    socket.on('loadSound', function(message) {
      console.log('receive load sound: ' + message);
      socket.in(room).broadcast.emit('sendLoadSound', message);
      var trackId = message[0];
      var soundUrl = message[1];
      sequencerStates[room].sounds[trackId] = soundUrl;
    });

    // DELETE TRACK
    socket.on('deleteTrack', function(message) {
      console.log('receive delete track: ' + message);
      io.sockets.in(room).emit('sendDeleteTrack', message);
      var trackId = message;
      sequencerStates[room].trackNames.splice(trackId, 1);
      sequencerStates[room].sounds.splice(trackId, 1);
      sequencerStates[room].pads.splice(trackId, 1);
      sequencerStates[room].waves.splice(trackId, 1);
    });

    // CHANGE WAVE REGION
    socket.on('waveRegion', function(message) {
      var trackId = message[0];
      console.log('receive change wave region: ' + trackId);
      socket.in(room).broadcast.emit('sendWaveRegion', message);
      sequencerStates[room].waves[trackId] = [message[1], message[2]];
    });
  });
});


// VIEWS
app.get('/', (req, res) => {
  var room = req.query.room;
  if (room) {
    res.render('index.ejs', {fullservername: fullservername,
                             room: room});
  } else {
    res.render('home.ejs', {fullservername: fullservername});
  }
});

http.listen(hostnamePort, function () {
  console.log('connecté sur le', hostnamePort);
});
