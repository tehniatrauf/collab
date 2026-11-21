import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authcontext";
import { User, Mail, Lock, Eye, EyeOff, Layers } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await register(name, email, password);
      nav("/dashboard");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Decorative Background Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-brand/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>

      {/* Main Card */}
      <div className="bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 w-full max-w-md relative z-10">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand/30 mb-4">
            <Layers size={28} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Create an account</h2>
          <p className="text-sm text-slate-500 mt-1">Start collaborating with your team today.</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center font-medium border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User size={18} />
              </div>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-slate-700 bg-white"
                placeholder="John Doe"
                required 
              />
            </div>
          </div>

          {/* Email Input */}
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

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-slate-700 bg-white"
                placeholder="••••••••"
                required 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Terms of Service */}
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="terms" 
              className="w-4 h-4 text-brand border-slate-300 rounded focus:ring-brand cursor-pointer"
              required
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-slate-600 cursor-pointer">
              I agree to the <a href="#" className="text-brand font-medium hover:underline">Terms & Conditions</a>
            </label>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="w-full bg-brand text-white rounded-xl py-2.5 font-semibold hover:bg-brand-dark focus:ring-4 focus:ring-brand/30 transition-all shadow-lg shadow-brand/20 flex justify-center items-center gap-2"
          >
            Create Account
          </button>
        </form>
        
        {/* Footer */}
        <p className="text-center text-sm mt-8 text-slate-500">
          Already have an account? <Link to="/login" className="text-brand font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}