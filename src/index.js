const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser,removeUser,getUser,getUsersInRoom } = require('./utils/users');
const app = express();                                              //with this the express creates a server behind the scenes and is not accessible by us,
const server = http.createServer(app);                              //so with this we create our own server and store it in a variable to access it
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

//server (emit) -> client (receive) - countUpdated
//client (emit) -> server (receive) - incrementAll

//let count = 0;
io.on('connection', (socket) => {
    console.log('New web socket server');
    // socket.emit('countUpdated', count);                             //socket.emit is used to emit an event
    // socket.on('incrementAll', () => {                               //this function runs when emit is used on 'incrementAll'
    //     count++;
    //     //socket.emit('countUpdated', count);                       //with this only one connection get updated
    //     io.emit('countUpdated', count);                             //with this all connections get updated
    //     //console.log('in terminal');
    // });
    //socket.emit('message', generateMessage('Welcome!'));                                 //socket.emit to emit that particular connection
    
    //socket.broadcast.emit('message', generateMessage('A new user joined!'));            //this is used to emit all connections except the particular connection(basically io.emit - socket.emit)
    
    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id:socket.id, username, room });               //socket.id is unique to every connection 
        if(error) {
            return callback(error);
        }
        socket.join(user.room);                                                              //this gives us the options call certain events to certain rooms only and not to everyone
        socket.emit('message', generateMessage('Admin', 'Welcome!'));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin',`${user.username} has entered the Chat Room!`));            //this is used to emit all connections except the particular connection in the particular room 
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });
    });

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);
        const filter = new Filter();
        if(filter.isProfane(message)) {
            return callback('Profanity is not allowed!');
        }
        io.to(user.room).emit('message',generateMessage(user.username,message));                                     //io.emit to emit all the connections
        callback();
    });
    
    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,`https://google.com/maps?q=${coords.latitude},${coords.longitude}`));
        callback();
    });
    
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if(user) {
            io.to(user.room).emit('message',generateMessage('Admin',`${user.username} has left!`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });            
});

server.listen(port,() => { 
    console.log('Server is up and running on port 3000');
});