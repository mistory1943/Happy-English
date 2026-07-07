// Cloudflare Worker backend for 乐学英语
// Keeps the original frontend API contract: /auth/*, /api/me, /api/state.

const DEFAULT_STATE = { day: 1, stage: 0, stageDay: 1, log: {}, wordLog: {}, history: {}, weakQueue: [] };
const encoder = new TextEncoder();

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function getCookie(req, name) {
  const cookie = req.headers.get("cookie") || "";
  return cookie.split(";").map((s) => s.trim()).find((s) => s.startsWith(name + "="))?.slice(name.length + 1) || "";
}

function base64url(buf) {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function sign(secret, value) {
  return `${value}.${await hmac(secret, value)}`;
}

async function unsign(secret, signed) {
  if (!signed || !signed.includes(".")) return null;
  const i = signed.lastIndexOf(".");
  const value = signed.slice(0, i);
  return (await sign(secret, value)) === signed ? value : null;
}

async function hashPassword(password, salt = crypto.randomUUID()) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256);
  return `${salt}:${base64url(bits)}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  return Boolean(salt && hash && (await hashPassword(password, salt)) === stored);
}

async function readJson(kv, key, fallback) {
  const text = await kv.get(key);
  return text ? JSON.parse(text) : fallback;
}

async function getUserByUsername(env, username) {
  const id = await env.HAPPY_ENGLISH_KV.get(`username:${username}`);
  return id ? env.HAPPY_ENGLISH_KV.get(`user:${id}`, "json") : null;
}

async function getUserById(env, id) {
  return env.HAPPY_ENGLISH_KV.get(`user:${id}`, "json");
}

async function nextUserId(env) {
  const current = Number((await env.HAPPY_ENGLISH_KV.get("meta:nextId")) || "1");
  await env.HAPPY_ENGLISH_KV.put("meta:nextId", String(current + 1));
  return current;
}

function sessionCookie(value, env) {
  return `sid=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${180 * 24 * 3600}; Secure`;
}

async function currentUser(req, env) {
  const id = await unsign(env.SESSION_SECRET, getCookie(req, "sid"));
  return id ? getUserById(env, id) : null;
}

async function recordLogin(env, user) {
  const now = new Date().toISOString();
  const next = {
    ...user,
    login_count: Number(user.login_count || 0) + 1,
    last_login_at: now,
    last_active_at: now,
  };
  await env.HAPPY_ENGLISH_KV.put(`user:${next.id}`, JSON.stringify(next));
  return next;
}

async function translateChineseToEnglish(text) {
  const q = String(text || "").trim().slice(0, 120);
  if (!q) return "";

  // Primary: MyMemory usually works from Cloudflare Worker edge.
  try {
    const r = await fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(q) + "&langpair=zh-CN|en");
    if (r.ok) {
      const data = await r.json();
      const translated = String(data?.responseData?.translatedText || "").trim();
      if (translated) return translated.replace(/\s+/g, " ");
    }
  } catch (e) {}

  // Fallback: public Google translate endpoint. Some edge locations may block it.
  const endpoint = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=" + encodeURIComponent(q);
  const r = await fetch(endpoint);
  if (!r.ok) throw new Error("translate failed");
  const data = await r.json();
  const translated = (data?.[0] || []).map((part) => part?.[0] || "").join("").trim();
  return translated.replace(/\s+/g, " ");
}

function summarizeState(state) {
  const history = state?.history || {};
  const studyByDate = state?.studyByDate || {};
  return {
    current_day: Number(state?.day || 1),
    completed_days: Object.keys(history).length,
    total_items_completed: Object.values(history).reduce((sum, n) => sum + Number(n || 0), 0),
    total_study_seconds: Number(state?.studySeconds || 0),
    study_days: Object.keys(studyByDate).length,
    last_study_date: Object.keys(studyByDate).sort().pop() || null,
  };
}

async function listAllUsers(env) {
  const users = [];
  let cursor;
  do {
    const page = await env.HAPPY_ENGLISH_KV.list({ prefix: "user:", cursor });
    cursor = page.cursor;
    for (const key of page.keys) {
      const user = await env.HAPPY_ENGLISH_KV.get(key.name, "json");
      if (!user) continue;
      const state = await readJson(env.HAPPY_ENGLISH_KV, `state:${user.id}`, DEFAULT_STATE);
      const summary = summarizeState(state);
      users.push({
        id: user.id,
        username: user.username,
        created_at: user.created_at || null,
        last_login_at: user.last_login_at || null,
        last_active_at: user.last_active_at || null,
        password_reset_at: user.password_reset_at || null,
        login_count: Number(user.login_count || 0),
        ...summary,
      });
    }
  } while (cursor);
  return users.sort((a, b) => String(a.username).localeCompare(String(b.username), "zh-Hans-CN"));
}

async function handle(req, env) {
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/api/admin/users") {
    const body = await req.json().catch(() => ({}));
    const adminCode = String(body.adminCode || "").trim();
    if (!env.ADMIN_CODE) return json({ error: "还没有设置管理员密码" }, 503);
    if (!adminCode || adminCode !== env.ADMIN_CODE) return json({ error: "管理员密码不对" }, 403);
    return json({ ok: true, users: await listAllUsers(env), generated_at: new Date().toISOString() });
  }

  if (req.method === "POST" && url.pathname === "/auth/register") {
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (username.length < 2 || username.length > 20) return json({ error: "用户名请用 2-20 个字，可以用中文名" }, 400);
    if (password.length < 6) return json({ error: "密码至少 6 位" }, 400);
    if (await getUserByUsername(env, username)) return json({ error: "这个用户名已经有人用了，换一个试试" }, 400);

    const id = await nextUserId(env);
    const user = await recordLogin(env, { id, username, password_hash: await hashPassword(password), created_at: new Date().toISOString() });
    await env.HAPPY_ENGLISH_KV.put(`username:${username}`, String(id));
    return json({ ok: true, nickname: user.username }, 200, { "set-cookie": sessionCookie(await sign(env.SESSION_SECRET, String(id)), env) });
  }

  if (req.method === "POST" && url.pathname === "/auth/login") {
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    let user = await getUserByUsername(env, username);
    if (!user || !(await verifyPassword(password, user.password_hash))) return json({ error: "用户名或密码不对，请再试一次" }, 400);
    user = await recordLogin(env, user);
    return json({ ok: true, nickname: user.username }, 200, { "set-cookie": sessionCookie(await sign(env.SESSION_SECRET, String(user.id)), env) });
  }

  if (req.method === "POST" && url.pathname === "/auth/reset-password") {
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "").trim();
    const recoveryCode = String(body.recoveryCode || "").trim();
    const newPassword = String(body.newPassword || "");
    if (!env.RECOVERY_CODE) return json({ error: "还没有设置家庭恢复码，请联系管理员" }, 503);
    if (!recoveryCode || recoveryCode !== env.RECOVERY_CODE) return json({ error: "恢复码不对，请问家人确认" }, 400);
    if (newPassword.length < 6) return json({ error: "新密码至少 6 位" }, 400);
    let user = await getUserByUsername(env, username);
    if (!user) return json({ error: "没有找到这个用户名" }, 404);

    user.password_hash = await hashPassword(newPassword);
    user.password_reset_at = new Date().toISOString();
    user = await recordLogin(env, user);
    return json({ ok: true, nickname: user.username }, 200, { "set-cookie": sessionCookie(await sign(env.SESSION_SECRET, String(user.id)), env) });
  }

  if (req.method === "POST" && url.pathname === "/auth/logout") {
    return json({ ok: true }, 200, { "set-cookie": "sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure" });
  }

  if (req.method === "GET" && url.pathname === "/api/me") {
    const user = await currentUser(req, env);
    return json(user ? { id: user.id, nickname: user.username } : null);
  }

  if (req.method === "POST" && url.pathname === "/api/translate") {
    const user = await currentUser(req, env);
    if (!user) return json({ error: "未登录" }, 401);
    const body = await req.json().catch(() => ({}));
    const zh = String(body.zh || "").trim();
    if (zh.length < 1) return json({ error: "请输入中文" }, 400);
    if (zh.length > 120) return json({ error: "一次最多输入 120 个字" }, 400);
    try {
      const en = await translateChineseToEnglish(zh);
      if (!en) return json({ error: "没有翻译出来，请换一句试试" }, 502);
      return json({ ok: true, zh, en });
    } catch (e) {
      return json({ error: "自动翻译暂时不可用，请稍后再试" }, 502);
    }
  }

  if (url.pathname === "/api/state") {
    const user = await currentUser(req, env);
    if (!user) return json({ error: "未登录" }, 401);
    if (req.method === "GET") return json(await readJson(env.HAPPY_ENGLISH_KV, `state:${user.id}`, DEFAULT_STATE));
    if (req.method === "PUT") {
      const nextState = await req.json().catch(() => ({}));
      await env.HAPPY_ENGLISH_KV.put(`state:${user.id}`, JSON.stringify(nextState));
      user.last_active_at = new Date().toISOString();
      await env.HAPPY_ENGLISH_KV.put(`user:${user.id}`, JSON.stringify(user));
      return json({ ok: true });
    }
  }

  return env.ASSETS.fetch(req);
}

export default {
  async fetch(req, env) {
    const runtimeEnv = { ...env, SESSION_SECRET: env.AUTH_SECRET || env.SESSION_SECRET || "dev-secret-change-me" };
    try {
      return await handle(req, runtimeEnv);
    } catch (e) {
      console.error(e && e.stack ? e.stack : e);
      return json({ error: "服务器临时错误，请稍后再试" }, 500);
    }
  },
};
