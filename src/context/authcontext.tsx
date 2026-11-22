import { createContext, useContext, useState, type ReactNode } from "react";
import axios from "axios";
import type { User } from "../types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

// 1. Point to your deployed Vercel backend URL
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000"; 

export function AuthProvider({ children }: { children: ReactNode }) {
  // Load user from localStorage on initial load
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  // ✅ 1. REAL LOGIN
  async function login(email: string, password: string) {
    try {
      setLoading(true);
      // Call your real backend
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      // Assuming your backend returns { token, user }
      const { token, user: realUser } = response.data;

      // Save the REAL token
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(realUser));
      
      setUser(realUser);
    } catch (error: any) {
      console.error("Login failed:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  }

  // ✅ 2. REAL REGISTER
  async function register(name: string, email: string, password: string) {
    try {
      setLoading(true);
      // Call your real backend
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        name,
        email,
        password,
      });

      // If your backend auto-logs in after register and returns a token:
      const { token, user: realUser } = response.data;
      
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(realUser));
      setUser(realUser);
      
      // Note: If your backend does NOT auto-login, remove the lines above 
      // and just alert the user to go to the login page instead.
    } catch (error: any) {
      console.error("Register failed:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  }

  // ✅ 3. REAL LOGOUT
  function logout() {
    // Remove real tokens
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    
    // Optional: Redirect to login page after logout
    window.location.href = "/login"; 
  }

  // ✅ 4. REAL UPDATE PROFILE
  async function updateProfile(data: Partial<User>) {
    if (!user) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      // Call your backend to save the profile update
      const response = await axios.put(
        `${API_URL}/api/users/profile`, 
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Update local state with the response from the database
      const updatedUser = response.data.user || { ...user, ...data };
      
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error: any) {
      console.error("Profile update failed:", error.response?.data || error.message);
      throw new Error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </Ctx.Provider>
  );
}