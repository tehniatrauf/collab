import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  ArrowRight, Circle, Minus, MousePointer2, Pencil, Redo2, Square,
  Trash2, Type, Undo2, ZoomIn, ZoomOut,
} from "lucide-react";
import { createDocumentSocket } from "../../services/socket";

type Tool = "pencil" | "rect" | "circle" | "line" | "arrow" | "text" | "select";

interface Shape {
  type: Tool;
  color: string;
  strokeWidth: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  text?: string;
}

export default function Whiteboard({ documentId }: { documentId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<ReturnType<typeof createDocumentSocket> | null>(null);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#4f46e5");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [redoShapes, setRedoShapes] = useState<Shape[]>([]);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const socket = createDocumentSocket();
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("document:join", { documentId }));
    socket.on("document:state", ({ content }) => {
      if (Array.isArray(content)) setShapes(content as Shape[]);
    });
    socket.on("document:update", ({ content }) => {
      if (Array.isArray(content)) setShapes(content as Shape[]);
    });
    return () => {
      socket.disconnect();
    };
  }, [documentId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    shapes.forEach((shape, index) => drawShape(ctx, shape, index === selectedIndex));
    if (currentShape) drawShape(ctx, currentShape, false);
    ctx.restore();
  }, [shapes, currentShape, selectedIndex, zoom, pan]);

  const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape, selected: boolean) => {
    ctx.beginPath();
    ctx.strokeStyle = selected ? "#ef4444" : shape.color;
    ctx.fillStyle = shape.color;
    ctx.lineWidth = selected ? shape.strokeWidth + 2 : shape.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const width = shape.endX - shape.startX;
    const height = shape.endY - shape.startY;

    if (shape.type === "pencil") {
      ctx.moveTo(shape.startX, shape.startY);
      ctx.lineTo(shape.endX, shape.endY);
    } else if (shape.type === "rect") {
      ctx.rect(shape.startX, shape.startY, width, height);
    } else if (shape.type === "circle") {
      ctx.ellipse(
        (shape.startX + shape.endX) / 2,
        (shape.startY + shape.endY) / 2,
        Math.abs(width / 2),
        Math.abs(height / 2),
        0,
        0,
        Math.PI * 2,
      );
    } else if (shape.type === "line" || shape.type === "arrow") {
      ctx.moveTo(shape.startX, shape.startY);
      ctx.lineTo(shape.endX, shape.endY);
      if (shape.type === "arrow") {
        const angle = Math.atan2(shape.endY - shape.startY, shape.endX - shape.startX);
        ctx.moveTo(shape.endX, shape.endY);
        ctx.lineTo(shape.endX - 14 * Math.cos(angle - Math.PI / 6), shape.endY - 14 * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(shape.endX, shape.endY);
        ctx.lineTo(shape.endX - 14 * Math.cos(angle + Math.PI / 6), shape.endY - 14 * Math.sin(angle + Math.PI / 6));
      }
    } else if (shape.type === "text") {
      ctx.font = `${shape.strokeWidth * 6 + 10}px sans-serif`;
      ctx.fillText(shape.text || "Text", shape.startX, shape.startY);
      ctx.stroke();
    }
    ctx.stroke();
  };

  const getCoordinates = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (event.clientX - rect.left - pan.x) / zoom,
      y: (event.clientY - rect.top - pan.y) / zoom,
    };
  };

  const containsShape = (shape: Shape, x: number, y: number) => {
    const minX = Math.min(shape.startX, shape.endX) - 8;
    const maxX = Math.max(shape.startX, shape.endX) + 8;
    const minY = Math.min(shape.startY, shape.endY) - 8;
    const maxY = Math.max(shape.startY, shape.endY) + 8;
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  };

  const publish = (nextShapes: Shape[]) => {
    socketRef.current?.emit("document:update", { documentId, content: nextShapes });
  };

  const startDrawing = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCoordinates(event);

    if (tool === "select") {
      const found = [...shapes].reverse().findIndex((shape) => containsShape(shape, x, y));
      if (found === -1) {
        setSelectedIndex(null);
        return;
      }
      const index = shapes.length - 1 - found;
      setSelectedIndex(index);
      setIsDrawing(true);
      setCurrentShape({ ...shapes[index], endX: x, endY: y });
      return;
    }

    if (tool === "text") {
      const text = window.prompt("Enter text:");
      if (!text) return;
      const shape: Shape = { type: "text", color, strokeWidth, startX: x, startY: y, endX: x, endY: y, text };
      const next = [...shapes, shape];
      setShapes(next);
      setRedoShapes([]);
      publish(next);
      return;
    }

    setIsDrawing(true);
    setCurrentShape({ type: tool, color, strokeWidth, startX: x, startY: y, endX: x, endY: y });
  };

  const draw = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentShape) return;
    const { x, y } = getCoordinates(event);

    if (tool === "select" && selectedIndex !== null) {
      const original = shapes[selectedIndex];
      const dx = x - currentShape.endX;
      const dy = y - currentShape.endY;
      const moved = {
        ...original,
        startX: original.startX + dx,
        startY: original.startY + dy,
        endX: original.endX + dx,
        endY: original.endY + dy,
      };
      setShapes((prev) => prev.map((shape, index) => index === selectedIndex ? moved : shape));
      setCurrentShape({ ...moved, endX: x, endY: y });
      return;
    }

    if (tool === "pencil") {
      setShapes((prev) => [...prev, { ...currentShape, endX: x, endY: y }]);
      setCurrentShape({ ...currentShape, startX: x, startY: y });
    } else {
      setCurrentShape({ ...currentShape, endX: x, endY: y });
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    if (tool === "select" && selectedIndex !== null) {
      const next = shapes;
      publish(next);
    } else if (tool !== "pencil" && currentShape) {
      const next = [...shapes, currentShape];
      setShapes(next);
      setRedoShapes([]);
      publish(next);
    } else if (tool === "pencil") {
      publish(shapes);
      setRedoShapes([]);
    }
    setIsDrawing(false);
    setCurrentShape(null);
  };

  const undo = () => {
    if (!shapes.length) return;
    const removed = shapes[shapes.length - 1];
    const next = shapes.slice(0, -1);
    setShapes(next);
    setRedoShapes((prev) => [removed, ...prev]);
    setSelectedIndex(null);
    publish(next);
  };

  const redo = () => {
    if (!redoShapes.length) return;
    const restored = redoShapes[0];
    const next = [...shapes, restored];
    setShapes(next);
    setRedoShapes((prev) => prev.slice(1));
    publish(next);
  };

  const deleteSelected = () => {
    if (selectedIndex === null) return;
    const removed = shapes[selectedIndex];
    const next = shapes.filter((_, index) => index !== selectedIndex);
    setShapes(next);
    setRedoShapes((prev) => [removed, ...prev]);
    setSelectedIndex(null);
    publish(next);
  };

  const clear = () => {
    if (!shapes.length) return;
    setRedoShapes(shapes);
    setShapes([]);
    setSelectedIndex(null);
    publish([]);
  };

  const tools: Array<{ id: Tool; label: string; icon: typeof Pencil }> = [
    { id: "select", label: "Move / resize", icon: MousePointer2 },
    { id: "pencil", label: "Freehand", icon: Pencil },
    { id: "rect", label: "Rectangle", icon: Square },
    { id: "circle", label: "Circle", icon: Circle },
    { id: "line", label: "Line", icon: Minus },
    { id: "arrow", label: "Arrow", icon: ArrowRight },
    { id: "text", label: "Text", icon: Type },
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b bg-slate-50">
        {tools.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            title={label}
            onClick={() => setTool(id)}
            className={`p-2 rounded-lg transition ${tool === id ? "bg-brand text-white" : "hover:bg-slate-200 text-slate-600"}`}
          >
            <Icon size={18} />
          </button>
        ))}
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <input type="color" value={color} onChange={(event) => setColor(event.target.value)} title="Color" className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
        <select value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} className="rounded-lg border border-slate-200 px-2 py-1 text-sm" title="Stroke width">
          <option value={1}>1 px</option>
          <option value={3}>3 px</option>
          <option value={5}>5 px</option>
          <option value={8}>8 px</option>
        </select>
        <div className="flex-1"></div>
        <button onClick={() => setZoom((value) => Math.min(2, value + 0.1))} title="Zoom in" className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg"><ZoomIn size={18} /></button>
        <button onClick={() => setZoom((value) => Math.max(0.5, value - 0.1))} title="Zoom out" className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg"><ZoomOut size={18} /></button>
        <button onClick={() => setPan((value) => ({ x: value.x - 20, y: value.y }))} title="Pan left" className="px-2 py-1 text-slate-600 hover:bg-slate-200 rounded-lg">Pan</button>
        <button onClick={undo} title="Undo" className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg"><Undo2 size={18} /></button>
        <button onClick={redo} title="Redo" className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg"><Redo2 size={18} /></button>
        {selectedIndex !== null && <button onClick={deleteSelected} title="Delete selected" className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>}
        <button onClick={clear} title="Clear" className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
      </div>

      <div className="flex-1 bg-slate-50 relative cursor-crosshair overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  );
}
