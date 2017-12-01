var express = require('express');
var app = express();
var session = require('cookie-session');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var eventEmitter = require('events').EventEmitter
var stateJson = {pads: {}
                
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
    socket.emit('SendCurrentState',  stateJson);
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
            console.log('instrument selected : ' + instru);
           // console.log(tempo);
            console.log('pad selected :' + pad);
            console.log('json pads : ', stateJson.pads[instru]);
            //padsJson.tempo = tempo;

            if (stateJson.pads[instru] === undefined){
                stateJson.pads[instru] = new Map().set(pad, message);
            } else if (message.indexOf('selected') !== -1) {
                JSON.stringify(...[stateJson.pads[instru].set(pad, message)]);
            } else if (stateJson.pads[instru].has(pad)) {
                 stateJson.pads[instru].delete(pad);
            }
            
        // if(instru == 'kick') {
        //     if (message.indexOf('selected') !== -1) {
        //        // padsJson.kick.set(pad, message);
        //        stateJson.pads.kick.set(pad, message);
        //        console.log(JSON.stringify([...stateJson.kick]));
               
        //     } else if (stateJson.pads.kick.has(pad)) {
        //         stateJson.pads.kick.delete(pad);
        //     }
                
            
        //  } else if(instru == 'snare') {
        //         if (message.indexOf('selected') !== -1) {
        //             stateJson.pads.snare.set(pad, message);
        //         } else if (stateJson.pads.snare.has(pad)) {
        //             stateJson.pads.snare.delete(pad);
        //         }
        // } else if(instru == 'hihat') {
        //             if (message.indexOf('selected') !== -1) {
        //                 stateJson.pads.hihat.set(pad, message);
        //             } else if (stateJson.pads.hihat.has(pad)) {
        //                 stateJson.pads.hihat.delete(pad);
        //             }
        //         }
          console.log('Valeur du JSON : ' , stateJson);
            });
});

//SEND PAD TO ALL THE CLIENTS

app.get('/', (req, res) => {
         res.render('index.ejs');
            
})


http.listen(8080, function(){
    console.log('connecté sur le 8080');
});
