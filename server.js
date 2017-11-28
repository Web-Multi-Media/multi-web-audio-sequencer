var express = require('express');
var app = express();
var session = require('cookie-session');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var eventEmitter = require('events').EventEmitter
var padsJson = { kick: [],
    snare: [],
    hihat: [],
    tempo: ''
   // room: ''
  };


// middleware des websockets

//moteur de template
app.set('view engine','ejs');

//middleware
app.use(session({secret: 'azaezaedzadzea'}));
app.use('/assets', express.static(__dirname + '/static'));

io.on('connection', function(socket) {
    console.log('un utilisateur s\'est connecté');
})


	  
//PAD RECEPTION VIA THE CLIENT
io.sockets.on('connection', function(socket) {
    socket.emit('message', 'vous venez de vous connecter');
    
    socket.on('pad', function (message) {
        console.log('Réception des pads ' + message);
        socket.broadcast.emit('sendPad', message);
        
            var msg = message.split(' ');
            console.log(msg);
            var instru = msg[msg.length - 2];
            var tempo = msg[msg.length -1];
            var pad = message.split('_')[1].substring(0,2);
            console.log(instru);
            console.log(tempo);
            console.log(pad);
            padsJson.tempo = tempo;

        if(instru == 'kick') {
            if (message.indexOf('selected') !== -1) {
                padsJson.kick.push( {id_pad: pad });
            } else {
                for(let kickLoop of padsJson.kick){
                    var index = padsJson.kick.indexOf(kickLoop);
                    padsJson.kick.splice(index, 1);
                }
            }
            
         } else if(instru == 'snare') {
                if (message.indexOf('selected') !== -1) {
                    padsJson.snare.push( {id_pad: pad });
                } else {
                    for(let snareLoop of padsJson.snare){
                        var index = padsJson.snare.indexOf(snareLoop);
                        padsJson.snare.splice(index, 1);
                    }
                }
        } else if(instru == 'hihat') {
                    if (message.indexOf('selected') !== -1) {
                        padsJson.hihat.push( {id_pad: pad });
                    } else {
                        for(let hihatLoop of padsJson.hihat){
                            var index = padsJson.hihat.indexOf(hihatLoop);
                            padsJson.hihat.splice(index, 1);
                        }
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