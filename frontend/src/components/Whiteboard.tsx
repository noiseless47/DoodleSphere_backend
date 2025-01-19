import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface WhiteboardProps {
  socket: Socket;
  roomId: string;
}

interface DrawData {
  roomId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  lineWidth: number;
}

// Extend CanvasRenderingContext2D to include our custom properties
interface ExtendedCanvasRenderingContext2D extends CanvasRenderingContext2D {
  lastX?: number;
  lastY?: number;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ socket, roomId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  // Add refs for last position
  const lastX = useRef<number>(0);
  const lastY = useRef<number>(0);

  useEffect(() => {
    socket.emit('join-room', roomId);

    socket.on('draw', handleRemoteDraw);
    socket.on('initial-state', handleInitialState);

    return () => {
      socket.off('draw');
      socket.off('initial-state');
    };
  }, [roomId, socket]);

  const handleInitialState = (drawings: DrawData[]) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      drawings.forEach(drawing => {
        drawLine(ctx, drawing);
      });
    }
  };

  const handleRemoteDraw = (data: DrawData) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      drawLine(ctx, data);
    }
  };

  const drawLine = (ctx: CanvasRenderingContext2D, data: DrawData) => {
    ctx.beginPath();
    ctx.moveTo(data.startX, data.startY);
    ctx.lineTo(data.endX, data.endY);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.lineWidth;
    ctx.stroke();
    ctx.closePath();
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      lastX.current = e.clientX - rect.left;
      lastY.current = e.clientY - rect.top;
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!ctx || !rect) return;

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const drawData: DrawData = {
      roomId,
      startX: lastX.current,
      startY: lastY.current,
      endX: currentX,
      endY: currentY,
      color,
      lineWidth
    };

    drawLine(ctx, drawData);
    socket.emit('draw', drawData);

    // Update the last position
    lastX.current = currentX;
    lastY.current = currentY;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <div className="flex-1 p-4">
      <div className="mb-4 flex space-x-4">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-8 w-8"
        />
        <input
          type="range"
          min="1"
          max="20"
          value={lineWidth}
          onChange={(e) => setLineWidth(parseInt(e.target.value))}
          className="w-32"
        />
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-gray-300 rounded"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />
    </div>
  );
};

export default Whiteboard;