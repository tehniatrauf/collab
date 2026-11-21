import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { html } from "@codemirror/lang-html";
import { createDocumentSocket } from "../../services/socket";

// Define the languages and their CodeMirror extensions
const languages = {
  javascript: { name: "JavaScript", extension: javascript({ jsx: true }) },
  python: { name: "Python", extension: python() },
  java: { name: "Java", extension: java() },
  cpp: { name: "C++", extension: cpp() },
  html: { name: "HTML", extension: html() },
};

type LanguageKey = keyof typeof languages;

export default function CodeEditor({ documentId, readOnly = false }: { documentId: string; readOnly?: boolean }) {
  const [code, setCode] = useState("// Start coding here...\n");
  const [lang, setLang] = useState<LanguageKey>("javascript");
  const [role, setRole] = useState<"Owner" | "Editor" | "Viewer" | null>(null);
  const socketRef = useRef<ReturnType<typeof createDocumentSocket> | null>(null);

  useEffect(() => {
    const socket = createDocumentSocket();
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("document:join", { documentId }));
    socket.on("document:state", ({ content, language, role: socketRole }) => {
      setCode(typeof content === "string" ? content : "// Start coding here...\n");
      if (language && language in languages) setLang(language as LanguageKey);
      setRole(socketRole || null);
    });
    socket.on("document:update", ({ content, language }) => {
      setCode(typeof content === "string" ? content : code);
      if (language && language in languages) setLang(language as LanguageKey);
    });

    const reconnectQueue = localStorage.getItem(`offline:${documentId}`);
    if (reconnectQueue) setCode(reconnectQueue);

    return () => {
      socket.disconnect();
    };
  }, [documentId]);

  const handleChange = (value: string) => {
    if (readOnly || role === "Viewer") return;
    setCode(value);
    localStorage.setItem(`offline:${documentId}`, value);
    socketRef.current?.emit("document:update", { documentId, content: value, language: lang });
  };

  const isReadOnly = readOnly || role === "Viewer";

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50">
        <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Auto-saving...
        </span>
        <select
          value={lang}
          onChange={(e) => {
            if (isReadOnly) return;
            const nextLanguage = e.target.value as LanguageKey;
            setLang(nextLanguage);
            socketRef.current?.emit("document:update", { documentId, content: code, language: nextLanguage });
          }}
          disabled={isReadOnly}
          className="bg-white border border-slate-300 text-sm rounded-md px-2 py-1 outline-none focus:border-brand"
        >
          {Object.entries(languages).map(([key, value]) => (
            <option key={key} value={key}>{value.name}</option>
          ))}
        </select>
      </div>

      {/* CodeMirror Editor Area */}
      <div className="flex-1 overflow-auto text-base">
        <CodeMirror
          value={code}
          height="100%"
          theme="light"
          extensions={[languages[lang].extension]}
          onChange={handleChange}
          editable={!isReadOnly}
          onUpdate={(update) => {
            const selection = update.state.selection.main;
            const coords = update.view.coordsAtPos(selection.head);
            socketRef.current?.emit("cursor:update", {
              documentId,
              cursor: coords ? { x: coords.left, y: coords.top } : null,
            });
          }}
        />
      </div>
    </div>
  );
}