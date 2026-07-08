// 数据存储：JSON 文件（零依赖、零配置，任何服务器都能跑）
// 数据量说明：适合几千用户以内的规模；用户多了以后可平滑迁移到 MySQL/PostgreSQL，
// 只需重写本文件里的几个函数，其余代码不用动。
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "..", "data.json");

let data = { users: [], states: {}, nextId: 1 };
if (fs.existsSync(DB_FILE)) {
  try { data = JSON.parse(fs.readFileSync(DB_FILE, "utf8")); } catch (e) { console.error("数据文件损坏，已从空库启动"); }
}

// 写入：先写临时文件再改名，防止断电/崩溃时数据损坏
let writing = false, pending = false;
function persist() {
  if (writing) { pending = true; return; }
  writing = true;
  const tmp = DB_FILE + ".tmp";
  fs.writeFile(tmp, JSON.stringify(data), (err) => {
    if (!err) fs.rename(tmp, DB_FILE, () => {});
    writing = false;
    if (pending) { pending = false; persist(); }
  });
}

const DEFAULT_STATE = { day: 1, startDate: null, stage: 0, stageDay: 1, log: {}, wordLog: {}, history: {}, weakQueue: [], studySeconds: 0, studyByDate: {}, customItems: [] };
const todayKey = () => new Date().toISOString().slice(0, 10);
const dateFromKey = (key) => new Date(`${key}T00:00:00Z`);
const daysBetween = (start, end) => Math.floor((dateFromKey(end) - dateFromKey(start)) / 86400000);
const isDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
function normalizeStudyState(raw, today = todayKey()) {
  const input = raw && typeof raw === "object" ? raw : {};
  const studyByDate = input.studyByDate && typeof input.studyByDate === "object" ? input.studyByDate : {};
  const firstStudyDate = Object.keys(studyByDate).filter(isDateKey).sort()[0];
  const startDate = isDateKey(input.startDate) ? input.startDate : (firstStudyDate || today);
  const safeStartDate = daysBetween(startDate, today) > 0 ? startDate : today;
  const derivedDay = Math.max(1, daysBetween(safeStartDate, today) + 1);
  const rawStageDay = Math.max(1, Number(input.stageDay || derivedDay));
  const stageDay = Math.min(rawStageDay, derivedDay);
  const stage = rawStageDay === derivedDay ? Math.max(0, Math.min(Number(input.stage || 0), 3)) : 0;
  return { ...DEFAULT_STATE, ...input, startDate: safeStartDate, day: derivedDay, stage, stageDay };
}

export function getUserByUsername(username) {
  return data.users.find((u) => u.username === username) || null;
}
export function getUserById(id) {
  return data.users.find((u) => u.id === id) || null;
}
export function createUser(username, passwordHash) {
  const user = { id: data.nextId++, username, password_hash: passwordHash, created_at: new Date().toISOString() };
  data.users.push(user);
  persist();
  return user;
}
export function getState(userId) {
  return normalizeStudyState(data.states[userId] ? JSON.parse(JSON.stringify(data.states[userId])) : DEFAULT_STATE);
}
export function saveState(userId, stateObj) {
  data.states[userId] = normalizeStudyState(stateObj);
  persist();
}
