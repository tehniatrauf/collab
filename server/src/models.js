// server/src/models.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: "" },
  resetToken: { type: String, default: null },
}, { timestamps: true });

const VersionSchema = new mongoose.Schema({
  id: String,
  version: Number,
  author: String,
  reason: String,
  createdAt: String,
  content: mongoose.Schema.Types.Mixed,
});

const DocumentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ["code", "whiteboard"], default: "code" },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ userId: String, email: String, role: { type: String, enum: ["Editor", "Viewer"] } }],
  content: mongoose.Schema.Types.Mixed,
  language: { type: String, default: "javascript" },
  changeCount: { type: Number, default: 0 },
  versions: [VersionSchema],
}, { timestamps: true });

const InviteSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
  email: String,
  role: String,
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export const User = mongoose.model("User", UserSchema);
export const Document = mongoose.model("Document", DocumentSchema);
export const Invite = mongoose.model("Invite", InviteSchema);