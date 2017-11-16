var express = require('express');
var app = express();
var session = require('cookie-session');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');

// middleware des websockets

//moteur de template
app.set('view engine','ejs');

//middleware
app.use(session({secret: 'azaezaedzadzea'}));

io.on('connection', function(socket) {
    console.log('un utilisateur s\'est connecté');
})

io.sockets.on('pseudo', function(pseudo){
    pseudo = ent.encode(pseudo);
    socket.pseudo = pseudo;
    socket.broadcast.emit('nouveau_client', pseudo);
});

io.sockets.on('connection', function(socket) {
    socket.emit('message', 'vous venez de vous connecter');
});

io.sockets.on('connection', function(socket){
    socket.on('message', function(msg){
        console.log('message :' + msg);
    });
});

io.sockets.on('connection', function(socket){
    socket.on('message', function (message){
        io.emit('chat message', message);
    })    
})


// app.use((req, res, next) => {
//     if (typeof  req.session.messageAffiche == 'undefined'){
//         req.session.messageAffiche = [];
//     }
//     next();
// })

app.get('/', (req, res) => {
    // app.on('connection', function(socket){
    //     io.messageAffiche = messageAffiche;
        //  res.render('index', {messageAffiche: req.body.messageAffiche});
         res.render('index.ejs', { messageAffiche: req.session.messageAffiche });
         
            
        // })
})


// app.post('/chat', (req, res) => {
//     io.on('connection', (socket) => {
//         socket.on('msg', (msg) => {
//             io.emit('msg', msg);
//         })
//     })
//     res.redirect('/');
// })



http.listen(8080, function(){
    console.log('connecté sur le 8080');
});