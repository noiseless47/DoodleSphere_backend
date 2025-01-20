const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Store rooms and their data
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle joining a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { 
        users: new Map(),
        drawings: []
      });
    }
    rooms.get(roomId).users.set(socket.id, { 
      id: socket.id,
      username: socket.username
    });
    
    // Send existing drawings to new user
    socket.emit('initial-state', rooms.get(roomId).drawings);
  });

  // Handle drawing events
  socket.on('draw', (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.drawings.push(data);
      socket.to(data.roomId).emit('draw', data);
    }
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    const timestamp = new Date().toLocaleTimeString();
    socket.to(data.roomId).emit('chat-message', {
      message: data.message,
      userId: socket.id,
      username: data.username,
      timestamp
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        if (room.users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
module.exports = (req, res) => {
  res.status(200).json({ message: "Hello from the server!" });
};