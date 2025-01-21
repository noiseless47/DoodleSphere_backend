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
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { 
        users: new Map(),
        drawings: [],
        history: []
      });
    }
    
    const room = rooms.get(roomId);
    room.users.set(socket.id, { 
      id: socket.id,
      username: socket.username
    });
    
    // Send existing drawings to new user
      socket.emit('initial-state', room.drawings);
  });

  // Handle drawing events
  socket.on('draw', (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      // Store the drawing data
      room.drawings.push(data);
      room.history.push({ type: 'draw', data });
      socket.broadcast.to(data.roomId).emit('draw', data);
      // Send back to sender to trigger local drawing
      socket.emit('draw', data);
    }
  });

  // Handle clear board event
  socket.on('clear-board', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.drawings = [];
      room.history = [{ type: 'clear' }];
      io.to(roomId).emit('clear-board');  // Changed to io.to to include all clients
    }
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    const timestamp = new Date().toLocaleTimeString();
    const messageData = {
      message: data.message,
      userId: socket.id,
      username: data.username,
      timestamp
    };
    // Broadcast to all clients in the room
    io.to(data.roomId).emit('chat-message', messageData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        if (room.users.size === 0) {
          rooms.delete(roomId);
        } else {
          // Notify others that user has left
          socket.to(roomId).emit('user-left', socket.id);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
module.exports = (req, res) => {
  res.status(200).json({ message: "Hello from the server!" });
};