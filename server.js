var express = require('express');
var app = express();
var session = require('express-session')({
    secret: "azaezaedzadzea",
    resave: true,
    saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var eventEmitter = require('events').EventEmitter
var hostname = process.env.MULT_WEB_SEQ_SERV || 'localhost';
var hostnamePort = process.env.MULT_WEB_SEQ_SERV_P || '8080';

var fullservername = hostname + ':' + hostnamePort;
var rooms = ["1", "2", "3", "4"];
var roomUsers = [[], [], [], []];

var sequencerState = {
  trackNames: ['kick', 'snare', 'hihat'],
  pads: [
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  sounds: [
    'http://' + fullservername + '/assets/sounds/drum-samples/TR808/kick.mp3',
    'http://' + fullservername + '/assets/sounds/drum-samples/TR808/snare.mp3',
    'http://' + fullservername + '/assets/sounds/drum-samples/TR808/hihat.mp3'
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
app.use(session);
app.use('/assets', express.static(__dirname + '/static'));
io.use(sharedsession(session, {autoSave:true})); 


// ON CONNECTION CONNECT TO ROOM AND SEND STATE TO CLIENT 
io.sockets.on('connection', function (socket) {
  socket.on('room', function (room) {
    room--;
    console.log("New client connected to room: " + room);
    socket.join(room);
    socket.chatRoom = null;
    
    // if username in session, autolog tu chat
    socket.username = socket.handshake.session.username;
    if (socket.username!=null) {
      socket.chatRoom = room;
      roomUsers[room].push(socket.username);
      socket.emit('autoLogin', {
        numUsers: roomUsers[room].length,
        username: socket.username
      });
      // echo globally (all clients) that a person has connected
      socket.in(room).broadcast.emit('user joined', {
        username: socket.username,
        numUsers: roomUsers[room].length
      });
      console.log(socket.username);
    }

    // send state
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
    socket.on('newTrack', function (message) {
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
    socket.on('loadSound', function (message) {
      console.log('receive load sound: ' + message);
      socket.in(room).broadcast.emit('sendLoadSound', message);
      var trackId = message[0];
      var soundUrl = message[1];
      sequencerStates[room].sounds[trackId] = soundUrl;
    });

    // DELETE TRACK
    socket.on('deleteTrack', function (message) {
      console.log('receive delete track: ' + message);
      io.sockets.in(room).emit('sendDeleteTrack', message);
      var trackId = message;
      sequencerStates[room].trackNames.splice(trackId, 1);
      sequencerStates[room].sounds.splice(trackId, 1);
      sequencerStates[room].pads.splice(trackId, 1);
      sequencerStates[room].waves.splice(trackId, 1);
    });

    // CHANGE WAVE REGION
    socket.on('waveRegion', function (message) {
      var trackId = message[0];
      console.log('receive change wave region: ' + trackId);
      socket.in(room).broadcast.emit('sendWaveRegion', message);
      sequencerStates[room].waves[trackId] = [message[1], message[2]];
    });

    // CHAT
    // when the client emits 'new message', this listens and executes
    socket.on('new message', function (data) {

      // we tell the client to execute 'new message'
      socket.in(room).broadcast.emit('new message', {
        username: socket.username,
        message: data
      });
    });

    // when the client emits 'add user', this listens and executes
    socket.on('add user', function (username) {
      socket.chatRoom = room;
      console.log("New client on the chat: " + room);
      roomUsers[room].push(username);
      // we store the username in the socket session for this client
      socket.username = username;
      socket.emit('login', {
        numUsers: roomUsers[room].length
      });
      // echo globally (all clients) that a person has connected
      socket.in(room).broadcast.emit('user joined', {
        username: socket.username,
        numUsers: roomUsers[room].length
      });
      socket.handshake.session.username = username;
      socket.handshake.session.save();
    });

    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', function () {
      socket.in(room).broadcast.emit('typing', {
        username: socket.username
      });
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', function () {
      socket.in(room).broadcast.emit('stop typing', {
        username: socket.username
      });
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
      if (socket.chatRoom != null) {
        console.log("A client left the chat of room: " + socket.chatRoom);
        // echo globally that this client has left
        socket.in(socket.chatRoom).broadcast.emit('user left', {
          username: socket.username,
          numUsers: roomUsers[socket.chatRoom].length-1
        });
        // delete user from roomUsers lists
        var index = roomUsers[socket.chatRoom].indexOf(socket.username);
        if (index > -1) {
          roomUsers[room].splice(index, 1);
        }
      }
    });
  });
});


// VIEWS
app.get('/', (req, res) => {
  var room = req.query.room;
  // var username = req.query.username;
  if (room) {
    res.render('index.ejs', {
      fullservername: fullservername,
      room: room
    });
  } else {
    res.render('home.ejs', {
      fullservername: fullservername,
      room: room
    });
  }
});


http.listen(hostnamePort, function () {
  console.log('connecté sur le', hostnamePort);
});