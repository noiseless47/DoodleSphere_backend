import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface ChatProps {
  socket: Socket;
  roomId: string;
}

interface ChatMessage {
  message: string;
  userId: string;
}

const Chat: React.FC<ChatProps> = ({ socket, roomId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.on('chat-message', (data: ChatMessage) => {
      setMessages(prev => [...prev, data]);
    });

    return () => {
      socket.off('chat-message');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const messageData = {
        roomId,
        message: newMessage
      };
      socket.emit('chat-message', messageData);
      setMessages(prev => [...prev, { message: newMessage, userId: 'me' }]);
      setNewMessage('');
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-2 ${
              msg.userId === 'me' ? 'text-right' : 'text-left'
            }`}
          >
            <span className="inline-block bg-blue-100 rounded px-3 py-1">
              {msg.message}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="w-full border rounded px-2 py-1"
        />
      </form>
    </div>
  );
};

export default Chat;