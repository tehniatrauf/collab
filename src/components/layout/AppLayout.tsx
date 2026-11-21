import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authcontext";
import { LayoutDashboard, LogOut, User as UserIcon, FileText } from "lucide-react";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white p-4 flex flex-col hidden md:flex">
        <div className="flex items-center gap-2 mb-8 px-2 text-brand">
          <FileText size={24} />
          <h1 className="text-xl font-bold">CollabDocs</h1>
        </div>
        
        <nav className="space-y-1 flex-1">
          <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition">
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <Link to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition">
            <UserIcon size={18} /> Profile
          </Link>
        </nav>
        
        <div className="pt-4 border-t">
          <div className="px-3 py-2 flex items-center gap-3 mb-2 text-sm text-slate-600">
            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand">
              <UserIcon size={16} />
            </div>
            <div className="truncate font-medium">{user?.name || "Guest"}</div>
          </div>
          <button
            onClick={() => { logout(); nav("/login"); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 font-medium transition"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}