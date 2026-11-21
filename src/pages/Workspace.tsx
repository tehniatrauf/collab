import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, History, MessageSquare, MoreHorizontal, Share2, Users } from "lucide-react";
import CodeEditor from "../components/editor/CodeEditor";
import Whiteboard from "../components/whiteboard/whiteboard";
import { ChatPanel, PresencePanel, VersionHistory } from "../components/workspace/SidePanels";
import { createDocumentSocket } from "../services/socket";

type SidebarTab = "chat" | "history" | "users" | null;

export default function Workspace() {
  const { id } = useParams();
  const isWhiteboard = id === "2";
  const docTitle = isWhiteboard ? "System Architecture" : "Main.js collaboration";
  const [activeTab, setActiveTab] = useState<SidebarTab>("chat");
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { name: string; x: number; y: number }>>({});

  useEffect(() => {
    const socket = createDocumentSocket();
    socket.on("connect", () => socket.emit("document:join", { documentId: id }));
    socket.on("cursor:update", ({ userId, name, cursor }) => {
      if (!cursor) return;
      setRemoteCursors((current) => ({ ...current, [userId]: { name, x: cursor.x, y: cursor.y } }));
    });
    socket.on("presence:leave", ({ id: userId }) => {
      setRemoteCursors((current) => {
        const next = { ...current };
        delete next[userId];
        return next;
      });
    });
    return () => {
      socket.disconnect();
    };
  }, [id]);

  return (
    <div className="h-full flex flex-col -m-4 md:-m-8 bg-slate-50">
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0 h-14">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="text-slate-400 hover:text-slate-800 transition p-1.5 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="h-4 w-px bg-slate-300"></div>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            {docTitle}
            <span className="text-[10px] uppercase tracking-wider font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Live
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-2">
            <div className="w-8 h-8 rounded-full bg-brand border-2 border-white flex items-center justify-center text-white text-xs font-bold z-20" title="You">T</div>
            <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold z-10" title="Sarah">S</div>
            <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-slate-600 text-xs font-bold">+1</div>
          </div>

          <button className="text-sm font-medium text-slate-600 hover:text-brand px-3 py-1.5 rounded-lg hover:bg-slate-100 transition flex items-center gap-1.5">
            <Share2 size={16} /> Share
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1"></div>

          <button
            onClick={() => setActiveTab("chat")}
            className={`p-1.5 rounded-lg transition ${activeTab === "chat" ? "bg-brand/10 text-brand" : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"}`}
            title="Chat"
          >
            <MessageSquare size={18} />
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`p-1.5 rounded-lg transition ${activeTab === "history" ? "bg-brand/10 text-brand" : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"}`}
            title="Version History"
          >
            <History size={18} />
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`p-1.5 rounded-lg transition ${activeTab === "users" ? "bg-brand/10 text-brand" : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"}`}
            title="Online Users"
          >
            <Users size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 overflow-hidden relative">
          {Object.entries(remoteCursors).map(([cursorId, cursor]) => (
            <div
              key={cursorId}
              className="absolute z-20 pointer-events-none transition-all duration-75"
              style={{ left: Math.max(8, cursor.x % 900), top: Math.max(8, cursor.y % 600) }}
            >
              <div className="w-0 h-5 border-l-2 border-emerald-500"></div>
              <div className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-md rounded-tl-none whitespace-nowrap shadow-sm">
                {cursor.name}
              </div>
            </div>
          ))}

          {isWhiteboard ? <Whiteboard documentId={id || ""} /> : <CodeEditor documentId={id || ""} />}
        </div>

        {activeTab !== null && (
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 relative">
            <div className="flex items-center justify-between p-3 border-b bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 capitalize text-sm flex items-center gap-2">
                {activeTab === "chat" && <><MessageSquare size={16} /> Team Chat</>}
                {activeTab === "history" && <><History size={16} /> Version History</>}
                {activeTab === "users" && <><Users size={16} /> Online Users</>}
              </h3>
              <button onClick={() => setActiveTab(null)} className="text-slate-400 hover:text-slate-600">
                <MoreHorizontal size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === "chat" && <ChatPanel documentId={id || ""} />}
              {activeTab === "history" && <VersionHistory documentId={id || ""} />}
              {activeTab === "users" && <PresencePanel documentId={id || ""} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
