// server/src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "node:http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import mongoose from "mongoose";
import { User, Document, Invite } from "./models.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || "*", credentials: true } });
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || "development-secret-change-me";

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

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
  return { id: user._id, name: user.name, email: user.email, avatar: user.avatar || "" };
}

function saveSnapshot(doc, author = "System", reason = "Auto-save") {
  const previousVersion = doc.versions[0]?.version || 0;
  doc.versions.unshift({
    id: uuid(), version: previousVersion + 1, author, reason,
    createdAt: new Date().toISOString(), content: doc.content,
  });
  doc.versions = doc.versions.slice(0, 100);
  doc.changeCount = 0;
}

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required" });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: "Email already registered" });
  const user = await User.create({ name, email: email.toLowerCase(), password: await bcrypt.hash(password, 12) });
  const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, jwtSecret, { expiresIn: "7d" });
  res.status(201).json({ token, user: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });
  if (!user || !(await bcrypt.compare(password || "", user.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, jwtSecret, { expiresIn: "7d" });
  res.json({ token, user: publicUser(user) });
});

app.get("/api/auth/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user: publicUser(user) });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });
  if (user) { user.resetToken = uuid(); await user.save(); }
  res.json({ message: "If the account exists, reset instructions have been sent." });
});

app.put("/api/auth/profile", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  user.name = req.body.name?.trim() || user.name;
  user.avatar = req.body.avatar || user.avatar;
  await user.save();
  res.json({ user: publicUser(user) });
});

app.get("/api/documents", auth, async (req, res) => {
  const docs = await Document.find({ $or: [{ ownerId: req.user.id }, { "members.userId": req.user.id }] });
  const mapped = docs.map((doc) => ({
    id: doc._id, title: doc.title, type: doc.type, updatedAt: doc.updatedAt,
    role: doc.ownerId.toString() === req.user.id ? "Owner" : doc.members.find((m) => m.userId === req.user.id)?.role,
  }));
  res.json({ documents: mapped });
});

app.post("/api/documents", auth, async (req, res) => {
  const doc = new Document({
    title: req.body.title?.trim() || "Untitled Document",
    type: req.body.type === "whiteboard" ? "whiteboard" : "code",
    ownerId: req.user.id,
    content: req.body.type === "whiteboard" ? [] : "// Start coding here...\n",
  });
  saveSnapshot(doc, req.user.name, "Initial version");
  await doc.save();
  res.status(201).json({ document: doc });
});

app.get("/api/documents/:id", auth, async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  const role = doc.ownerId.toString() === req.user.id ? "Owner" : doc.members.find((m) => m.userId === req.user.id)?.role;
  if (!role) return res.status(403).json({ message: "Access denied" });
  res.json({ document: doc, role });
});

app.patch("/api/documents/:id", auth, async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  const role = doc.ownerId.toString() === req.user.id ? "Owner" : doc.members.find((m) => m.userId === req.user.id)?.role;
  if (role !== "Owner" && role !== "Editor") return res.status(403).json({ message: "Edit permission required" });
  if (typeof req.body.title === "string") doc.title = req.body.title.trim() || doc.title;
  if (req.body.language) doc.language = req.body.language;
  await doc.save();
  res.json({ document: doc });
});

app.delete("/api/documents/:id", auth, async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  if (doc.ownerId.toString() !== req.user.id) return res.status(403).json({ message: "Only the owner can delete this document" });
  await Document.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

app.post("/api/documents/:id/duplicate", auth, async (req, res) => {
  const source = await Document.findById(req.params.id);
  if (!source) return res.status(404).json({ message: "Document not found" });
  const role = source.ownerId.toString() === req.user.id ? "Owner" : source.members.find((m) => m.userId === req.user.id)?.role;
  if (!role) return res.status(403).json({ message: "Access denied" });
  const copy = new Document({
    title: `${source.title} (Copy)`, type: source.type, ownerId: req.user.id,
    content: source.content, language: source.language, members: [],
  });
  saveSnapshot(copy, req.user.name, "Duplicated document");
  await copy.save();
  res.status(201).json({ document: copy });
});

app.post("/api/documents/:id/share", auth, async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  if (doc.ownerId.toString() !== req.user.id) return res.status(403).json({ message: "Only the owner can share this document" });
  const role = ["Editor", "Viewer"].includes(req.body.role) ? req.body.role : "Viewer";
  const invited = await User.findOne({ email: req.body.email?.toLowerCase() });
  const memberUserId = invited?._id.toString() || `invite:${uuid()}`;
  const existing = doc.members.find((m) => m.userId === memberUserId);
  if (existing) existing.role = role;
  else doc.members.push({ userId: memberUserId, email: req.body.email, role });
  await doc.save();
  await Invite.create({ documentId: doc._id, email: req.body.email, role, invitedBy: req.user.id });
  res.status(201).json({ invite: { email: req.body.email, role } });
});

app.get("/api/documents/:id/versions", auth, async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  res.json({ versions: doc.versions || [] });
});

app.post("/api/documents/:id/restore/:versionId", auth, async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  const version = doc.versions.find((v) => v.id === req.params.versionId);
  if (!version) return res.status(404).json({ message: "Version not found" });
  doc.content = version.content;
  saveSnapshot(doc, req.user.name, "Restored previous version");
  await doc.save();
  io.to(doc.id).emit("document:update", { content: doc.content, language: doc.language });
  res.json({ document: doc });
});

// Socket.io Logic (simplified for MongoDB)
io.use((socket, next) => {
  try {
    socket.user = jwt.verify(socket.handshake.auth.token, jwtSecret);
    next();
  } catch { next(new Error("Unauthorized")); }
});

io.on("connection", (socket) => {
  socket.on("document:join", async ({ documentId }) => {
    const doc = await Document.findById(documentId);
    const role = doc?.ownerId.toString() === socket.user.id ? "Owner" : doc?.members.find((m) => m.userId === socket.user.id)?.role;
    if (!doc || !role) return socket.emit("error:message", "Document access denied");
    socket.join(documentId);
    socket.data.documentId = documentId;
    socket.data.role = role;
    socket.emit("document:state", { content: doc.content, language: doc.language, role });
    socket.to(documentId).emit("presence:join", { id: socket.user.id, name: socket.user.name });
  });

  socket.on("document:update", async ({ documentId, content, language }) => {
    if (socket.data.documentId !== documentId) return;
    if (socket.data.role !== "Owner" && socket.data.role !== "Editor") return socket.emit("error:message", "Viewer cannot edit");
    const doc = await Document.findById(documentId);
    if (!doc) return;
    doc.content = content;
    if (language) doc.language = language;
    doc.changeCount += 1;
    if (doc.changeCount >= 50) saveSnapshot(doc, socket.user.name, "50-change snapshot");
    await doc.save();
    socket.to(documentId).volatile.emit("document:update", { content, language });
  });

  socket.on("cursor:update", ({ documentId, cursor }) => {
    socket.to(documentId).volatile.emit("cursor:update", { userId: socket.user.id, name: socket.user.name, cursor });
  });

  socket.on("chat:message", ({ documentId, text }) => {
    if (!text?.trim()) return;
    io.to(documentId).emit("chat:message", { id: uuid(), userId: socket.user.id, user: socket.user.name, text: text.trim(), time: new Date().toISOString() });
  });

  socket.on("disconnect", () => {
    if (socket.data.documentId) socket.to(socket.data.documentId).emit("presence:leave", { id: socket.user.id, name: socket.user.name });
  });
});
export default app;