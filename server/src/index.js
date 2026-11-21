import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "node:http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { readDb, writeDb } from "./store.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || "*", credentials: true } });
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || "development-secret-change-me";

app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

function auth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, avatar: user.avatar || "" };
}

function roleFor(db, docId, userId) {
  const doc = db.documents.find((item) => item.id === docId);
  if (!doc) return null;
  if (doc.ownerId === userId) return "Owner";
  return doc.members?.find((member) => member.userId === userId)?.role || null;
}

function saveSnapshot(doc, author = "System", reason = "Auto-save") {
  doc.versions = doc.versions || [];
  const previousVersion = doc.versions[0]?.version || 0;
  doc.versions.unshift({
    id: uuid(),
    version: previousVersion + 1,
    author,
    reason,
    createdAt: new Date().toISOString(),
    content: structuredClone(doc.content),
  });
  doc.versions = doc.versions.slice(0, 100);
  doc.changeCount = 0;
}

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required" });
  const db = readDb();
  if (db.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ message: "Email already registered" });
  }
  const user = { id: uuid(), name, email: email.toLowerCase(), password: await bcrypt.hash(password, 12), avatar: "", resetToken: null };
  db.users.push(user);
  writeDb(db);
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, jwtSecret, { expiresIn: "7d" });
  res.status(201).json({ token, user: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const user = db.users.find((item) => item.email.toLowerCase() === email?.toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, jwtSecret, { expiresIn: "7d" });
  res.json({ token, user: publicUser(user) });
});

app.get("/api/auth/me", auth, (req, res) => {
  const user = readDb().users.find((item) => item.id === req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user: publicUser(user) });
});

app.post("/api/auth/forgot-password", (req, res) => {
  const db = readDb();
  const user = db.users.find((item) => item.email.toLowerCase() === req.body.email?.toLowerCase());
  if (user) {
    user.resetToken = uuid();
    writeDb(db);
  }
  res.json({ message: "If the account exists, reset instructions have been sent." });
});

app.put("/api/auth/profile", auth, (req, res) => {
  const db = readDb();
  const user = db.users.find((item) => item.id === req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  user.name = req.body.name?.trim() || user.name;
  user.avatar = req.body.avatar || user.avatar;
  writeDb(db);
  res.json({ user: publicUser(user) });
});

app.get("/api/documents", auth, (req, res) => {
  const db = readDb();
  const docs = db.documents
    .filter((doc) => doc.ownerId === req.user.id || doc.members?.some((member) => member.userId === req.user.id))
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      updatedAt: doc.updatedAt,
      role: doc.ownerId === req.user.id ? "Owner" : doc.members.find((member) => member.userId === req.user.id).role,
    }));
  res.json({ documents: docs });
});

app.post("/api/documents", auth, (req, res) => {
  const db = readDb();
  const doc = {
    id: uuid(), title: req.body.title?.trim() || "Untitled Document", type: req.body.type === "whiteboard" ? "whiteboard" : "code",
    ownerId: req.user.id, members: [], content: req.body.type === "whiteboard" ? [] : "// Start coding here...\n",
    language: "javascript", updatedAt: new Date().toISOString(), changeCount: 0, versions: [],
  };
  saveSnapshot(doc, req.user.name, "Initial version");
  db.documents.push(doc);
  writeDb(db);
  res.status(201).json({ document: doc });
});

