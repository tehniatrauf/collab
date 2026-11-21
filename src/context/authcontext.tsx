import { createContext, useContext, useState, type ReactNode } from "react";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  // FAKE USER FOR FRONTEND TESTING
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("mock_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading] = useState(false);

  async function login(email: string, _password: string) {
    // Fake login
    const fakeUser = { id: "u1", name: "Demo User", email };
    localStorage.setItem("mock_user", JSON.stringify(fakeUser));
    localStorage.setItem("token", "fake-jwt-token");
    setUser(fakeUser);
  }

  async function register(name: string, email: string, _password: string) {
    // Fake register
    const fakeUser = { id: "u1", name, email };
    localStorage.setItem("mock_user", JSON.stringify(fakeUser));
    localStorage.setItem("token", "fake-jwt-token");
    setUser(fakeUser);
  }

  function logout() {
    localStorage.removeItem("mock_user");
    localStorage.removeItem("token");
    setUser(null);
  }

  // 👇 ADDED THIS FUNCTION
  async function updateProfile(data: Partial<User>) {
    if (!user) return;
    const updatedUser = { ...user, ...data };
    localStorage.setItem("mock_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  }

  return (
    // 👇 ADDED updateProfile TO THE VALUE
    <Ctx.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </Ctx.Provider>
  );
}