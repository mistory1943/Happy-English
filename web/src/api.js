// 与服务器通信：注册、登录、学习记录
// Normal mode uses the same backend on every phone. Optional "本机学习" mode
// is only a fallback and stores progress on this one device.
const LOCAL_USER_KEY = "happyEnglish.guestUser";
const LOCAL_STATE_KEY = "happyEnglish.guestState";

export function isGuestMode() {
  return localStorage.getItem(LOCAL_USER_KEY) === "1";
}

export function startGuestMode(nickname = "本机学习") {
  localStorage.setItem(LOCAL_USER_KEY, "1");
  return { id: "guest", nickname };
}

export async function fetchMe() {
  if (isGuestMode()) return { id: "guest", nickname: "本机学习" };
  const r = await fetch("/api/me").catch(() => null);
  if (!r || !r.ok) return null;
  return r.json();
}

export async function fetchState() {
  if (isGuestMode()) {
    const saved = localStorage.getItem(LOCAL_STATE_KEY);
    return saved ? JSON.parse(saved) : null;
  }
  const r = await fetch("/api/state");
  if (!r.ok) throw new Error("未登录");
  return r.json();
}

let saveTimer = null;
export function saveStateDebounced(state) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (isGuestMode()) {
      localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
      return;
    }
    fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    }).catch(() => {});
  }, 600);
}

async function post(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!r) return { ok: false, error: "网络连接不上，可以先用“本机学习”模式。" };
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, ...data };
}

export const register = (username, password) => post("/auth/register", { username, password });
export const login = (username, password) => post("/auth/login", { username, password });
export const resetPassword = (username, recoveryCode, newPassword) => post("/auth/reset-password", { username, recoveryCode, newPassword });
export const fetchAdminUsers = (adminCode) => post("/api/admin/users", { adminCode });
export async function translateChinese(zh) {
  const server = await post("/api/translate", { zh });
  if (server.ok) return server;

  const text = String(zh || "").trim();
  try {
    const r = await fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=zh-CN|en");
    if (r.ok) {
      const data = await r.json();
      const en = String(data?.responseData?.translatedText || "").trim();
      if (en) return { ok: true, zh: text, en };
    }
  } catch (e) {}

  try {
    const r = await fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=" + encodeURIComponent(text));
    if (r.ok) {
      const data = await r.json();
      const en = (data?.[0] || []).map((part) => part?.[0] || "").join("").trim();
      if (en) return { ok: true, zh: text, en };
    }
  } catch (e) {}

  return server.ok === false ? server : { ok: false, error: "自动翻译暂时不可用，请稍后再试" };
}
export const logout = async () => {
  if (isGuestMode()) {
    localStorage.removeItem(LOCAL_USER_KEY);
    return { ok: true };
  }
  return post("/auth/logout", {});
};
