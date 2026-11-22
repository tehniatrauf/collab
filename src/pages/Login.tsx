import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Ensure this matches your file name exactly (capital A and C)
import { Mail, Lock, Eye, EyeOff, Layers } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(""); // Clear previous errors

    try {
      await login(email, password);
    } catch (err: any) {
      // Show the exact error from the backend
      setError(err.message || "Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>

      <div className="bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand/30 mb-4">
            <Layers size={28} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Welcome back</h2>
          <p className="text-sm text-slate-500 mt-1">Please enter your details to sign in.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center font-medium border border-red-100">
            {error}
          </div>
        )}

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
                onChange={(event) => setEmail(event.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-slate-700 bg-white"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <Link to="/forgot-password" className="text-xs font-semibold text-brand hover:text-brand-dark transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-slate-700 bg-white"
                placeholder="********"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              className="w-4 h-4 text-brand border-slate-300 rounded focus:ring-brand cursor-pointer"
            />
            <label htmlFor="remember" className="ml-2 block text-sm text-slate-600 cursor-pointer">
              Remember for 30 days
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-brand text-white rounded-xl py-2.5 font-semibold hover:bg-brand-dark focus:ring-4 focus:ring-brand/30 transition-all shadow-lg shadow-brand/20 flex justify-center items-center gap-2"
          >
            Sign in
          </button>
        </form>

        <p className="text-center text-sm mt-8 text-slate-500">
          Don't have an account? <Link to="/register" className="text-brand font-semibold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}