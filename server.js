var express = require('express');
var app = express();
var session = require('cookie-session');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var eventEmitter = require('events').EventEmitter

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
    });	
    
   
    	
});

//SEND PAD TO ALL THE CLIENTS


app.get('/', (req, res) => {
         res.render('index.ejs', { messageAffiche: req.session.messageAffiche });
            
})





http.listen(8080, function(){
    console.log('connecté sur le 8080');
});