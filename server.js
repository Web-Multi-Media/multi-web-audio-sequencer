var express = require('express');
var app = express();
var session = require('cookie-session');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var eventEmitter = require('events').EventEmitter
var hostname = '127.0.0.1:8080';
var stateJson = {
  pads: {
    'kick': new Map(),
    'snare': new Map(),
    'hihat': new Map()
  },
  sounds: {
    'kick': 'http://localhost:8080/assets/sounds/drum-samples/TR808/kick.mp3',
    'snare': 'http://localhost:8080/assets/sounds/drum-samples/TR808/snare.mp3',
    'hihat': 'http://localhost:8080/assets/sounds/drum-samples/TR808/hihat.mp3'
  },
  waves: {
    'kick': false,
    'snare': false,
    'hihat': false
  }
};
var roomId;
var listSequencerState = [];
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

     //Send this event to everyone in the room.
     io.sockets.in(listSequencerState[roomId]).emit('connectToRoom', "You are in room no. " + listSequencerState[roomId]);

  console.log('A user just connected, Send him current state', stateJson.pads);
  var state = [];
  for (var key in stateJson.pads) {
    if (stateJson.pads.hasOwnProperty(key)) {
      state.push(JSON.stringify([...stateJson.pads[key]]));
      console.log(key + " -> " + stateJson.pads[key]);
    }
  }
  var trackUrl = stateJson['sounds'];//Object.keys(stateJson['pads']);
  //var urlList = Object.values(stateJson['sounds']);
  var trackWave = stateJson['waves'];
  //var roomNumber = stateJson['room'];
  console.log(state);
  socket.join(listSequencerState.roomId);
  io.sockets.in(listSequencerState[roomId]).emit('SendCurrentState', [state, trackUrl, trackWave]);
})

io.sockets.on('connection', function (socket) {
  socket.in(listSequencerState[roomId]).emit('message', 'vous venez de vous connecter au salon ' + listSequencerState[roomId]);


  // PAD RECEPTION VIA THE CLIENT
  socket.on('pad', function (message) {
    console.log('Réception des pads :' + message);

    socket.broadcast.in(listSequencerState[roomId]).emit('sendPad', message);
    console.log(message);
    var msg = message.split(' ');
    console.log(msg);
    var instru = msg[msg.length - 1];
    //var tempo = msg[msg.length -1];
    var pad = message.split('_')[1].substring(0, 2);
    console.log('instrument selected : ' + instru);
    // console.log(tempo);
    console.log('pad selected :' + pad);
    console.log('json pads : ', stateJson.pads[instru]);
    //padsJson.tempo = tempo;
    console.log(stateJson.pads.instrument);
    var padsFill = {};
    if (stateJson.pads[instru] === undefined) {
      padsFill = new Map().set(pad, message)

      stateJson.pads[instru] = padsFill;
      console.log('valeur du message json si map non crée', stateJson.pads);
    } else if (message.indexOf('selected') !== -1) {
      stateJson.pads[instru].set(pad, message);
      console.log('valeur du message json si map crée', stateJson.pads.instru);

      // console.log(JSON.stringify([...stateJson.pads]));
      //  stateJson.pads[instru].set(pad, message);
    } else if (stateJson.pads[instru].has(pad)) {
      stateJson.pads[instru].delete(pad);
    }

    console.log('valeur du tableau JSON : ', stateJson);

    // console.log('Valeur du JSON : ' , JSON.stringify([...stateJson.pads[instru]]));
  });
  
  // NEW TRACK
  socket.on('newTrack', function(message) {
    var trackName = message[0];
    var soundUrl = message[1];
    console.log('new track: ' + message);
    socket.broadcast.in(listSequencerState[roomId]).emit('sendNewTrack', message);
    stateJson.pads[trackName] = new Map();
    stateJson.sounds[trackName] = soundUrl;
    stateJson.waves[trackName] = [false, false];
  });
  
  // LOAD SOUND INTO A TRACK
  socket.on('loadSound', function(message) {
    var trackName = message[0];
    var soundUrl = message[1];
    console.log('load sound: ' + message);
    socket.broadcast.in(listSequencerState[roomId]).emit('sendLoadSound', message);
    stateJson.sounds[trackName] = soundUrl;
  });
  
  // DELETE TRACK
  socket.on('deleteTrack', function(message) {
    var trackName = message;
    console.log('delete track: ' + trackName);
    socket.broadcast.in(listSequencerState[roomId]).emit('sendDeleteTrack', trackName);
    delete stateJson.pads[trackName];
    delete stateJson.sounds[trackName];
    delete stateJson.waves[trackName];
  });
  
  // CHANGE WAVE REGION
  socket.on('waveRegion', function(message) {
    var trackName = message[0];
    console.log('change wave region: ' + trackName);
    socket.broadcast.in(listSequencerState[roomId]).emit('sendWaveRegion', message);
    stateJson.waves[trackName] = [message[1], message[2]];
  });

  socket.on('roomNumber', function(data){
    roomId = data;
    listSequencerState.push(roomId);
    console.log('Room chosen : ' + roomId); 
    console.log('Rooms : ' + listSequencerState); 
  })
});

app.get('/', (req, res) => {
  console.log(process.env.MULT_WEB_SEQ_SERV);
  if (typeof process.env.MULT_WEB_SEQ_SERV != 'undefined') {      
    hostname=process.env.MULT_WEB_SEQ_SERV;
  }
  console.log('server is:', hostname);
  res.render('index.ejs', {hostname:hostname});
})


http.listen(8080, function () {
  console.log('connecté sur le 8080');
});
