const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();

// More flexible CORS configuration for Render
const allowedOrigin = process.env.CORS_ORIGIN || "*";

app.use(cors({
  origin: allowedOrigin,
  methods: ["GET", "POST"]
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"]
  }
});

// Store rooms and their data
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.username = `User-${socket.id}`;

  socket.on('join-room', (roomId, username) => {
    socket.username = username || socket.username;
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { 
        users: new Map(),
        drawings: [],
        history: [],
        redoStack: []
      });
    }
    
    const room = rooms.get(roomId);
    room.users.set(socket.id, { 
      id: socket.id,
      username: socket.username
    });
    
    socket.emit('initial-state', {
      drawings: room.drawings,
      history: room.history,
      redoStack: room.redoStack
    });
  });

  // Rest of the socket event handlers remain the same as in the original file

  socket.on('draw', (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.drawings.push(data);
      room.history.push({ type: 'draw', data });
      socket.broadcast.to(data.roomId).emit('draw', data);
      socket.emit('draw', data);
    }
  });

  socket.on('undo', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.history.length > 0) {
      const lastAction = room.history.pop();
      room.redoStack.push(lastAction);

      room.drawings = room.history
        .filter(entry => entry.type === 'draw')
        .map(entry => entry.data);

      io.to(roomId).emit('undo', {
        drawings: room.drawings,
        history: room.history,
        redoStack: room.redoStack
      });
    }
  });

  socket.on('redo', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.redoStack.length > 0) {
      const action = room.redoStack.pop();
      room.history.push(action);

      if (action.type === 'draw') {
        room.drawings.push(action.data);
      } else if (action.type === 'clear') {
        room.drawings = [];
      }

      io.to(roomId).emit('redo', {
        drawings: room.drawings,
        history: room.history,
        redoStack: room.redoStack
      });
    }
  });

  socket.on('clear-board', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.drawings = [];
      room.history = [{ type: 'clear' }];
      io.to(roomId).emit('clear-board');
    }
  });

  socket.on('chat-message', (data) => {
    const timestamp = new Date().toLocaleTimeString();
    const messageData = {
      message: data.message,
      userId: socket.id,
      username: socket.username,
      timestamp
    };
    io.to(data.roomId).emit('chat-message', messageData);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        if (room.users.size === 0) {
          rooms.delete(roomId);
        } else {
          socket.to(roomId).emit('user-left', socket.id);
        }
      }
    });
  });
});

// Use dynamic port for Render
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});