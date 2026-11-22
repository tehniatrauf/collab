import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Layers } from "lucide-react";
import  api  from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await api.post("/api/auth/forgot-password", { email });
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-brand/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>

      <div className="bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 w-full max-w-md relative z-10">
        
        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand mb-6 transition">
          <ArrowLeft size={16} /> Back to login
        </Link>

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand/30 mb-4">
            <Layers size={28} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Reset Password</h2>
          <p className="text-sm text-slate-500 mt-1 text-center">Enter your email and we'll send you a link to reset your password.</p>
        </div>

        {submitted ? (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-center border border-emerald-100">
            <p className="font-medium">Check your inbox!</p>
            <p className="text-sm mt-1">We've sent password reset instructions to <strong>{email}</strong>.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-slate-700 bg-white"
                  placeholder="you@example.com"
                  required 
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-brand text-white rounded-xl py-2.5 font-semibold hover:bg-brand-dark transition-all shadow-lg shadow-brand/20">
              Send Reset Link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}