import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Must point to your deployed backend
});

// Add this interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // Ensure this key matches your login logic
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;