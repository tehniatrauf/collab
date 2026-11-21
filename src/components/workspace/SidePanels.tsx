import { useState, type FormEvent } from "react";
import { useEffect, useRef } from "react";
import { Send, RotateCcw, Shield, Edit2, Eye } from "lucide-react";
import { createDocumentSocket } from "../../services/socket";
import { api } from "../../services/api";

export function ChatPanel({ documentId }: { documentId: string }) {
  const [messages, setMessages] = useState<Array<{ id: string | number; user: string; text: string; time: string; isMe: boolean }>>([
    { id: 1, user: "Sarah", text: "Hey! I just added the new architecture diagram.", time: "10:42 AM", isMe: false },
    { id: 2, user: "You", text: "Awesome, taking a look now.", time: "10:43 AM", isMe: true },
  ]);
  const [input, setInput] = useState("");
  const socketRef = useRef<ReturnType<typeof createDocumentSocket> | null>(null);

  useEffect(() => {
    const socket = createDocumentSocket();
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("document:join", { documentId }));
    socket.on("chat:message", (message) => setMessages((prev) => [...prev, {
      id: String(message.id),
      user: message.user,
      text: message.text,
      time: new Date(message.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isMe: message.userId === JSON.parse(localStorage.getItem("mock_user") || "{}").id,
    }]));
    return () => {
      socket.disconnect();
    };
  }, [documentId]);

  const sendMessage = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    socketRef.current?.emit("chat:message", { documentId, text: input });
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}>
            <span className="text-xs text-slate-400 mb-1">{msg.user} • {msg.time}</span>
            <div className={`px-4 py-2 rounded-xl max-w-[85%] text-sm ${msg.isMe ? "bg-brand text-white rounded-tr-sm" : "bg-slate-100 text-slate-700 rounded-tl-sm"}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="p-3 border-t bg-white">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition text-sm"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-brand p-1 hover:bg-brand/10 rounded-lg transition">
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}

export function VersionHistory({ documentId }: { documentId: string }) {
  const [versions, setVersions] = useState<Array<{ id: string; version: number; author: string; reason: string; createdAt: string; content: unknown }>>([]);
  const [preview, setPreview] = useState<{ id: string; version: number; content: unknown } | null>(null);

  useEffect(() => {
    api.get(`/api/documents/${documentId}/versions`)
      .then(({ data }) => setVersions(data.versions))
      .catch(() => setVersions([]));
  }, [documentId]);

  const restore = async (versionId: string) => {
    await api.post(`/api/documents/${documentId}/restore/${versionId}`);
    const { data } = await api.get(`/api/documents/${documentId}/versions`);
    setVersions(data.versions);
  };

  return (
    <div className="p-4 h-full overflow-y-auto">
      {preview && (
        <div className="mb-4 rounded-xl border border-brand/20 bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Preview - Version {preview.version}</span>
            <button onClick={() => setPreview(null)} className="text-xs text-slate-500 hover:text-slate-800">Close</button>
          </div>
          <textarea
            readOnly
            value={typeof preview.content === "string" ? preview.content : JSON.stringify(preview.content, null, 2)}
            className="w-full h-40 resize-none rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs"
          />
          <button onClick={() => void restore(preview.id)} className="mt-2 w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white">
            Restore this version
          </button>
        </div>
      )}
      <div className="relative border-l-2 border-slate-100 ml-3 space-y-6 pb-4">
        {versions.map((v) => (
          <div key={v.id} className="relative pl-6">
            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white bg-slate-300"></div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 hover:border-brand/30 transition group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-800">Version {v.version}</span>
                <span className="text-xs text-slate-400">{new Date(v.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">By {v.author} - {v.reason}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPreview({ id: v.id, version: v.version, content: v.content })} className="text-xs font-medium text-slate-600 hover:text-brand">
                    Preview
                  </button>
                  <button onClick={() => void restore(v.id)} className="text-xs font-medium text-brand flex items-center gap-1">
                    <RotateCcw size={12} /> Restore
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PresencePanel({ documentId }: { documentId: string }) {
  const [users, setUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);

  useEffect(() => {
    const socket = createDocumentSocket();
    socket.on("connect", () => socket.emit("document:join", { documentId }));
    socket.on("document:state", (state) => setUsers((prev) => {
      const current = JSON.parse(localStorage.getItem("mock_user") || "{}");
      return [{ id: current.id || "you", name: current.name || "You", role: state.role }, ...prev];
    }));
    socket.on("presence:join", (user) => setUsers((prev) => prev.some((item) => item.id === user.id) ? prev : [...prev, { id: user.id, name: user.name, role: "Collaborator" }]));
    socket.on("presence:leave", (user) => setUsers((prev) => prev.filter((item) => item.id !== user.id)));
    return () => {
      socket.disconnect();
    };
  }, [documentId]);

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Online Users ({users.length})</h3>
      {users.map((user) => (
        <div key={user.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                {user.role === "Owner" ? <Shield size={10}/> : user.role === "Editor" ? <Edit2 size={10}/> : <Eye size={10}/>}
                {user.role}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}