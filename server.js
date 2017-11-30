var express = require('express');
var app = express();
var session = require('cookie-session');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var eventEmitter = require('events').EventEmitter
var padsJson = { kick: new Map(),
    snare: new Map(),
    hihat: new Map()
   // room: ''
  };

// middleware des websockets

//moteur de template
app.set('view engine','ejs');

//middleware
app.use(session({secret: 'azaezaedzadzea'}));
app.use('/assets', express.static(__dirname + '/static'));

io.on('connection', function(socket) {
    console.log('A user just connected, Send him current state');
    socket.emit('SendCurrentState',  {kick: JSON.stringify([...padsJson.kick]), 
                                     snare: JSON.stringify([...padsJson.snare]), 
                                     hihat: JSON.stringify([...padsJson.hihat])}
                                    );
})

      
//PAD RECEPTION VIA THE CLIENT
io.sockets.on('connection', function(socket) {
    socket.emit('message', 'vous venez de vous connecter');
    
    socket.on('pad', function (message) {
        console.log('Réception des pads :' + message);
        socket.broadcast.emit('sendPad', message);
            
            var msg = message.split(' ');
            console.log(msg);
            var instru = msg[msg.length - 1];
            //var tempo = msg[msg.length -1];
            var pad = message.split('_')[1].substring(0,2);
            console.log(instru);
           // console.log(tempo);
            console.log(pad);
            //padsJson.tempo = tempo;

        if(instru == 'kick') {
            if (message.indexOf('selected') !== -1) {
               // padsJson.kick.set(pad, message);
               padsJson.kick.set(pad, message);
               console.log(JSON.stringify([...padsJson.kick]));
               
                padsJson.kick.set(pad, message);
            } else if (padsJson.kick.has(pad)) {
                padsJson.kick.delete(pad);
            }
                
            
         } else if(instru == 'snare') {
                if (message.indexOf('selected') !== -1) {
                    padsJson.snare.set(pad, message);
                } else if (padsJson.snare.has(pad)) {
                    padsJson.snare.delete(pad);
                }
        } else if(instru == 'hihat') {
                    if (message.indexOf('selected') !== -1) {
                        padsJson.hihat.set(pad, message);
                    } else if (padsJson.hihat.has(pad)) {
                        padsJson.hihat.delete(pad);
                    }
                }
          console.log(padsJson);
            });
});

//SEND PAD TO ALL THE CLIENTS

app.get('/', (req, res) => {
         res.render('index.ejs', { messageAffiche: req.session.messageAffiche });
            
})


http.listen(8080, function(){
    console.log('connecté sur le 8080');
});
