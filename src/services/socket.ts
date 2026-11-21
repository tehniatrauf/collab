import { io, type Socket } from "socket.io-client";

export function createDocumentSocket(): Socket {
  return io(import.meta.env.VITE_SOCKET_URL || "http://localhost:4000", {
    auth: { token: localStorage.getItem("token") },
    transports: ["websocket", "polling"],
  });
}
