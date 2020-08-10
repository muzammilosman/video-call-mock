const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)

let broadcasters = {}

app.use(express.static('public'))

io.on('connection', (socket) => {
   console.log("New client connection")

   socket.on('create or join', (room) => {
    let myRoom = io.sockets.adapter.rooms[room] || { length: 0 };
    let roomClients = myRoom.length
    if(roomClients == 0) {
        console.log("Room created with room id:", room)
        socket.join(room)
        socket.emit('created', room)                // if it is the first person hitting the create or join event
    } else {
        socket.join(room)
        socket.emit('joined', room)
    }
   })

   socket.on('candidate', function (event){
        console.log("socket candidate:", event)
        socket.broadcast.to(event.room).emit('candidate', event);
    });

   socket.on('ready', (room) => {
        console.log("socket ready:", room)
        socket.broadcast.to(room).emit('ready', room)
   })

   socket.on('offer', (event) => {
    console.log("socket.offer:", event)
    socket.broadcast.to(event.room).emit('offer', event.sdp)
   })

   socket.on('answer', (event) => {
    console.log("socket answer")
    socket.broadcast.to(event.room).emit('answer', event.sdp)
   })
})

http.listen(3000, () => {
    console.log("Served in port 3000")
})