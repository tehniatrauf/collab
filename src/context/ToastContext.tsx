import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { X, CheckCircle, Info, AlertTriangle } from "lucide-react";

type ToastType = "success" | "info" | "warning";
interface Toast { id: number; message: string; type: ToastType; }

interface ToastCtx {
  showToast: (message: string, type?: ToastType) => void;
}

const Ctx = createContext<ToastCtx>(null!);
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <Ctx.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 min-w-[250px]">
            {toast.type === "success" && <CheckCircle size={18} className="text-emerald-400" />}
            {toast.type === "info" && <Info size={18} className="text-blue-400" />}
            {toast.type === "warning" && <AlertTriangle size={18} className="text-amber-400" />}
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} className="text-slate-400 hover:text-white transition">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}