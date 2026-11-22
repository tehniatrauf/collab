import { useState, useRef, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, FileText, LayoutDashboard, MoreVertical, Search, 
  Share2, Trash2, Edit2, Copy, Users, Shield, Eye
} from "lucide-react";
import Modal from "../components/ui/Modal";
import { useToast } from "../context/ToastContext";
import  api  from "../services/api";

// Define the document type based on requirements
type DocRole = "Owner" | "Editor" | "Viewer";
interface Document {
  id: string;
  title: string;
  type: "code" | "whiteboard";
  updatedAt: string;
  role: DocRole;
}

const INITIAL_DOCS: Document[] = [
  { id: "1", title: "Main.js collaboration", type: "code", updatedAt: "Just now", role: "Owner" },
  { id: "2", title: "System Architecture", type: "whiteboard", updatedAt: "2 hours ago", role: "Editor" },
  { id: "3", title: "index.html", type: "code", updatedAt: "Yesterday", role: "Viewer" },
];

export default function Dashboard() {
  const { showToast } = useToast(); // <-- Initialize Toast

  const [docs, setDocs] = useState<Document[]>(INITIAL_DOCS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "owned" | "shared">("all");
  
  // Modal states
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocType, setNewDocType] = useState<"code" | "whiteboard">("code");
  
  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"Editor" | "Viewer">("Editor");

  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get("/api/documents")
      .then(({ data }: any) => setDocs(data.documents.map((doc: Document) => ({
        ...doc,
        updatedAt: doc.updatedAt === "Just now" ? "Just now" : "Recently",
      }))))
      .catch(() => showToast("Could not load documents. Start the server to sync.", "warning"));
  }, [showToast]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Handlers ---
  const handleCreateDoc = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/api/documents", { title: newDocTitle, type: newDocType });
      const newDoc: Document = {
        id: data.document.id,
        title: data.document.title,
        type: data.document.type,
        updatedAt: "Just now",
        role: "Owner",
      };
      setDocs([newDoc, ...docs]);
      setIsNewModalOpen(false);
      setNewDocTitle("");
      showToast("Document created successfully!", "success");
    } catch {
      showToast("Could not create document.", "warning");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      try {
        await api.delete(`/api/documents/${id}`);
        setDocs(docs.filter(d => d.id !== id));
        showToast("Document deleted.", "warning");
      } catch {
        showToast("Could not delete document.", "warning");
      }
    }
  };

  const handleDuplicate = async (doc: Document) => {
    try {
      const { data } = await api.post(`/api/documents/${doc.id}/duplicate`);
      setDocs([{ id: data.document.id, title: data.document.title, type: data.document.type, updatedAt: "Just now", role: "Owner" }, ...docs]);
      showToast("Document duplicated.", "info");
    } catch {
      showToast("Could not duplicate document.", "warning");
    }
  };

  const handleRename = async (id: string, currentTitle: string) => {
    const newTitle = prompt("Enter new document name:", currentTitle);
    if (newTitle && newTitle !== currentTitle) {
      try {
        await api.patch(`/api/documents/${id}`, { title: newTitle });
        setDocs(docs.map(d => d.id === id ? { ...d, title: newTitle } : d));
        showToast("Document renamed.", "info");
      } catch {
        showToast("Could not rename document.", "warning");
      }
    }
  };

  // Filtering Logic
  const filteredDocs = docs.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = 
      filter === "all" ? true :
      filter === "owned" ? doc.role === "Owner" : 
      doc.role !== "Owner";
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Your Documents</h1>
          <p className="text-slate-500">Manage and collaborate on your code and whiteboards</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-sm w-full md:w-64"
            />
          </div>
          <button 
            onClick={() => setIsNewModalOpen(true)}
            className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition shadow-lg shadow-brand/20 whitespace-nowrap"
          >
            <Plus size={18} /> New Document
          </button>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-px">
        {(["all", "owned", "shared"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              filter === tab 
                ? "border-brand text-brand" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "all" ? "All Documents" : tab === "owned" ? "Owned by Me" : "Shared with Me"}
          </button>
        ))}
      </div>

      {/* Document Grid */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No documents found</h3>
          <p className="text-slate-500 mt-1">Create a new document or try a different search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="relative bg-white rounded-2xl border border-slate-200 hover:border-brand/50 hover:shadow-lg hover:shadow-brand/5 transition-all group flex flex-col">
              
              {/* Card Header & Actions */}
              <div className="p-5 flex items-start justify-between">
                <Link to={`/doc/${doc.id}`} className="block">
                  <div className={`p-3 rounded-xl inline-block mb-3 ${doc.type === 'code' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                    {doc.type === 'code' ? <FileText size={24} /> : <LayoutDashboard size={24} />}
                  </div>
                </Link>
                
                {/* Dropdown Menu */}
                <div className="relative" ref={openDropdownId === doc.id ? dropdownRef : null}>
                  <button 
                    onClick={() => setOpenDropdownId(openDropdownId === doc.id ? null : doc.id)}
                    className="text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition"
                  >
                    <MoreVertical size={18} />
                  </button>
                  
                  {openDropdownId === doc.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20">
                      <button onClick={() => handleRename(doc.id, doc.title)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Edit2 size={14} /> Rename
                      </button>
                      <button onClick={() => handleDuplicate(doc)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Copy size={14} /> Duplicate
                      </button>
                      <button onClick={() => { setShareDocId(doc.id); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Share2 size={14} /> Share
                      </button>
                      <div className="h-px bg-slate-100 my-1"></div>
                      <button onClick={() => { handleDelete(doc.id); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <Link to={`/doc/${doc.id}`} className="px-5 pb-5 flex-1 flex flex-col justify-end">
                <h3 className="font-semibold text-slate-800 truncate text-lg group-hover:text-brand transition-colors">{doc.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-slate-500">Edited {doc.updatedAt}</p>
                  
                  {/* Role Badge */}
                  <span className={`text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1 ${
                    doc.role === 'Owner' ? 'bg-brand/10 text-brand' : 
                    doc.role === 'Editor' ? 'bg-emerald-100 text-emerald-700' : 
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {doc.role === 'Owner' ? <Shield size={12}/> : doc.role === 'Editor' ? <Edit2 size={12}/> : <Eye size={12}/>}
                    {doc.role}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* --- MODALS --- */}
      
      {/* New Document Modal */}
      <Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="Create New Document">
        <form onSubmit={handleCreateDoc} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Document Name</label>
            <input 
              type="text" 
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              placeholder="e.g., Untitled Project"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Document Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewDocType("code")}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${newDocType === 'code' ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
              >
                <FileText size={24} />
                <span className="font-medium text-sm">Code Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setNewDocType("whiteboard")}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${newDocType === 'whiteboard' ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
              >
                <LayoutDashboard size={24} />
                <span className="font-medium text-sm">Whiteboard</span>
              </button>
            </div>
          </div>
          <button type="submit" className="w-full bg-brand text-white rounded-xl py-2.5 font-semibold hover:bg-brand-dark transition-all shadow-lg shadow-brand/20 mt-2">
            Create Document
          </button>
        </form>
      </Modal>

      {/* Share Modal */}
      <Modal isOpen={!!shareDocId} onClose={() => setShareDocId(null)} title="Share Document">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Invite via Email</label>
            <div className="flex gap-2">
              <input 
                type="email" 
                value={shareEmail}
                onChange={(event) => setShareEmail(event.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
              />
              <select value={shareRole} onChange={(event) => setShareRole(event.target.value as "Editor" | "Viewer")} className="border border-slate-200 rounded-xl px-2 text-sm">
                <option>Editor</option>
                <option>Viewer</option>
              </select>
              <button 
                onClick={async () => {
                  if (!shareDocId || !shareEmail) return;
                  try {
                    await api.post(`/api/documents/${shareDocId}/share`, { email: shareEmail, role: shareRole });
                    showToast("Invitation sent successfully!", "success");
                    setShareEmail("");
                  } catch {
                    showToast("Could not send invitation.", "warning");
                  }
                }} 
                className="bg-brand text-white px-4 py-2.5 rounded-xl font-medium hover:bg-brand-dark transition"
              >
                Invite
              </button>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2"><Users size={16} /> People with access</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold">T</div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Tehnait (You)</p>
                    <p className="text-xs text-slate-500">tehnaitkhan@gmail.com</p>
                  </div>
                </div>
                <select className="text-sm border border-slate-200 rounded-lg px-2 py-1 outline-none text-slate-600 bg-slate-50">
                  <option>Owner</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">S</div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Sarah Jenkins</p>
                    <p className="text-xs text-slate-500">sarah@example.com</p>
                  </div>
                </div>
                <select className="text-sm border border-slate-200 rounded-lg px-2 py-1 outline-none text-slate-600 bg-slate-50">
                  <option>Editor</option>
                  <option>Viewer</option>
                  <option>Remove</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between border border-slate-100 mt-4">
            <div>
              <p className="text-sm font-medium text-slate-800">Share via Link</p>
              <p className="text-xs text-slate-500">Anyone with the link can view</p>
            </div>
            <button 
              onClick={async () => {
                if (!shareDocId) return;
                await navigator.clipboard?.writeText(`${window.location.origin}/doc/${shareDocId}`);
                showToast("Link copied to clipboard!", "info");
              }}
              className="text-brand text-sm font-semibold hover:underline"
            >
              Copy Link
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}