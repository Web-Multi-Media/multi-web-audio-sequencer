var express = require('express');
var app = express();
var session = require('express-session')({
  secret: process.env.SESSION_SECRET || "azaezaedzadzea",
  resave: true,
  saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var eventEmitter = require('events').EventEmitter
var hostname = process.env.MULT_WEB_SEQ_SERV || 'localhost';
var base_path = process.env.BASE_PATH || '';
var hostnamePort = process.env.MULT_WEB_SEQ_SERV_P || '8080';
var adminPassword = process.env.ADMIN_PASSWORD || 'admin';
var freesoundClientToken = process.env.FREESOUND_TOKEN || 'bs5DQrWNL9d8zrQl0ApCvcQqwg0gg8ytGE60qg5o';
var io = require('socket.io')(http, {path: base_path + '/socket.io'});
var fs = require('fs');

var fullservername = hostname + ':' + hostnamePort;
var rooms = ["1", "2", "3", "4", "5", "6", "7", "8"];
var roomUsers = [[], [], [], [], [], [], [], []];
var roomLastConnections = [null, null, null, null, null, null, null, null];

var sequencerState = {
  sequenceLength: 16,
  tempo: 120,
  trackNames: ['kick', 'snare', 'hihat'],
  pads: [
    Array(64).fill(0),
    Array(64).fill(0),
    Array(64).fill(0)
  ],
  sounds: [
    base_path + '/assets/sounds/drum-samples/TR808/kick.ogg',
    base_path + '/assets/sounds/drum-samples/TR808/snare.ogg',
    base_path + '/assets/sounds/drum-samples/TR808/hihat.ogg'
  ],
  waves: [
    [false, false],
    [false, false],
    [false, false]
  ],
  gains: [-6, -6, -6]
};

var sequencerPresetFiles = [];
getListPresetFiles();

var sequencerStates = [JSON.parse(JSON.stringify(sequencerState)),
                       JSON.parse(JSON.stringify(sequencerState)),
                       JSON.parse(JSON.stringify(sequencerState)),
                       JSON.parse(JSON.stringify(sequencerState)),
                       JSON.parse(JSON.stringify(sequencerState)),
                       JSON.parse(JSON.stringify(sequencerState)),
                       JSON.parse(JSON.stringify(sequencerState)),
                       JSON.parse(JSON.stringify(sequencerState)),
                      ];


//moteur de template
app.set('view engine', 'ejs');

//middleware
app.use(session);
app.use(base_path + '/assets', express.static(__dirname + '/static'));
app.use(base_path + '/assets', express.static(__dirname + '/node_modules'));
io.use(sharedsession(session, {
  autoSave: true
}));
app.set('trust proxy', true)


// ON CONNECTION CONNECT TO ROOM AND SEND STATE TO CLIENT 
io.sockets.on('connection', function (socket) {
  socket.on('room', function (room) {
    room--;
    console.log("New client connected to room: " + room);
    socket.join(room);
    socket.chatRoom = null;

    // store connection activity
    roomLastConnections[room] = new Date();

    // if username in session, autolog tu chat
    socket.username = socket.handshake.session.username;
    if (socket.username != null) {
      socket.chatRoom = room;
      if(Number.isInteger(room)){
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
      }
    }

    // send state
    socket.emit('SendCurrentState', sequencerStates[room]);
    
    // send preset names
    for (i = 0; i < sequencerPresetFiles.length; i++) {
      socket.emit('sendSaveSequencerPreset', sequencerPresetFiles[i].split('.')[0]);
    }

    // PAD RECEPTION VIA THE CLIENT
    socket.on('pad', function (message) {
      console.log('receive pad change: ' + message);
      socket.in(room).broadcast.emit('sendPad', message);
      var trackId = message[0];
      var padId = message[1];
      var padState = message[2];
      sequencerStates[room]['pads'][trackId][padId] = padState;
    });

    // TEMPO RECEPTION VIA THE CLIENT
    socket.on('tempo', function (message) {
      console.log('receive tempo change: ' + message);
      socket.in(room).broadcast.emit('tempo', message);
      var tempo = message;
      sequencerStates[room].tempo = tempo;
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
      sequencerStates[room].pads[trackId] = Array(64).fill(0);
      sequencerStates[room].sounds[trackId] = soundUrl;
      sequencerStates[room].waves[trackId] = [false, false];
      sequencerStates[room].gains[trackId] = -6;
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
      sequencerStates[room].gains.splice(trackId, 1);
    });

    // CHANGE WAVE REGION
    socket.on('waveRegion', function (message) {
      var trackId = message[0];
      console.log('receive change wave region: ' + trackId);
      socket.in(room).broadcast.emit('sendWaveRegion', message);
      sequencerStates[room].waves[trackId] = [message[1], message[2]];
    });

    // CHANGE LENGTH SEQUENCE
    socket.on('sequenceLength', function (message) {
      console.log('receive change senquence length: ' + message);
      sequencerStates[room].sequenceLength = message;
      socket.in(room).broadcast.emit('sendSequenceLength', message);
    });

    // CHANGE TRACK GAIN
    socket.on('gain', function (message) {
      console.log('receive change gain: ' + message);
      sequencerStates[room].gains[message[0]] = message[1];
      socket.in(room).broadcast.emit('sendGain', message);
    });
    
    // SAVE PRESET
    socket.on('savePreset', function (message) {
      console.log('receive save preset');
      var presetName = message[1];
      var sequencerPresetState = JSON.parse(message[0]);
      savePreset(presetName, sequencerPresetState)
      io.sockets.in(room).emit('sendSaveSequencerPreset', presetName);
    });
    
    socket.on('loadPreset', function (message) {
      console.log('receive load preset');
      var preset = getPreset(message);
      sequencerStates[room] = preset;
      io.sockets.in(room).emit('sendSequencerPreset', JSON.stringify(preset));
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
      if (socket.chatRoom != null) {
        console.log("Client change name on room: " + room);
        socket.in(room).broadcast.emit('user change name', {
          oldName: socket.username,
          newName: username
        });
        var index = roomUsers[socket.chatRoom].indexOf(socket.username);
        if (index > -1) {
          roomUsers[room].splice(index, 1);
        }
        socket.username = username;
        roomUsers[room].push(username);
      } else {
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
      }
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
          numUsers: roomUsers[socket.chatRoom].length - 1
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


// PRESETS
function getListPresetFiles() {
  fs.readdir('./presets/', function(err, items) {
    console.log("Existing presets: " + items);
    sequencerPresetFiles = items;
  });
}

function getPreset(presetId) {
  var preset = require('./presets/' + sequencerPresetFiles[presetId]);
  return require('./presets/' + sequencerPresetFiles[presetId]);
}

function savePreset(presetName, preset) {
  var jsonPreset = JSON.stringify(preset);
  fs.writeFile('./presets/' + presetName + '.json', jsonPreset, 'utf8');
  sequencerPresetFiles.push(presetName + '.json');
}


// ACTIVITY DATE
function updateActivity(datetime) {
  var theevent = new Date(datetime);
  now = new Date();
  var sec_num = (now - theevent) / 1000;
  var days = Math.floor(sec_num / (3600 * 24));
  var hours = Math.floor((sec_num - (days * (3600 * 24))) / 3600);
  var minutes = Math.floor((sec_num - (days * (3600 * 24)) - (hours * 3600)) / 60);
  var seconds = Math.floor(sec_num - (days * (3600 * 24)) - (hours * 3600) - (minutes * 60));

  if (hours < 10) {
    hours = "0" + hours;
  }
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  if (seconds < 10) {
    seconds = "0" + seconds;
  }

  if (days > 1000) {
    return '-'
  } else if (days > 30) {
    return 'more than 30 days ago'
  } else {
    return days + ' days ' + hours + ' hours ' + minutes + ' min ' + seconds + ' s ';
  }
}

// VIEWS
app.get(base_path + '/', (req, res) => {
  var room = req.query.room;
  var adminClient = req.query.admin == adminPassword;
  if (room) {
    res.render('index.ejs', {
      room: room,
      adminClient: adminClient,
      base_path: base_path
    });
  } else {
    var dateNow = new Date();
    var roomConnectionsAgo = roomLastConnections.map(function (e) {
      var time = updateActivity(e)
      if (time < 0) {
        time = 0;
      }
      return updateActivity(e)
    });
    res.render('home.ejs', {
      fullservername: fullservername,
      roomUsers: roomUsers,
      roomConnectionsAgo: roomConnectionsAgo,
      base_path: base_path
    });
  }
});


// AJAX
app.get(base_path + '/get_freesound_token', function(req, res){
  res.send(freesoundClientToken);
});


http.listen(hostnamePort, function () {
  console.log('connecté sur le', fullservername);
});