app.get("/api/documents/:id", auth, (req, res) => {
  const db = readDb();
  const doc = db.documents.find((item) => item.id === req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  const role = roleFor(db, doc.id, req.user.id);
  if (!role) return res.status(403).json({ message: "Access denied" });
  res.json({ document: doc, role });
});

app.patch("/api/documents/:id", auth, (req, res) => {
  const db = readDb();
  const doc = db.documents.find((item) => item.id === req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  const role = roleFor(db, doc.id, req.user.id);
  if (role !== "Owner" && role !== "Editor") return res.status(403).json({ message: "Edit permission required" });
  if (typeof req.body.title === "string") doc.title = req.body.title.trim() || doc.title;
  if (req.body.language) doc.language = req.body.language;
  doc.updatedAt = new Date().toISOString();
  writeDb(db);
  res.json({ document: doc });
});

app.delete("/api/documents/:id", auth, (req, res) => {
  const db = readDb();
  const doc = db.documents.find((item) => item.id === req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  if (doc.ownerId !== req.user.id) return res.status(403).json({ message: "Only the owner can delete this document" });
  db.documents = db.documents.filter((item) => item.id !== doc.id);
  writeDb(db);
  res.status(204).end();
});

app.post("/api/documents/:id/duplicate", auth, (req, res) => {
  const db = readDb();
  const source = db.documents.find((item) => item.id === req.params.id);
  if (!source) return res.status(404).json({ message: "Document not found" });
  if (!roleFor(db, source.id, req.user.id)) return res.status(403).json({ message: "Access denied" });
  const copy = structuredClone(source);
  copy.id = uuid(); copy.ownerId = req.user.id; copy.members = []; copy.title = `${source.title} (Copy)`;
  copy.updatedAt = new Date().toISOString(); copy.versions = [];
  saveSnapshot(copy, req.user.name, "Duplicated document");
  db.documents.push(copy);
  writeDb(db);
  res.status(201).json({ document: copy });
});

app.post("/api/documents/:id/share", auth, (req, res) => {
  const db = readDb();
  const doc = db.documents.find((item) => item.id === req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  if (doc.ownerId !== req.user.id) return res.status(403).json({ message: "Only the owner can share this document" });
  const role = ["Editor", "Viewer"].includes(req.body.role) ? req.body.role : "Viewer";
  const invited = db.users.find((item) => item.email.toLowerCase() === req.body.email?.toLowerCase());
  const memberUserId = invited?.id || `invite:${uuid()}`;
  doc.members = doc.members || [];
  const existing = doc.members.find((member) => member.userId === memberUserId);
  if (existing) existing.role = role;
  else doc.members.push({ userId: memberUserId, email: req.body.email, role });
  db.invites.push({ id: uuid(), documentId: doc.id, email: req.body.email, role, invitedBy: req.user.id, createdAt: new Date().toISOString() });
  writeDb(db);
  res.status(201).json({ invite: { email: req.body.email, role } });
});

app.get("/api/documents/:id/versions", auth, (req, res) => {
  const db = readDb();
  const doc = db.documents.find((item) => item.id === req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  if (!roleFor(db, doc.id, req.user.id)) return res.status(403).json({ message: "Access denied" });
  res.json({ versions: doc.versions || [] });
});

app.post("/api/documents/:id/restore/:versionId", auth, (req, res) => {
  const db = readDb();
  const doc = db.documents.find((item) => item.id === req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  const role = roleFor(db, doc.id, req.user.id);
  if (role !== "Owner" && role !== "Editor") return res.status(403).json({ message: "Edit permission required" });
  const version = doc.versions?.find((item) => item.id === req.params.versionId);
  if (!version) return res.status(404).json({ message: "Version not found" });
  doc.content = structuredClone(version.content);
  doc.updatedAt = new Date().toISOString();
  saveSnapshot(doc, req.user.name, "Restored previous version");
  writeDb(db);
  io.to(doc.id).emit("document:update", { content: doc.content, language: doc.language });
  res.json({ document: doc });
});

if (process.env.REDIS_URL) {
  try {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
  } catch (error) {
    console.warn("Redis unavailable; using in-memory adapter:", error.message);
  }
}

io.use((socket, next) => {
  try {
    socket.user = jwt.verify(socket.handshake.auth.token, jwtSecret);
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.on("document:join", ({ documentId }) => {
    const db = readDb();
    const doc = db.documents.find((item) => item.id === documentId);
    const role = doc ? roleFor(db, doc.id, socket.user.id) : null;
    if (!doc || !role) return socket.emit("error:message", "Document access denied");
    socket.join(documentId);
    socket.data.documentId = documentId;
    socket.data.role = role;
    socket.emit("document:state", { content: doc.content, language: doc.language, role });
    socket.to(documentId).emit("presence:join", { id: socket.user.id, name: socket.user.name });
  });

  socket.on("document:update", ({ documentId, content, language }) => {
    if (socket.data.documentId !== documentId) return;
    if (socket.data.role !== "Owner" && socket.data.role !== "Editor") return socket.emit("error:message", "Viewer cannot edit");
    const db = readDb();
    const doc = db.documents.find((item) => item.id === documentId);
    if (!doc) return;
    doc.content = content;
    if (language) doc.language = language;
    doc.updatedAt = new Date().toISOString();
    doc.changeCount = (doc.changeCount || 0) + 1;
    if (doc.changeCount >= 50) saveSnapshot(doc, socket.user.name, "50-change snapshot");
    writeDb(db);
    socket.to(documentId).volatile.emit("document:update", { content, language });
  });

  socket.on("cursor:update", ({ documentId, cursor }) => {
    socket.to(documentId).volatile.emit("cursor:update", { userId: socket.user.id, name: socket.user.name, cursor });
  });

  socket.on("chat:message", ({ documentId, text }) => {
    if (!text?.trim()) return;
    io.to(documentId).emit("chat:message", {
      id: uuid(), userId: socket.user.id, user: socket.user.name, text: text.trim(), time: new Date().toISOString(),
    });
  });

  socket.on("disconnect", () => {
    if (socket.data.documentId) socket.to(socket.data.documentId).emit("presence:leave", { id: socket.user.id, name: socket.user.name });
  });
});

setInterval(() => {
  const db = readDb();
  let changed = false;
  for (const doc of db.documents) {
    saveSnapshot(doc, "System", "30-second snapshot");
    changed = true;
  }
  if (changed) writeDb(db);
}, 30_000);

server.listen(port, () => console.log(`CollabDocs server listening on http://localhost:${port}`));
