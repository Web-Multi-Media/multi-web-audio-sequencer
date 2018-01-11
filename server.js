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

var room = '';


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
// middleware des websockets

//moteur de template
app.set('view engine', 'ejs');

//middleware
app.use(session({
  secret: 'azaezaedzadzea'
}));
app.use('/assets', express.static(__dirname + '/static'));


   // GET ROOM NUMBER
  
  //  io.on('roomNumber', function(data){
  //   // roomId = data;
  //   if (listSequencerState[roomId] === undefined){
  //     listSequencerState.push(roomId);
  //   }
  //   // 
  //   // listSequencerState[roomId] = 2;
  //   roomId = data;

  //   console.log('Room chosen : ' + roomId); 
  //   console.log('Rooms : ' + listSequencerState[roomId]); 
  //   socket.emit('connectToRoom', listSequencerState[roomId])
  // });

  // io.on('connection', function (socket) {
    
 
  // });


  // ON CONNECTION SEND STATE TO CLIENT
    io.on('connection', function (socket) {
      console.log('A user just connected, Send him current state', sequencerState);
      socket.emit('SendCurrentState', sequencerState);
    });

 



 

io.sockets.on('connection', function (socket) {

// ROOM CONNECTION
  socket.on('connectToRoom', function(room){
    room = room;
    console.log('Room chosen : ' + room); 
    socket.join(room);
});


  // PAD RECEPTION VIA THE CLIENT
  socket.on('pad', function (message) {
    console.log('receive pad change: ' + message);
    socket.broadcast.in(room).emit('sendPad', message);
    var trackId = message[0];
    var padId = message[1];
    var padState = message[2];
    sequencerState['pads'][trackId][padId] = padState;
  });
  
  // NEW TRACK
  socket.on('newTrack', function(message) {
    console.log('receive new track: ' + message);
    var trackName = message[0];
    var soundUrl = message[1];
    var trackId = sequencerState.trackNames.length;
    message.unshift(trackId);
    io.sockets.in(room).emit('sendNewTrack', message);
    sequencerState.trackNames[trackId] = trackName;
    sequencerState.pads[trackId] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    sequencerState.sounds[trackId] = soundUrl;
    sequencerState.waves[trackId] = [false, false];
  });
  
  // LOAD SOUND INTO A TRACK
  socket.on('loadSound', function(message) {
    console.log('receive load sound: ' + message);
    socket.broadcast.in(room).emit('sendLoadSound', message);
    var trackId = message[0];
    var soundUrl = message[1];
    sequencerState.sounds[trackId] = soundUrl;
  });
  
  // DELETE TRACK
  socket.on('deleteTrack', function(message) {
    console.log('receive delete track: ' + message);
    io.sockets.in(room).emit('sendDeleteTrack', message);
    var trackId = message;
    sequencerState.trackNames.splice(trackId, 1);
    sequencerState.sounds.splice(trackId, 1);
    sequencerState.pads.splice(trackId, 1);
    sequencerState.waves.splice(trackId, 1);
  });
  
  // CHANGE WAVE REGION
  socket.on('waveRegion', function(message) {
    var trackId = message[0];
    console.log('receive change wave region: ' + trackId);
    socket.broadcast.in(room).emit('sendWaveRegion', message);
    sequencerState.waves[trackId] = [message[1], message[2]];
  });
});

app.get('/', (req, res) => {
  res.render('index.ejs', {fullservername:fullservername});
})


http.listen(hostnamePort, function () {
  console.log('connecté sur le', hostnamePort);
});
