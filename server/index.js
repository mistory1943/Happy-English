// 乐学英语 · 服务器入口
// 功能：用户名密码注册/登录、会话管理、学习记录存取、托管前端页面
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { getUserByUsername, createUser, getUserById, getState, saveState } from "./db.js";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

// ---------- 简易签名会话（cookie 里存 userId + 签名，180天有效，老人不用反复登录） ----------
function sign(val) {
  return val + "." + crypto.createHmac("sha256", SESSION_SECRET).update(val).digest("base64url");
}
function unsign(signed) {
  if (!signed) return null;
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const val = signed.slice(0, i);
  return sign(val) === signed ? val : null;
}
function setSession(res, userId) {
  res.cookie("sid", sign(String(userId)), {
    httpOnly: true, sameSite: "lax", maxAge: 180 * 24 * 3600 * 1000,
    secure: process.env.NODE_ENV === "production",
  });
}
function currentUser(req) {
  const id = unsign(req.cookies.sid);
  return id ? getUserById(Number(id)) : null;
}
function requireAuth(req, res, next) {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: "未登录" });
  req.user = u;
  next();
}

// ---------- 注册 / 登录 / 退出 ----------
app.post("/auth/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (username.length < 2 || username.length > 20) return res.status(400).json({ error: "用户名请用 2-20 个字，可以用中文名" });
  if (password.length < 6) return res.status(400).json({ error: "密码至少 6 位" });
  if (getUserByUsername(username)) return res.status(400).json({ error: "这个用户名已经有人用了，换一个试试" });
  const hash = await bcrypt.hash(password, 10);
  const user = createUser(username, hash);
  setSession(res, user.id);
  res.json({ ok: true, nickname: user.username });
});

app.post("/auth/login", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const user = getUserByUsername(username);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(400).json({ error: "用户名或密码不对，请再试一次" });
  }
  setSession(res, user.id);
  res.json({ ok: true, nickname: user.username });
});

app.post("/auth/logout", (req, res) => {
  res.clearCookie("sid");
  res.json({ ok: true });
});

// ---------- 用户与学习记录 API ----------
app.get("/api/me", (req, res) => {
  const u = currentUser(req);
  res.json(u ? { id: u.id, nickname: u.username } : null);
});

app.get("/api/state", requireAuth, (req, res) => {
  res.json(getState(req.user.id));
});

app.put("/api/state", requireAuth, (req, res) => {
  saveState(req.user.id, req.body);
  res.json({ ok: true });
});

// ---------- 托管前端 ----------
const dist = path.join(__dirname, "..", "web", "dist");
app.use(express.static(dist));
app.get(/.*/, (req, res) => res.sendFile(path.join(dist, "index.html")));

app.listen(PORT, () => {
  console.log(`乐学英语服务已启动: http://localhost:${PORT}`);
});
