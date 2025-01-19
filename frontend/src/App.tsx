import { useState } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import Whiteboard from './components/Whiteboard';
import Chat from './components/Chat';

const socket = io('http://localhost:5000');

function App() {
  const [roomId, setRoomId] = useState('');
  const [isJoined, setIsJoined] = useState(false);

  const createRoom = () => {
    const newRoomId = uuidv4();
    setRoomId(newRoomId);
    setIsJoined(true);
  };

  const joinRoom = () => {
    if (roomId.trim()) {
      setIsJoined(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {!isJoined ? (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Collaborative Whiteboard</h1>
            <div className="space-y-4">
              <button
                onClick={createRoom}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded"
              >
                Create New Room
              </button>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter Room ID"
                  className="flex-1 border rounded px-2 py-1"
                />
                <button
                  onClick={joinRoom}
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-screen">
          <Whiteboard socket={socket} roomId={roomId} />
          <Chat socket={socket} roomId={roomId} />
        </div>
      )}
    </div>
  );
}

export default App;