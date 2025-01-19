import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { X, MessageCircle, Square, Circle, Type, Eraser } from 'lucide-react';
import Chat from './Chat';

interface WhiteboardProps {
  socket: Socket;
  roomId: string;
  username: string;
}

interface DrawData {
  roomId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  lineWidth: number;
  tool: string;
  text?: string;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ socket, roomId, username }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [selectedTool, setSelectedTool] = useState('pencil');
  const [showChat, setShowChat] = useState(false);
  const lastX = useRef<number>(0);
  const lastY = useRef<number>(0);
  const shapeStartX = useRef<number>(0);
  const shapeStartY = useRef<number>(0);

  const tools = [
    { id: 'pencil', icon: null, name: 'Pencil' },
    { id: 'eraser', icon: Eraser, name: 'Eraser' },
    { id: 'rectangle', icon: Square, name: 'Rectangle' },
    { id: 'circle', icon: Circle, name: 'Circle' },
    { id: 'text', icon: Type, name: 'Text' }
  ];

  useEffect(() => {
    socket.emit('join-room', roomId);
    socket.on('draw', handleRemoteDraw);
    socket.on('initial-state', handleInitialState);

    const resizeCanvas = () => {
      if (canvasRef.current && previewCanvasRef.current && containerRef.current) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Set main canvas size
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        
        // Set preview canvas size
        previewCanvasRef.current.width = width;
        previewCanvasRef.current.height = height;
        
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
        }
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    return () => {
      socket.off('draw');
      socket.off('initial-state');
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [roomId, socket]);

  const handleInitialState = (drawings: DrawData[]) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      drawings.forEach(drawing => drawShape(ctx, drawing));
    }
  };

  const handleRemoteDraw = (data: DrawData) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      drawShape(ctx, data);
    }
  };

  const drawShape = (ctx: CanvasRenderingContext2D, data: DrawData) => {
    ctx.strokeStyle = data.tool === 'eraser' ? '#FFFFFF' : data.color;
    ctx.lineWidth = data.lineWidth;
    
    switch (data.tool) {
      case 'pencil':
      case 'eraser':
        ctx.beginPath();
        ctx.moveTo(data.startX, data.startY);
        ctx.lineTo(data.endX, data.endY);
        ctx.stroke();
        ctx.closePath();
        break;
      
      case 'rectangle':
        ctx.beginPath();
        const width = data.endX - data.startX;
        const height = data.endY - data.startY;
        ctx.strokeRect(data.startX, data.startY, width, height);
        break;
      
      case 'circle':
        ctx.beginPath();
        const radius = Math.sqrt(
          Math.pow(data.endX - data.startX, 2) +
          Math.pow(data.endY - data.startY, 2)
        );
        ctx.arc(data.startX, data.startY, radius, 0, Math.PI * 2);
        ctx.stroke();
        break;
      
      case 'text':
        if (data.text) {
          ctx.font = `${data.lineWidth * 8}px Arial`;
          ctx.fillStyle = data.color;
          ctx.fillText(data.text, data.startX, data.startY);
        }
        break;
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      lastX.current = x;
      lastY.current = y;
      shapeStartX.current = x;
      shapeStartY.current = y;

      if (selectedTool === 'text') {
        const userText = prompt('Enter text:');
        if (userText) {
          const drawData: DrawData = {
            roomId,
            startX: x,
            startY: y,
            endX: x,
            endY: y,
            color,
            lineWidth,
            tool: 'text',
            text: userText
          };
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) {
            drawShape(ctx, drawData);
            socket.emit('draw', drawData);
          }
        }
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || selectedTool === 'text') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (selectedTool === 'rectangle' || selectedTool === 'circle') {
      // Draw on preview canvas
      const previewCtx = previewCanvasRef.current?.getContext('2d');
      if (previewCtx) {
        // Clear previous preview
        previewCtx.clearRect(0, 0, previewCanvasRef.current!.width, previewCanvasRef.current!.height);
        
        const drawData: DrawData = {
          roomId,
          startX: shapeStartX.current,
          startY: shapeStartY.current,
          endX: currentX,
          endY: currentY,
          color,
          lineWidth,
          tool: selectedTool
        };
        
        drawShape(previewCtx, drawData);
      }
    } else {
      // Draw on main canvas for pencil and eraser
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        const drawData: DrawData = {
          roomId,
          startX: lastX.current,
          startY: lastY.current,
          endX: currentX,
          endY: currentY,
          color,
          lineWidth,
          tool: selectedTool
        };

        drawShape(ctx, drawData);
        socket.emit('draw', drawData);

        lastX.current = currentX;
        lastY.current = currentY;
      }
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing && (selectedTool === 'rectangle' || selectedTool === 'circle')) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        // Clear preview canvas
        const previewCtx = previewCanvasRef.current?.getContext('2d');
        if (previewCtx) {
          previewCtx.clearRect(0, 0, previewCanvasRef.current!.width, previewCanvasRef.current!.height);
        }
        
        // Draw final shape on main canvas
        const drawData: DrawData = {
          roomId,
          startX: shapeStartX.current,
          startY: shapeStartY.current,
          endX: currentX,
          endY: currentY,
          color,
          lineWidth,
          tool: selectedTool
        };
        
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          drawShape(ctx, drawData);
          socket.emit('draw', drawData);
        }
      }
    }
    setIsDrawing(false);
  };

  return (
    <div ref={containerRef} className="fixed inset-0 bg-gray-50">
      <div className="absolute top-4 left-4 bg-white p-2 rounded-md shadow-md z-10">
        <p className="text-sm text-gray-600">Room ID: {roomId}</p>
        <p className="text-sm text-gray-600">User: {username}</p>
      </div>

      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white p-2 rounded-md shadow-md flex space-x-2 z-10">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(tool.id)}
            className={`p-2 rounded-md transition-colors ${
              selectedTool === tool.id 
                ? 'bg-blue-500 text-white' 
                : 'hover:bg-gray-100'
            }`}
            title={tool.name}
          >
            {tool.icon ? <tool.icon size={20} /> : tool.name}
          </button>
        ))}
        <div className="h-6 w-px bg-gray-200 mx-2" />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer"
          title="Color picker"
        />
        <input
          type="range"
          min="1"
          max="20"
          value={lineWidth}
          onChange={(e) => setLineWidth(parseInt(e.target.value))}
          className="w-32"
          title="Line width"
        />
      </div>

      <button
        onClick={() => setShowChat(!showChat)}
        className="absolute bottom-4 right-4 bg-blue-500 text-white rounded-full p-3 shadow-lg hover:bg-blue-600 z-10"
      >
        {showChat ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {showChat && (
        <div className="absolute right-4 bottom-20 w-80 h-96 bg-white rounded-lg shadow-xl z-10">
          <Chat socket={socket} roomId={roomId} username={username} />
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="absolute inset-0 bg-white"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />
      <canvas
        ref={previewCanvasRef}
        className="absolute inset-0 pointer-events-none"
      />
    </div>
  );
};

export default Whiteboard;