import { useState, useEffect, useRef } from "react";
import { fetchMe, fetchState, saveStateDebounced, startGuestMode, register as apiRegister, login as apiLogin, resetPassword as apiResetPassword, fetchAdminUsers, translateChinese, logout as apiLogout } from "./api.js";
import { AUDIO_MANIFEST } from "./audioManifest.js";

// ---------- 设计 ----------
const C = {
  paper: "#F2F5F0", card: "#FFFFFF", ink: "#26332C", inkSoft: "#5C6B62",
  jade: "#2F6B4F", jadeSoft: "#E3EEE7", persimmon: "#D6642C", persimmonSoft: "#FBEADF",
  line: "#DCE5DD", gold: "#B8860B", goldSoft: "#F7EED9",
};
const serif = "'Georgia','Songti SC','SimSun',serif";
const sans = "-apple-system,'PingFang SC','Microsoft YaHei',sans-serif";

// ---------- 课程库 ----------
// 每课：核心单词（费曼式：简单意思 + 生活联想），再到句子
const LESSONS = [
  { title: "在市场", words: [
      { w: "much", zh: "多、多少", tip: "买东西先问多少钱——how MUCH，\u201c马取\u201d钱包来付钱" },
      { w: "bag", zh: "袋子", tip: "读音像\u201c白个\u201d——白色的一个袋子" },
      { w: "apple", zh: "苹果", tip: "读音像\u201c爱抛\u201d——爱吃的苹果抛给你" },
      { w: "take", zh: "收、拿", tip: "读音像\u201c贴克\u201d——把钱\u201c贴\u201d给收银员，他\u201c拿\u201d走" },
      { w: "thank", zh: "感谢", tip: "读音像\u201c三克\u201d——说三次感谢也不嫌多" },
    ],
    phrases: [
      { en: "How much is this?", zh: "这个多少钱？" },
      { en: "Can I have a bag, please?", zh: "请给我一个袋子。" },
      { en: "I would like two apples.", zh: "我想要两个苹果。" },
      { en: "Do you take credit cards?", zh: "你们收信用卡吗？" },
      { en: "Thank you, have a nice day!", zh: "谢谢，祝你今天愉快！" },
    ]},
  { title: "问路", words: [
      { w: "bank", zh: "银行", tip: "读音像\u201c办克\u201d——去银行\u201c办\u201d事" },
      { w: "far", zh: "远", tip: "读音像\u201c发\u201d——路太远，头发都白了" },
      { w: "turn", zh: "转弯", tip: "读音像\u201c疼\u201d——转弯太急会头疼" },
      { w: "left", zh: "左边", tip: "戴手表的多是左手——left" },
      { w: "map", zh: "地图", tip: "读音像\u201c麦普\u201d——地图铺开像麦田" },
    ],
    phrases: [
      { en: "Excuse me, where is the bank?", zh: "请问，银行在哪里？" },
      { en: "Is it far from here?", zh: "离这里远吗？" },
      { en: "Turn left at the corner.", zh: "在拐角处左转。" },
      { en: "Can you show me on the map?", zh: "您能在地图上指给我看吗？" },
      { en: "Thank you for your help.", zh: "谢谢您的帮助。" },
    ]},
  { title: "看医生", words: [
      { w: "headache", zh: "头疼", tip: "head是头，ache是疼——头+疼" },
      { w: "doctor", zh: "医生", tip: "读音像\u201c达克特\u201d——到医院\u201c达\u201d到\u201c特\u201d别照顾" },
      { w: "medicine", zh: "药", tip: "读音像\u201c麦德森\u201d——药像麦子一样养人" },
      { w: "better", zh: "更好", tip: "读音像\u201c贝特\u201d——吃了药，宝贝身体特别好" },
      { w: "need", zh: "需要", tip: "读音像\u201c尼德\u201d——你的需要" },
    ],
    phrases: [
      { en: "I have a headache.", zh: "我头疼。" },
      { en: "I need to see a doctor.", zh: "我需要看医生。" },
      { en: "How often do I take this medicine?", zh: "这个药多久吃一次？" },
      { en: "I feel much better now.", zh: "我现在感觉好多了。" },
      { en: "Do I need to come back?", zh: "我需要再来复诊吗？" },
    ]},
  { title: "在餐厅", words: [
      { w: "table", zh: "桌子", tip: "读音像\u201c贴宝\u201d——桌上贴着宝贝菜单" },
      { w: "menu", zh: "菜单", tip: "读音像\u201c妙纽\u201d——菜单上道道是妙菜" },
      { w: "water", zh: "水", tip: "读音像\u201c沃特\u201d——沃土特别需要水" },
      { w: "delicious", zh: "美味的", tip: "读音像\u201c得力舍思\u201d——好吃得舍不得放筷子" },
      { w: "check", zh: "账单、结账", tip: "读音像\u201c切克\u201d——结账前\u201c切\u201d记核对" },
    ],
    phrases: [
      { en: "A table for two, please.", zh: "请给我们一张两人桌。" },
      { en: "Can I see the menu?", zh: "我可以看看菜单吗？" },
      { en: "I would like some hot water.", zh: "我想要一些热水。" },
      { en: "The food is delicious.", zh: "这个菜很好吃。" },
      { en: "Check, please.", zh: "请结账。" },
    ]},
  { title: "坐公交", words: [
      { w: "bus", zh: "公交车", tip: "读音像\u201c巴士\u201d——就是巴士" },
      { w: "downtown", zh: "市中心", tip: "down往下+town城——顺坡下去就到城中心" },
      { w: "fare", zh: "车费", tip: "读音像\u201c费尔\u201d——车\u201c费\u201d" },
      { w: "seat", zh: "座位", tip: "读音像\u201c西特\u201d——西边那个特等座" },
      { w: "arrive", zh: "到达", tip: "读音像\u201c阿来夫\u201d——阿姨来了，到站了" },
    ],
    phrases: [
      { en: "Does this bus go downtown?", zh: "这辆公交车去市中心吗？" },
      { en: "Where should I get off?", zh: "我应该在哪里下车？" },
      { en: "How much is the fare?", zh: "车费是多少？" },
      { en: "Please tell me when we arrive.", zh: "到站时请告诉我。" },
      { en: "Is this seat taken?", zh: "这个座位有人吗？" },
    ]},
  { title: "和邻居聊天", words: [
      { w: "morning", zh: "早上", tip: "读音像\u201c摸宁\u201d——早上摸黑起床图安宁" },
      { w: "weather", zh: "天气", tip: "读音像\u201c威泽\u201d——天气威力大，恩泽也大" },
      { w: "grandson", zh: "孙子", tip: "grand大+son儿子——儿子的儿子" },
      { w: "tomorrow", zh: "明天", tip: "读音像\u201c特马肉\u201d——明天特意买马肉？开个玩笑好记" },
      { w: "today", zh: "今天", tip: "to到+day天——就是\u201c这一天\u201d" },
    ],
    phrases: [
      { en: "Good morning, how are you?", zh: "早上好，你好吗？" },
      { en: "The weather is nice today.", zh: "今天天气真好。" },
      { en: "This is my grandson.", zh: "这是我的孙子。" },
      { en: "We just moved here.", zh: "我们刚搬到这里。" },
      { en: "See you tomorrow!", zh: "明天见！" },
    ]},
  { title: "打电话", words: [
      { w: "speak", zh: "说话", tip: "读音像\u201c斯毕克\u201d——斯文地说" },
      { w: "slowly", zh: "慢慢地", tip: "slow慢+ly地——慢慢\u201c喽\u201d" },
      { w: "again", zh: "再一次", tip: "读音像\u201c额给恩\u201d——再给一次恩惠" },
      { w: "call", zh: "打电话", tip: "读音像\u201c扣\u201d——\u201c扣\u201d响电话键" },
      { w: "evening", zh: "晚上", tip: "读音像\u201c衣服宁\u201d——晚上换衣服图个安宁" },
    ],
    phrases: [
      { en: "Hello, may I speak to Mary?", zh: "你好，请问玛丽在吗？" },
      { en: "Please speak slowly.", zh: "请说慢一点。" },
      { en: "Can you say that again?", zh: "您能再说一遍吗？" },
      { en: "I will call you back later.", zh: "我稍后给你回电话。" },
      { en: "Have a good evening.", zh: "祝你晚上愉快。" },
    ]},
  { title: "在超市", words: [
      { w: "milk", zh: "牛奶", tip: "读音像\u201c谬克\u201d——每天一杯奶，身体不\u201c谬\u201d" },
      { w: "find", zh: "找到", tip: "读音像\u201c范德\u201d——找到姓范的师傅" },
      { w: "sale", zh: "打折、促销", tip: "读音像\u201c塞欧\u201d——打折时人多得塞不进去" },
      { w: "smaller", zh: "更小的", tip: "small小+er更——更小" },
      { w: "checkout", zh: "收银台", tip: "check结账+out出去——结完账就出去" },
    ],
    phrases: [
      { en: "Where can I find the milk?", zh: "牛奶在哪里？" },
      { en: "Is this on sale?", zh: "这个在打折吗？" },
      { en: "I am just looking, thank you.", zh: "我只是看看，谢谢。" },
      { en: "Do you have a smaller size?", zh: "有小一点的吗？" },
      { en: "Where is the checkout?", zh: "收银台在哪里？" },
    ]},
];

const WORD_IPA = {
  much: "/mʌtʃ/", bag: "/bæɡ/", apple: "/ˈæpəl/", take: "/teɪk/", thank: "/θæŋk/",
  bank: "/bæŋk/", far: "/fɑːr/", turn: "/tɜːrn/", left: "/left/", map: "/mæp/",
  headache: "/ˈhedeɪk/", doctor: "/ˈdɑːktər/", medicine: "/ˈmedɪsən/", better: "/ˈbetər/", need: "/niːd/",
  table: "/ˈteɪbəl/", menu: "/ˈmenjuː/", water: "/ˈwɔːtər/", delicious: "/dɪˈlɪʃəs/", check: "/tʃek/",
  bus: "/bʌs/", downtown: "/ˌdaʊnˈtaʊn/", fare: "/fer/", seat: "/siːt/", arrive: "/əˈraɪv/",
  morning: "/ˈmɔːrnɪŋ/", weather: "/ˈweðər/", grandson: "/ˈɡrænsʌn/", tomorrow: "/təˈmɑːroʊ/", today: "/təˈdeɪ/",
  speak: "/spiːk/", slowly: "/ˈsloʊli/", again: "/əˈɡen/", call: "/kɔːl/", evening: "/ˈiːvnɪŋ/",
  milk: "/mɪlk/", find: "/faɪnd/", sale: "/seɪl/", smaller: "/ˈsmɔːlər/", checkout: "/ˈtʃekaʊt/",
};
const WordIPA = ({ word, style = {} }) => WORD_IPA[word] ? (
  <div style={{ fontFamily: serif, fontSize: 22, color: C.persimmon, fontWeight: 700, marginTop: 4, letterSpacing: 0.2, ...style }}>{WORD_IPA[word]}</div>
) : null;

const SentenceIPA = ({ text, style = {} }) => {
  const words = cleanWords(text);
  if (!words.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8, ...style }}>
      {words.map((w, i) => (
        <div key={i} style={{ textAlign: "center" }}>
          <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700 }}>{w}</div>
          <WordIPA word={w} style={{ fontSize: 15, marginTop: 2 }} />
        </div>
      ))}
    </div>
  );
};

// ---------- 工具 ----------
const cleanWords = (s) => s.toLowerCase().replace(/[^a-z'\s]/g, "").split(/\s+/).filter(Boolean);
let lastSpeakAt = 0;
let currentPronunciationAudio = null;
let slowSpeechRunId = 0;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function fallbackSpeech(text, rate = 0.8) {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return;
    const u = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices ? synth.getVoices() : [];
    const enVoice = voices.find((v) => /en[-_]?US/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
    if (enVoice) u.voice = enVoice;
    u.lang = enVoice?.lang || "en-US";
    u.rate = rate;
    u.pitch = 1;
    u.volume = 1;
    if (synth.paused) synth.resume();
    synth.cancel();
    synth.speak(u);
  } catch (e) {}
}
function speak(text, rate = 0.8) {
  slowSpeechRunId += 1;
  const src = AUDIO_MANIFEST[text] || `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(String(text || "").slice(0, 200))}`;
  if (src) {
    try {
      if (currentPronunciationAudio) {
        currentPronunciationAudio.pause();
        currentPronunciationAudio.currentTime = 0;
      }
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.playbackRate = rate <= 0.75 ? 0.92 : 1;
      currentPronunciationAudio = audio;
      const p = audio.play();
      if (p?.catch) p.catch(() => fallbackSpeech(text, rate));
      return;
    } catch (e) {
      fallbackSpeech(text, rate);
      return;
    }
  }
  fallbackSpeech(text, rate);
}
function playAudioOnce(src, rate = 0.92) {
  return new Promise((resolve) => {
    try {
      if (currentPronunciationAudio) {
        currentPronunciationAudio.pause();
        currentPronunciationAudio.currentTime = 0;
      }
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.playbackRate = rate;
      currentPronunciationAudio = audio;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      audio.onended = finish;
      audio.onerror = finish;
      const p = audio.play();
      if (p?.catch) p.catch(finish);
      setTimeout(finish, 3500);
    } catch {
      resolve();
    }
  });
}
async function speakWordsSlowly(text, gapMs = 900) {
  const words = cleanWords(text);
  if (!words.length) return speak(text, 0.5);
  const runId = slowSpeechRunId + 1;
  slowSpeechRunId = runId;
  for (const word of words) {
    if (runId !== slowSpeechRunId) return;
    const src = AUDIO_MANIFEST[word] || `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(word)}`;
    await playAudioOnce(src, 0.9);
    if (runId !== slowSpeechRunId) return;
    await wait(gapMs);
  }
}
function speakFromTap(event, text, rate = 0.8) {
  const now = Date.now();
  if (now - lastSpeakAt < 250) return;
  lastSpeakAt = now;
  speak(text, rate);
}
function speakSlowFromTap(event, text) {
  const now = Date.now();
  if (now - lastSpeakAt < 250) return;
  lastSpeakAt = now;
  speakWordsSlowly(text, 900);
}
function evaluateWords(targetEn, transcript) {
  const target = cleanWords(targetEn);
  const pool = cleanWords(transcript);
  return target.map((w) => {
    const i = pool.indexOf(w);
    if (i >= 0) { pool.splice(i, 1); return { word: w, ok: true }; }
    return { word: w, ok: false };
  });
}
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

const STAGES = ["学单词", "自己讲一遍", "学句子", "单词测验"];
const defaultState = { day: 1, stage: 0, stageDay: 1, log: {}, wordLog: {}, history: {}, weakQueue: [], studySeconds: 0, studyByDate: {}, customItems: [] };
const todayKey = () => new Date().toISOString().slice(0, 10);
const formatDateTime = (s) => s ? new Date(s).toLocaleString("zh-CN", { hour12: false }) : "—";
const formatMinutes = (seconds) => `${Math.round(Number(seconds || 0) / 60)} 分钟`;
const polishEnglish = (en, zh = "") => {
  let s = String(en || "").trim().replace(/\s+/g, " ");
  if (!s) return s;
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (/[吗呢么？?]|哪里|哪儿|什么|多少|怎么|如何|能不能|可以|是不是/.test(zh) && !/[?.!]$/.test(s)) s += "?";
  return s;
};

export default function App() {
  const [tab, setTab] = useState("today");
  const [state, setState] = useState(defaultState);
  const [loaded, setLoaded] = useState(false);
  const [showMethod, setShowMethod] = useState(false);
  const [recordingId, setRecordingId] = useState(null);
  const [pronResults, setPronResults] = useState({});
  const [micMsg, setMicMsg] = useState(null);
  const [useFallback, setUseFallback] = useState(true); // 默认使用「录音对比」模式
  const [clips, setClips] = useState({});
  const [revealed, setRevealed] = useState({});   // 自我检验：已翻开的卡
  const [selfMarked, setSelfMarked] = useState({}); // 自我检验：记住了/没记住
  const [wordTest, setWordTest] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const recRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const stateRef = useRef(defaultState);

  const [me, setMe] = useState(null);            // 已登录用户 { id, nickname }
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("login"); // login | register | reset
  const [authMsg, setAuthMsg] = useState(null);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminMsg, setAdminMsg] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [customZh, setCustomZh] = useState("");
  const [customMsg, setCustomMsg] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);

  const resetDayUI = () => {
    setQuiz(null); setWordTest(null); setPronResults({}); setRevealed({}); setSelfMarked({}); setClips({}); setMicMsg(null);
  };

  const day = state.day;

  // 打开网页时：检查是否已登录（180天内免登录），已登录则拉取学习记录
  useEffect(() => {
    if (window.location.pathname === "/admin") { setLoaded(true); return; }
    (async () => {
      try {
        const u = await fetchMe();
        if (u) {
          setMe(u);
          setState((await fetchState()) || defaultState);
        }
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    const handler = (event) => {
      const el = event.target.closest?.("[data-speak-text]");
      if (!el) return;
      speakFromTap(event, el.dataset.speakText, Number(el.dataset.speakRate || 0.8));
    };
    document.addEventListener("pointerdown", handler, true);
    document.addEventListener("touchstart", handler, true);
    return () => {
      document.removeEventListener("pointerdown", handler, true);
      document.removeEventListener("touchstart", handler, true);
    };
  }, []);

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    if (!me || me.id === "guest" || window.location.pathname === "/admin") return;
    const tickSeconds = 60;
    const timer = setInterval(() => {
      if (document.hidden) return;
      const current = stateRef.current || defaultState;
      const key = todayKey();
      const next = {
        ...current,
        studySeconds: Number(current.studySeconds || 0) + tickSeconds,
        studyByDate: {
          ...(current.studyByDate || {}),
          [key]: Number(current.studyByDate?.[key] || 0) + tickSeconds,
        },
      };
      stateRef.current = next;
      setState(next);
      saveStateDebounced(next);
    }, tickSeconds * 1000);
    return () => clearInterval(timer);
  }, [me]);

  const loadAdminUsers = async () => {
    setAdminMsg(null);
    setAdminLoading(true);
    const r = await fetchAdminUsers(adminCode);
    setAdminLoading(false);
    if (!r.ok) { setAdminMsg(r.error || "读取失败，请再试一次"); return; }
    setAdminUsers(r.users || []);
    setAdminMsg(`已更新：${formatDateTime(r.generated_at)}`);
  };

  const submitAuth = async () => {
    setAuthMsg(null);
    const cleanUsername = username.trim();
    const fn = authMode === "register" ? apiRegister : apiLogin;
    const r = authMode === "reset"
      ? await apiResetPassword(cleanUsername, recoveryCode, password)
      : await fn(cleanUsername, password);
    if (!r.ok) { setAuthMsg(r.error || "出错了，请再试一次"); return; }
    resetDayUI();
    setState((await fetchState()) || defaultState);
    setMe({ nickname: r.nickname });
    setPassword("");
    setRecoveryCode("");
    setTab("today");
  };

  const logout = async () => {
    await apiLogout();
    setMe(null); setUsername(""); setPassword(""); setState(defaultState);
  };

  const startGuest = async () => {
    const guest = startGuestMode("本机学习");
    setMe(guest);
    setState((await fetchState()) || defaultState);
    setTab("today");
  };

  const save = (next) => {
    setState(next);
    saveStateDebounced(next); // 自动保存到服务器
  };

  const addCustomLearning = async () => {
    const zh = customZh.trim();
    if (!zh) { setCustomMsg("请先输入中文"); return; }
    setCustomMsg(null);
    setCustomLoading(true);
    const r = await translateChinese(zh);
    setCustomLoading(false);
    if (!r.ok) { setCustomMsg(r.error || "自动翻译失败，请换一句试试"); return; }
    const en = polishEnglish(r.en, zh);
    if (!en) { setCustomMsg("没有翻译出来，请换一句试试"); return; }
    const isWord = cleanWords(en).length === 1 && zh.length <= 6;
    const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const item = isWord
      ? { id, type: "word", w: en.toLowerCase(), zh, tip: "这是您自己添加的学习内容。", createdDay: day }
      : { id, type: "phrase", en, zh, createdDay: day };
    const next = { ...state, customItems: [...(state.customItems || []), item], stage: isWord ? 0 : 2, stageDay: day };
    save(next);
    setCustomZh("");
    setCustomMsg(`已加入今天任务：${zh} → ${en}`);
  };

  // ---------- 今天 ----------
  const [viewDay, setViewDay] = useState(null); // 复习过去某天的内容，null 表示今天
  const viewDayNum = viewDay === null ? day : viewDay;
  const stage = viewDay === null ? state.stageDay === day ? state.stage : 0 : Math.max(0, Math.min(state.stage || 0, 3));
  const lessonIdx = Math.min(((viewDayNum - 1) - Math.floor((viewDayNum - 1) / 3)) % LESSONS.length, LESSONS.length - 1);
  const lesson = LESSONS[lessonIdx];
  const isReviewDay = viewDayNum % 3 === 0 && Object.keys(state.log).length >= 3;
  const customItems = state.customItems || [];
  const customWords = customItems
    .filter((item) => item.type === "word" && item.w && state.wordLog[item.w]?.status !== "已掌握")
    .map((item) => ({ ...item, isCustom: true }));
  const customPhrases = customItems
    .filter((item) => item.type === "phrase" && item.en && state.log[item.id]?.status !== "已掌握")
    .map((item) => ({ ...item, isCustom: true }));

  // 之前没记住的单词，最多3个，加入今天的单词任务
  const weakWords = Object.entries(state.wordLog).filter(([, e]) => e.status === "需加强").slice(0, 3)
    .map(([w, e]) => ({ w, zh: e.zh, tip: e.tip, isWeak: true }));
  const weakPhrases = state.weakQueue.slice(0, 2).map((id) => ({ id, ...state.log[id], isWeak: true })).filter((p) => p.en);
  const viewWords = viewDay === null
    ? (isReviewDay ? customWords : [...weakWords.filter((x) => !lesson.words.some((lw) => lw.w === x.w)), ...lesson.words, ...customWords.filter((x) => !lesson.words.some((lw) => lw.w === x.w))])
    : lesson.words;
  const viewPhrases = viewDay === null
    ? (isReviewDay ? customPhrases : [...weakPhrases, ...lesson.phrases.map((p, i) => ({ ...p, id: `l${lessonIdx}p${i}` })), ...customPhrases])
    : lesson.phrases.map((p, i) => ({ ...p, id: `l${lessonIdx}p${i}` }));
  const isReviewMode = viewDay !== null;
  const viewWordsAll = viewDay === null
    ? [...weakWords.filter((x) => !viewWords.some((vw) => vw.w === x.w)), ...viewWords]
    : viewWords;
  const viewPhrasesAll = viewDay === null ? [...weakPhrases, ...viewPhrases] : viewPhrases;

  const wordDone = (w) => state.wordLog[w]?.lastDay === viewDayNum;
  const wordsLearned = viewWordsAll.filter((x) => wordDone(x.w)).length;
  const phrasesLearned = viewPhrasesAll.filter((p) => state.log[p.id]?.lastDay === viewDayNum).length;

  const setStage = (s) => { if (isReviewMode) return; save({ ...state, stage: s, stageDay: day }); };

  // ---------- 动作 ----------
  const markWord = (x) => {
    const entry = state.wordLog[x.w] || { zh: x.zh, tip: x.tip, status: "学习中" };
    entry.lastDay = day;
    if (entry.status === "需加强") entry.status = "学习中";
    save({ ...state, wordLog: { ...state.wordLog, [x.w]: entry } });
  };

  const markPhrase = (p) => {
    const entry = state.log[p.id] || { en: p.en, zh: p.zh, status: "学习中", wordScores: {} };
    const isNew = entry.lastDay !== day;
    entry.lastDay = day;
    if (entry.status === "需加强") entry.status = "学习中";
    save({
      ...state,
      log: { ...state.log, [p.id]: entry },
      history: { ...state.history, [day]: (state.history[day] || 0) + (isNew ? 1 : 0) },
      weakQueue: state.weakQueue.filter((id) => id !== p.id),
    });
  };

  const saveResult = (id, targetEn, words, score) => {
    const next = { ...state };
    if (id.startsWith("w:")) {
      const w = id.slice(2);
      const entry = next.wordLog[w] || { zh: "", status: "学习中" };
      next.wordLog = { ...next.wordLog, [w]: { ...entry, pron: score >= 80 ? "好" : "需练习" } };
    } else {
      const entry = next.log[id] || { en: targetEn, zh: "", status: "学习中", wordScores: {} };
      (words || []).forEach((w) => { entry.wordScores[w.word] = w.ok ? "好" : "需练习"; });
      entry.pronScore = score;
      next.log = { ...next.log, [id]: entry };
    }
    save(next);
  };

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // 备用方案：录音回放（自动评分不可用时）
  const fallbackRecord = async (id) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      setClips((prev) => ({ ...prev, [id]: "nomic" }));
      setMicMsg("这个浏览器无法录音。没关系——点「🔊 标准发音」，跟着大声读几遍，然后自己评价。");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // iPhone Safari 用 audio/mp4，其他浏览器多用 audio/webm，自动选择
      let mr;
      try {
        const canCheck = typeof window.MediaRecorder.isTypeSupported === "function";
        const mime = canCheck && window.MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4"
          : canCheck && window.MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
        mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      } catch (e) {
        mr = new MediaRecorder(stream);
      }
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const url = URL.createObjectURL(new Blob(chunksRef.current, { type: mr.mimeType || "audio/mp4" }));
        setClips((prev) => ({ ...prev, [id]: url }));
        setRecordingId(null);
        setMicMsg(null);
      };
      mediaRef.current = mr;
      setRecordingId(id);
      setMicMsg("正在录音…请大声读出来，读完点「⏹ 说完点这里」。");
      mr.start();
    } catch (e) {
      setRecordingId(null);
      setClips((prev) => ({ ...prev, [id]: "nomic" }));
      setMicMsg("麦克风打不开（有些浏览器不允许网页录音）。没关系——点「🔊 标准发音」，跟着大声读几遍，然后自己评价。");
    }
  };

  const startRecording = async (id, targetEn) => {
    setMicMsg(null);
    // 正在录音时，点按钮 = 结束录音
    if (recordingId) {
      if (mediaRef.current && mediaRef.current.state === "recording") mediaRef.current.stop();
      else recRef.current?.stop();
      return;
    }
    if (!SR || useFallback) { fallbackRecord(id); return; }
    // 先申请麦克风权限，避免静默失败
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
    } catch (e) {
      setMicMsg("无法使用麦克风。请点浏览器地址栏附近的 🎤 或 🔒 图标，允许使用麦克风，然后再试一次。");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
    recRef.current = rec;
    let gotResult = false;
    rec.onresult = (e) => {
      gotResult = true;
      const words = evaluateWords(targetEn, e.results[0][0].transcript);
      const score = Math.round((words.filter((w) => w.ok).length / words.length) * 100);
      setPronResults((prev) => ({ ...prev, [id]: { words, score } }));
      saveResult(id, targetEn, words, score);
    };
    rec.onend = () => {
      setRecordingId(null);
      if (!gotResult) setMicMsg("没有听清。请再点一次 🎤，靠近手机，大声、慢慢地读出来。");
    };
    rec.onerror = (e) => {
      setRecordingId(null);
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
        setUseFallback(true);
        setMicMsg("这个浏览器不支持自动评分，已为您切换到「录音对比」模式：录下自己的声音，和标准发音对比后自己打分。请再点一次 🎤 开始。");
      } else if (e.error === "no-speech") {
        setMicMsg("没有听到声音。请靠近手机，大声读出来再试。");
      } else {
        setMicMsg("录音出了点问题，请再试一次。");
      }
    };
    try {
      rec.start();
      setRecordingId(id);
    } catch (e) {
      setMicMsg("录音出了点问题，请再试一次。");
    }
  };

  // 录音对比模式：自己打分
  const selfScore = (id, targetEn, good) => {
    const score = good ? 100 : 50;
    saveResult(id, targetEn, [], score);
    setPronResults((prev) => ({ ...prev, [id]: { words: [], score, selfRated: true } }));
  };

  // 自我检验：没记住 → 标记需加强
  const selfMark = (x, ok) => {
    setSelfMarked((prev) => ({ ...prev, [x.w]: ok }));
    if (!ok) {
      const entry = state.wordLog[x.w] || { zh: x.zh, tip: x.tip };
      save({ ...state, wordLog: { ...state.wordLog, [x.w]: { ...entry, status: "需加强" } } });
    }
  };

  // ---------- 单词测验（第4步） ----------
  const startWordTest = () => {
    const qs = shuffle(viewWordsAll).slice(0, 5).map((x) => {
      const others = shuffle(viewWordsAll.filter((o) => o.w !== x.w)).slice(0, 2).map((o) => o.w);
      const options = shuffle([x.w, ...others]);
      return { ...x, options, answer: options.indexOf(x.w) };
    });
    setWordTest({ qs, index: 0, picked: null, wrong: [], done: false });
  };
  const pickWordAnswer = (i) => {
    if (wordTest.picked !== null) return;
    const q = wordTest.qs[wordTest.index];
    setWordTest({ ...wordTest, picked: i, wrong: i !== q.answer ? [...wordTest.wrong, q] : wordTest.wrong });
  };
  const nextWordQ = () => {
    if (wordTest.index + 1 < wordTest.qs.length) {
      setWordTest({ ...wordTest, index: wordTest.index + 1, picked: null });
    } else {
      const wordLog = { ...state.wordLog };
      wordTest.wrong.forEach((q) => { wordLog[q.w] = { ...(wordLog[q.w] || { zh: q.zh, tip: q.tip }), status: "需加强" }; });
      wordTest.qs.filter((q) => !wordTest.wrong.includes(q)).forEach((q) => {
        if (wordLog[q.w]?.status !== "需加强") wordLog[q.w] = { ...(wordLog[q.w] || { zh: q.zh, tip: q.tip }), status: "已掌握" };
      });
      save({ ...state, wordLog });
      setWordTest({ ...wordTest, done: true });
    }
  };

  // ---------- 三天一测（句子） ----------
  const startQuiz = () => {
    const ids = shuffle(Object.keys(state.log)).slice(0, 5);
    const questions = ids.map((id) => {
      const correct = state.log[id];
      const others = shuffle(Object.keys(state.log).filter((x) => x !== id)).slice(0, 2).map((x) => state.log[x].en);
      const options = shuffle([correct.en, ...others]);
      return { id, zh: correct.zh, options, answer: options.indexOf(correct.en) };
    });
    setQuiz({ questions, index: 0, picked: null, wrongIds: [], done: false });
  };
  const pickAnswer = (i) => {
    if (quiz.picked !== null) return;
    const q = quiz.questions[quiz.index];
    setQuiz({ ...quiz, picked: i, wrongIds: i !== q.answer ? [...quiz.wrongIds, q.id] : quiz.wrongIds });
  };
  const nextQuestion = () => {
    if (quiz.index + 1 < quiz.questions.length) {
      setQuiz({ ...quiz, index: quiz.index + 1, picked: null });
    } else {
      const log = { ...state.log };
      quiz.wrongIds.forEach((id) => { log[id] = { ...log[id], status: "需加强" }; });
      quiz.questions.map((q) => q.id).filter((id) => !quiz.wrongIds.includes(id))
        .forEach((id) => { if (log[id].status !== "需加强") log[id] = { ...log[id], status: "已掌握" }; });
      save({
        ...state, log,
        weakQueue: [...new Set([...state.weakQueue, ...quiz.wrongIds])],
        history: { ...state.history, [day]: quiz.questions.length - quiz.wrongIds.length },
      });
      setQuiz({ ...quiz, done: true });
    }
  };

  const nextDay = () => {
    setQuiz(null); setWordTest(null); setPronResults({}); setRevealed({}); setSelfMarked({});
    save({ ...state, day: day + 1, stage: 0, stageDay: day + 1 });
  };

  if (!loaded) return <div style={{ fontFamily: sans, padding: 40, textAlign: "center", fontSize: 20 }}>加载中…</div>;

  if (window.location.pathname === "/admin") {
    const totalUsers = adminUsers.length;
    const activeUsers = adminUsers.filter((u) => u.last_active_at).length;
    const totalStudySeconds = adminUsers.reduce((sum, u) => sum + Number(u.total_study_seconds || 0), 0);
    return (
      <div style={{ fontFamily: sans, background: C.paper, minHeight: "100vh", color: C.ink, maxWidth: 980, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: serif, fontSize: 34, fontWeight: 700, color: C.jade }}>乐学英语 · 管理员</div>
            <div style={{ fontSize: 16, color: C.inkSoft, marginTop: 8 }}>查看用户名、登录次数、活跃时间和学习时长。不显示用户密码。</div>
          </div>
          <a href="/" style={{ color: C.jade, fontWeight: 700 }}>返回学习页面</a>
        </div>

        <div style={{ background: C.card, borderRadius: 20, padding: 18, marginTop: 20, border: `1px solid ${C.line}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10 }}>
            <input type="password" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} placeholder="输入管理员密码"
              onKeyDown={(e) => { if (e.key === "Enter" && adminCode.trim()) loadAdminUsers(); }}
              style={{ minHeight: 52, fontSize: 18, padding: "0 14px", borderRadius: 14, border: `2px solid ${C.line}`, fontFamily: sans }} />
            <button onClick={loadAdminUsers} disabled={!adminCode.trim() || adminLoading}
              style={{ minHeight: 52, padding: "0 18px", fontSize: 17, fontWeight: 700, borderRadius: 14, border: "none", background: adminCode.trim() ? C.jade : C.line, color: adminCode.trim() ? "#fff" : C.inkSoft, fontFamily: sans }}>
              {adminLoading ? "读取中…" : "查看用户"}
            </button>
          </div>
          {adminMsg && <div style={{ marginTop: 12, color: adminMsg.includes("失败") || adminMsg.includes("不对") ? C.persimmon : C.inkSoft, fontWeight: 700 }}>{adminMsg}</div>}
        </div>

        {adminUsers.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 16 }}>
              <div style={{ background: C.jadeSoft, borderRadius: 16, padding: 14 }}><b>{totalUsers}</b><br /><span style={{ color: C.inkSoft }}>注册用户</span></div>
              <div style={{ background: C.goldSoft, borderRadius: 16, padding: 14 }}><b>{activeUsers}</b><br /><span style={{ color: C.inkSoft }}>有活跃记录</span></div>
              <div style={{ background: C.persimmonSoft, borderRadius: 16, padding: 14 }}><b>{formatMinutes(totalStudySeconds)}</b><br /><span style={{ color: C.inkSoft }}>总学习时长</span></div>
            </div>

            <div style={{ overflowX: "auto", background: C.card, borderRadius: 20, border: `1px solid ${C.line}`, marginTop: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
                <thead>
                  <tr style={{ background: C.jadeSoft, color: C.jade, textAlign: "left" }}>
                    <th style={{ padding: 12 }}>用户名</th>
                    <th style={{ padding: 12 }}>登录次数</th>
                    <th style={{ padding: 12 }}>学习时长</th>
                    <th style={{ padding: 12 }}>学习天数</th>
                    <th style={{ padding: 12 }}>当前课程天</th>
                    <th style={{ padding: 12 }}>最后登录</th>
                    <th style={{ padding: 12 }}>最后学习</th>
                    <th style={{ padding: 12 }}>注册时间</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((u) => (
                    <tr key={u.id} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={{ padding: 12, fontWeight: 700 }}>{u.username}</td>
                      <td style={{ padding: 12 }}>{u.login_count || 0}</td>
                      <td style={{ padding: 12 }}>{formatMinutes(u.total_study_seconds)}</td>
                      <td style={{ padding: 12 }}>{u.study_days || 0}</td>
                      <td style={{ padding: 12 }}>第 {u.current_day || 1} 天</td>
                      <td style={{ padding: 12 }}>{formatDateTime(u.last_login_at)}</td>
                      <td style={{ padding: 12 }}>{formatDateTime(u.last_active_at)}</td>
                      <td style={{ padding: 12 }}>{formatDateTime(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ color: C.inkSoft, fontSize: 14, marginTop: 12, lineHeight: 1.6 }}>
              注：学习时长从本次更新后开始自动累计；之前的老账号会显示已有课程进度，但过去的实际学习时长无法补算。
            </div>
          </>
        )}
      </div>
    );
  }

  // ---------- 登录 / 注册页 ----------
  if (!me) {
    const isReg = authMode === "register";
    const isReset = authMode === "reset";
    const ok = username.trim().length >= 2 && password.length >= 6 && (!isReset || recoveryCode.trim().length > 0);
    return (
      <div style={{ fontFamily: sans, background: C.paper, minHeight: "100vh", color: C.ink, maxWidth: 480, margin: "0 auto", padding: 20 }}>
        <div style={{ textAlign: "center", paddingTop: 48 }}>
          <div style={{ fontFamily: serif, fontSize: 36, fontWeight: 700, color: C.jade }}>乐学英语</div>
          <div style={{ fontSize: 18, color: C.inkSoft, marginTop: 10, lineHeight: 1.6 }}>
            {isReset ? "忘记密码时，输入家庭恢复码，就可以设置新密码。" : isReg ? "注册一个账号，学习记录会保存，换手机也不丢。" : "欢迎回来！登录后接着上次的进度学。"}
          </div>
        </div>
        <div style={{ background: C.card, borderRadius: 20, padding: 20, marginTop: 28, border: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>用户名</div>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="可以用中文，比如：王阿姨"
            style={{ width: "100%", boxSizing: "border-box", minHeight: 56, fontSize: 20, marginTop: 8, padding: "0 14px", borderRadius: 14, border: `2px solid ${C.line}`, fontFamily: sans }} />
          {isReset && (
            <>
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 14 }}>家庭恢复码</div>
              <input type="password" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} placeholder="问家人要恢复码"
                style={{ width: "100%", boxSizing: "border-box", minHeight: 56, fontSize: 20, marginTop: 8, padding: "0 14px", borderRadius: 14, border: `2px solid ${C.line}`, fontFamily: sans }} />
            </>
          )}
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 14 }}>{isReset ? "新密码" : "密码"}{(isReg || isReset) && <span style={{ fontWeight: 400, fontSize: 14, color: C.inkSoft }}>（至少 6 位，建议记在本子上）</span>}</div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isReset ? "输入新密码" : "至少 6 位"}
            onKeyDown={(e) => { if (e.key === "Enter" && ok) submitAuth(); }}
            style={{ width: "100%", boxSizing: "border-box", minHeight: 56, fontSize: 20, marginTop: 8, padding: "0 14px", borderRadius: 14, border: `2px solid ${C.line}`, fontFamily: sans }} />
          {authMsg && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: C.persimmonSoft, borderRadius: 12, fontSize: 16, color: C.persimmon, fontWeight: 700 }}>
              {authMsg}
            </div>
          )}
          <button onClick={submitAuth} disabled={!ok}
            style={{ width: "100%", minHeight: 56, fontSize: 19, fontWeight: 700, marginTop: 14, borderRadius: 14, border: "none", background: ok ? C.jade : C.line, color: ok ? "#fff" : C.inkSoft, fontFamily: sans }}>
            {isReset ? "重设密码并登录 →" : isReg ? "注册并开始学习 →" : "登录 →"}
          </button>
          <button onClick={() => { setAuthMode(isReg ? "login" : "register"); setAuthMsg(null); setRecoveryCode(""); setPassword(""); }}
            style={{ width: "100%", minHeight: 48, fontSize: 16, marginTop: 10, borderRadius: 14, border: `2px solid ${C.jade}`, background: C.card, color: C.jade, fontWeight: 700, fontFamily: sans }}>
            {isReg ? "已有账号？去登录" : "第一次使用？注册新账号"}
          </button>
          <button onClick={() => { setAuthMode(isReset ? "login" : "reset"); setAuthMsg(null); setRecoveryCode(""); setPassword(""); }}
            style={{ width: "100%", minHeight: 48, fontSize: 16, marginTop: 10, borderRadius: 14, border: `2px solid ${C.gold}`, background: C.goldSoft, color: C.gold, fontWeight: 700, fontFamily: sans }}>
            {isReset ? "想起来了？返回登录" : "忘记密码？用家庭恢复码重设"}
          </button>
          <button onClick={startGuest}
            style={{ width: "100%", minHeight: 48, fontSize: 16, marginTop: 10, borderRadius: 14, border: `2px dashed ${C.inkSoft}`, background: C.paper, color: C.ink, fontWeight: 700, fontFamily: sans }}>
            手机打不开/网络慢？先直接学习（记录只存在这部手机）
          </button>
          <div style={{ fontSize: 14, color: C.inkSoft, marginTop: 12, lineHeight: 1.6 }}>
            {isReset ? "恢复码只给家里人保管。重设后会直接登录，学习记录还在。" : "登录一次后 180 天内不用再输密码。学习记录保存在服务器上，家里每个人注册自己的账号，进度互不影响。若临时网络不好，也可以用「直接学习」模式。"}
          </div>
        </div>
      </div>
    );
  }

  const btn = (bg, color, extra = {}) => ({ minHeight: 56, fontSize: 18, fontWeight: 700, borderRadius: 14, border: "none", background: bg, color, fontFamily: sans, ...extra });
  const logEntries = Object.entries(state.log);
  const wordEntries = Object.entries(state.wordLog);

  // 发音评估结果展示
  const PronBox = ({ pron }) => pron && (
    <div style={{ marginTop: 12, padding: 12, background: C.paper, borderRadius: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: pron.words?.length ? 8 : 0 }}>
        发音{pron.selfRated ? "（自我评价）" : "评估"}：{pron.score} 分{pron.score >= 80 ? "，说得真好！👍" : pron.score >= 50 ? "，不错，再练练！" : "，别灰心，多听几遍再试！"}
      </div>
      {pron.words?.length > 0 && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {pron.words.map((w, i) => (
              <span key={i} style={{ fontSize: 16, fontFamily: serif, padding: "4px 10px", borderRadius: 10, background: w.ok ? C.jadeSoft : C.persimmonSoft, color: w.ok ? C.jade : C.persimmon, fontWeight: 700 }}>
                {w.word} {w.ok ? "✓" : "✗"}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 14, color: C.inkSoft, marginTop: 8 }}>绿色 = 发音清楚 · 橙色 = 需要练习</div>
        </>
      )}
    </div>
  );

  // 录音对比模式：回放自己的声音 + 标准发音 + 自我打分（无麦克风时改为跟读自评）
  const ClipBox = ({ id, target }) => {
    const clip = clips[id];
    if (!clip) return null;
    const noRec = clip === "nomic";
    return (
      <div style={{ marginTop: 12, padding: 12, background: C.paper, borderRadius: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
          {noRec ? "跟着标准发音大声读 3 遍，然后自己评价：" : "先后听两个，自己比一比："}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!noRec && (
            <button onClick={() => { new Audio(clip).play().catch(() => setMicMsg("播放没成功，请再点一次「▶ 我的录音」。")); }}
              style={btn(C.persimmonSoft, C.persimmon, { flex: 1, minHeight: 48, fontSize: 16 })}>▶ 我的录音</button>
          )}
          <button data-speak-text={target} data-speak-rate="0.8" onPointerDown={(e) => speakFromTap(e, target)} onClick={(e) => speakFromTap(e, target)} onTouchEnd={(e) => speakFromTap(e, target)} style={btn(C.jadeSoft, C.jade, { flex: 1, minHeight: 48, fontSize: 16 })}>🔊 标准发音</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => selfScore(id, target, true)} style={btn(C.card, C.jade, { flex: 1, minHeight: 48, fontSize: 16, border: `2px solid ${C.jade}` })}>我读得清楚 😊</button>
          <button onClick={() => selfScore(id, target, false)} style={btn(C.card, C.persimmon, { flex: 1, minHeight: 48, fontSize: 16, border: `2px solid ${C.persimmon}` })}>还需练习 😅</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: sans, background: C.paper, minHeight: "100vh", color: C.ink, maxWidth: 480, margin: "0 auto", paddingBottom: 96 }}>

      {/* 顶部 */}
      <div style={{ padding: "24px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 700, color: C.jade }}>乐学英语</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <button onClick={() => setViewDay(isReviewMode ? null : Math.max(1, (viewDay === null ? day : viewDay) - 1))} disabled={isReviewMode ? false : (viewDay === null ? day : viewDay) <= 1} style={{ minHeight: 40, padding: "0 14px", borderRadius: 12, border: `2px solid ${C.line}`, background: C.card, color: C.ink, fontWeight: 700, fontSize: 18 }}>‹</button>
            <div style={{ fontSize: 17, color: C.inkSoft }}>
              第 {viewDayNum} 天 · {isReviewDay ? "复习测验日" : `今日课程：${lesson.title}`}{isReviewMode ? "（回顾模式）" : ""}
            </div>
            <button onClick={() => setViewDay(isReviewMode ? null : (viewDay === null ? day : viewDay) + 1)} disabled={isReviewMode || ((viewDay === null ? day : viewDay) + 1 > day)} style={{ minHeight: 40, padding: "0 14px", borderRadius: 12, border: `2px solid ${C.line}`, background: C.card, color: C.ink, fontWeight: 700, fontSize: 18 }}>›</button>
            {isReviewMode && <button onClick={() => setViewDay(null)} style={{ minHeight: 40, padding: "0 16px", borderRadius: 12, border: "none", background: C.jade, color: "#fff", fontWeight: 700, fontSize: 16 }}>回到今天</button>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <button onClick={logout} style={{ fontSize: 14, padding: "6px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.card, color: C.inkSoft }}>
            👤 {me.nickname} · 退出登录
          </button>
          {!isReviewMode && <button onClick={nextDay} style={{ fontSize: 14, padding: "6px 12px", borderRadius: 10, border: `2px dashed ${C.inkSoft}`, background: "transparent", color: C.inkSoft }}>
            演示：下一天 →
          </button>}
        </div>
      </div>

      {micMsg && (
        <div style={{ margin: "0 16px 12px", background: C.persimmonSoft, borderRadius: 14, padding: "12px 14px", fontSize: 16, color: C.persimmon, fontWeight: 700, lineHeight: 1.6 }}>
          {micMsg}
        </div>
      )}

      {tab === "today" && !isReviewDay && (
        <div style={{ padding: "0 16px" }}>

          {/* 费曼学习法说明 */}
          <button onClick={() => setShowMethod(!showMethod)} style={{ width: "100%", textAlign: "left", background: C.goldSoft, border: "none", borderRadius: 16, padding: "14px 16px", fontSize: 16, fontWeight: 700, color: C.gold }}>
            💡 我们的学习方法（费曼学习法）{showMethod ? "▲" : "▼"}
          </button>
          {showMethod && (
            <div style={{ background: C.card, borderRadius: 16, padding: 16, marginTop: 8, fontSize: 16, lineHeight: 1.8, color: C.inkSoft }}>
              诺贝尔奖得主费曼说：<b style={{ color: C.ink }}>能用自己的话讲明白，才是真学会。</b>所以我们每天分四步走：<br />
              ① <b style={{ color: C.ink }}>学单词</b>——用生活联想，把生词变熟词；<br />
              ② <b style={{ color: C.ink }}>自己讲一遍</b>——看中文，回忆英文，讲不出来就是没记牢；<br />
              ③ <b style={{ color: C.ink }}>学句子</b>——单词认识了，句子就容易了；<br />
              ④ <b style={{ color: C.ink }}>单词测验</b>——找出漏洞，明天重点补。
            </div>
          )}

          <div style={{ background: C.card, borderRadius: 18, padding: 16, marginTop: 14, border: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.jade }}>➕ 添加自己想学的内容</div>
            <div style={{ fontSize: 14, color: C.inkSoft, marginTop: 4, lineHeight: 1.5 }}>输入中文，系统会自动翻成英文，并加入今天的单词或句子任务。</div>
            <textarea value={customZh} onChange={(e) => setCustomZh(e.target.value)} placeholder="例如：我想要一杯热水 / 厕所在哪里 / 便宜一点"
              rows={3} style={{ width: "100%", boxSizing: "border-box", marginTop: 10, borderRadius: 14, border: `2px solid ${C.line}`, padding: 12, fontSize: 18, fontFamily: sans, resize: "vertical" }} />
            <button onClick={addCustomLearning} disabled={customLoading || !customZh.trim()}
              style={btn(customZh.trim() ? C.jade : C.line, customZh.trim() ? "#fff" : C.inkSoft, { width: "100%", marginTop: 10 })}>
              {customLoading ? "正在自动翻译…" : "加入今天学习任务 →"}
            </button>
            {customMsg && <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.5, color: customMsg.startsWith("已加入") ? C.jade : C.persimmon, fontWeight: 700 }}>{customMsg}</div>}
          </div>

          {/* 四步进度条：可点击跳转 */}
          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            {STAGES.map((s, i) => {
              const active = i === stage;
              const done = i < stage;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStage(i)}
                  disabled={isReviewMode}
                  aria-label={`跳到第${i + 1}步：${s}`}
                  aria-current={active ? "step" : undefined}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: 0,
                    minHeight: 58,
                    border: "none",
                    borderRadius: 10,
                    background: "transparent",
                    cursor: isReviewMode ? "default" : "pointer",
                    fontFamily: sans,
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <div style={{ height: 8, borderRadius: 4, background: done ? C.jade : active ? C.persimmon : C.line }} />
                  <div style={{ fontSize: 13, marginTop: 8, fontWeight: active ? 700 : 400, color: active ? C.persimmon : done ? C.jade : C.inkSoft }}>
                    {i + 1} {s}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ===== 第1步：学单词 ===== */}
          {stage === 0 && (
            <>
              <div style={{ background: C.jadeSoft, borderRadius: 16, padding: "12px 16px", fontSize: 16, color: C.jade, fontWeight: 700, marginTop: 14 }}>
                第1步：先认识今天的 {viewWordsAll.length} 个单词（{wordsLearned} 个已学会）
              </div>
              {viewWordsAll.map((x) => {
                const done = wordDone(x.w);
                return (
                  <div key={x.w} style={{ background: C.card, borderRadius: 20, padding: 20, marginTop: 14, border: `2px solid ${done ? C.jade : x.isWeak ? C.persimmon : C.line}` }}>
                    {x.isWeak && <div style={{ fontSize: 14, color: C.persimmon, fontWeight: 700, marginBottom: 6 }}>⟳ 上次没记住，再来一遍</div>}
                    {x.isCustom && <div style={{ fontSize: 14, color: C.jade, fontWeight: 700, marginBottom: 6 }}>★ 自己添加的单词</div>}
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                      <span style={{ fontFamily: serif, fontSize: 32, fontWeight: 700 }}>{x.w}</span>
                      <span style={{ fontSize: 20 }}>{x.zh}</span>
                    </div>
                    <WordIPA word={x.w} />
                    <div style={{ fontSize: 16, color: C.gold, marginTop: 8, lineHeight: 1.6 }}>💡 联想：{x.tip}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                      <button data-speak-text={x.w} data-speak-rate="0.7" onPointerDown={(e) => speakFromTap(e, x.w, 0.7)} onClick={(e) => speakFromTap(e, x.w, 0.7)} onTouchEnd={(e) => speakFromTap(e, x.w, 0.7)} style={btn(C.jadeSoft, C.jade, { flex: 1 })}>🔊 听发音</button>
                      <button onClick={() => markWord(x)} disabled={done} style={btn(done ? C.jade : C.card, done ? "#fff" : C.jade, { flex: 1, border: `2px solid ${C.jade}` })}>
                        {done ? "已记住 ✓" : "记住了"}
                      </button>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setStage(1)} disabled={wordsLearned < viewWordsAll.length}
                style={btn(wordsLearned < viewWordsAll.length ? C.line : C.jade, wordsLearned < viewWordsAll.length ? C.inkSoft : "#fff", { width: "100%", marginTop: 14 })}>
                {wordsLearned < viewWordsAll.length ? `还有 ${viewWordsAll.length - wordsLearned} 个单词没学` : "下一步：自己讲一遍 →"}
              </button>
            </>
          )}

          {/* ===== 第2步：自己讲一遍（费曼核心） ===== */}
          {stage === 1 && (
            <>
              <div style={{ background: C.goldSoft, borderRadius: 16, padding: "12px 16px", fontSize: 16, color: C.gold, fontWeight: 700, marginTop: 14 }}>
                第2步：看中文，先大声说出英文，再翻开对答案
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button onClick={() => setStage(0)} style={btn(C.card, C.jade, { flex: 1, border: `2px solid ${C.jade}` })}>← 返回：学单词</button>
              </div>
              {viewWordsAll.map((x) => {
                const open = revealed[x.w];
                const marked = selfMarked[x.w];
                return (
                  <div key={x.w} style={{ background: C.card, borderRadius: 20, padding: 20, marginTop: 14, border: `2px solid ${marked === true ? C.jade : marked === false ? C.persimmon : C.line}` }}>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{x.zh}</div>
                    {!open && (
                      <button onClick={() => setRevealed((p) => ({ ...p, [x.w]: true }))} style={btn(C.paper, C.ink, { width: "100%", marginTop: 12, border: `2px dashed ${C.inkSoft}` })}>
                        先自己说，再点这里看答案
                      </button>
                    )}
                    {open && (
                      <>
                        <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, marginTop: 10, color: C.jade }}>
                          {x.w} <button data-speak-text={x.w} data-speak-rate="0.7" onPointerDown={(e) => speakFromTap(e, x.w, 0.7)} onClick={(e) => speakFromTap(e, x.w, 0.7)} onTouchEnd={(e) => speakFromTap(e, x.w, 0.7)} style={{ fontSize: 18, border: "none", background: "transparent" }}>🔊</button>
                        </div>
                        <WordIPA word={x.w} style={{ fontSize: 20, marginTop: 2 }} />
                        {marked === undefined && (
                          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                            <button onClick={() => selfMark(x, true)} style={btn(C.jadeSoft, C.jade, { flex: 1 })}>我说对了 😊</button>
                            <button onClick={() => selfMark(x, false)} style={btn(C.persimmonSoft, C.persimmon, { flex: 1 })}>没记住 😅</button>
                          </div>
                        )}
                        {marked === false && <div style={{ fontSize: 15, color: C.persimmon, marginTop: 10, fontWeight: 700 }}>没关系！这个词明天会再出现，帮您加深记忆。</div>}
                        {marked === true && <div style={{ fontSize: 15, color: C.jade, marginTop: 10, fontWeight: 700 }}>真棒！</div>}
                      </>
                    )}
                  </div>
                );
              })}
              <button onClick={() => setStage(2)} disabled={Object.keys(selfMarked).length < viewWordsAll.length}
                style={btn(Object.keys(selfMarked).length < viewWordsAll.length ? C.line : C.jade, Object.keys(selfMarked).length < viewWordsAll.length ? C.inkSoft : "#fff", { width: "100%", marginTop: 14 })}>
                {Object.keys(selfMarked).length < viewWordsAll.length ? "每个词都检验一下再继续" : "下一步：学句子 →"}
              </button>
            </>
          )}

          {/* ===== 第3步：学句子 ===== */}
          {stage === 2 && (
            <>
              <div style={{ background: C.jadeSoft, borderRadius: 16, padding: "12px 16px", fontSize: 16, color: C.jade, fontWeight: 700, marginTop: 14 }}>
                第3步：单词认识了，把它们连成句子（{phrasesLearned}/{viewPhrasesAll.length} 句）
                {weakPhrases.length > 0 && `（含 ${weakPhrases.length} 句复习巩固）`}
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button onClick={() => setStage(1)} style={btn(C.card, C.ink, { flex: 1, border: `2px solid ${C.line}` })}>← 返回：巩固单词</button>
                <button onClick={() => setStage(0)} style={btn(C.card, C.jade, { flex: 1, border: `2px solid ${C.jade}` })}>← 返回：学单词</button>
              </div>
              <button onClick={() => { setUseFallback(!useFallback); setMicMsg(null); }}
                style={{ width: "100%", marginTop: 8, minHeight: 44, fontSize: 15, borderRadius: 12, border: `1px solid ${C.line}`, background: C.card, color: C.inkSoft }}>
                跟读方式：<b style={{ color: C.jade }}>{useFallback ? "录音对比（自己听、自己评）" : "自动评分（需 Chrome 浏览器）"}</b> · 点击切换
              </button>
              {viewPhrasesAll.map((p) => {
                const done = state.log[p.id]?.lastDay === viewDayNum;
                const pron = pronResults[p.id];
                const isRec = recordingId === p.id;
                // 把今天学过的单词标绿
                const parts = p.en.split(/(\s+)/).map((seg, i) => {
                  const bare = seg.toLowerCase().replace(/[^a-z']/g, "");
                  const hit = viewWordsAll.some((x) => x.w === bare);
                  return <span key={i} style={hit ? { color: C.jade, textDecoration: "underline" } : {}}>{seg}</span>;
                });
                return (
                  <div key={p.id} style={{ background: C.card, borderRadius: 20, padding: 20, marginTop: 14, border: `2px solid ${done ? C.jade : p.isWeak ? C.persimmon : C.line}` }}>
                    {p.isWeak && <div style={{ fontSize: 14, color: C.persimmon, fontWeight: 700, marginBottom: 6 }}>⟳ 复习巩固（上次测验答错）</div>}
                    {p.isCustom && <div style={{ fontSize: 14, color: C.jade, fontWeight: 700, marginBottom: 6 }}>★ 自己添加的句子</div>}
                    <div style={{ fontFamily: serif, fontSize: 24, lineHeight: 1.35, fontWeight: 700 }}>{parts}</div>
                    <SentenceIPA text={p.en} />
                    <div style={{ fontSize: 20, marginTop: 8 }}>{p.zh}</div>
                    <PronBox pron={pron} />
                    <ClipBox id={p.id} target={p.en} />
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                      <button data-speak-text={p.en} data-speak-rate="0.8" onPointerDown={(e) => speakFromTap(e, p.en, 0.8)} onClick={(e) => speakFromTap(e, p.en, 0.8)} onTouchEnd={(e) => speakFromTap(e, p.en, 0.8)} style={btn(C.jadeSoft, C.jade, { flex: 1 })}>🔊 常速</button>
                      <button onPointerDown={(e) => speakSlowFromTap(e, p.en)} onClick={(e) => speakSlowFromTap(e, p.en)} onTouchEnd={(e) => speakSlowFromTap(e, p.en)} style={btn(C.goldSoft, C.gold, { flex: 1 })}>🐢 慢读</button>
                      <button onClick={() => startRecording(p.id, p.en)} style={btn(isRec ? C.persimmon : C.persimmonSoft, isRec ? "#fff" : C.persimmon, { flex: 1 })}>
                        {isRec ? "⏹ 说完点这里" : "🎤 跟读录音"}
                      </button>
                    </div>
                    <button onClick={() => markPhrase(p)} disabled={done} style={btn(done ? C.jade : C.card, done ? "#fff" : C.jade, { width: "100%", marginTop: 10, border: `2px solid ${C.jade}` })}>
                      {done ? "已学会 ✓" : "我学会了"}
                    </button>
                  </div>
                );
              })}
              <button onClick={() => setStage(3)} disabled={phrasesLearned < viewPhrasesAll.length}
                style={btn(phrasesLearned < viewPhrasesAll.length ? C.line : C.jade, phrasesLearned < viewPhrasesAll.length ? C.inkSoft : "#fff", { width: "100%", marginTop: 14 })}>
                {phrasesLearned < viewPhrasesAll.length ? `还有 ${viewPhrasesAll.length - phrasesLearned} 句没学` : "最后一步：单词测验 →"}
              </button>
            </>
          )}

          {/* ===== 第4步：单词测验 ===== */}
          {stage === 3 && (
            <div style={{ background: C.card, borderRadius: 20, padding: 20, marginTop: 14, border: `2px solid ${C.gold}` }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <button onClick={() => setStage(2)} style={btn(C.card, C.ink, { border: `2px solid ${C.line}` })}>← 返回：学句子</button>
              </div>
              <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700 }}>📝 第4步：单词测验</div>
              {!wordTest && (
                <>
                  <div style={{ fontSize: 16, color: C.inkSoft, marginTop: 6 }}>句子学完了，我们回头测测今天的单词，找出漏洞。</div>
                  <button onClick={startWordTest} style={btn(C.jade, "#fff", { width: "100%", marginTop: 14 })}>开始测验</button>
                </>
              )}
              {wordTest && !wordTest.done && (() => {
                const q = wordTest.qs[wordTest.index];
                return (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 15, color: C.inkSoft }}>第 {wordTest.index + 1} 题 / 共 {wordTest.qs.length} 题</div>
                    <div style={{ fontSize: 21, fontWeight: 700, marginTop: 8 }}>「{q.zh}」是哪个单词？</div>
                    {q.options.map((opt, i) => {
                      let bg = C.paper, bd = C.line;
                      if (wordTest.picked !== null) {
                        if (i === q.answer) { bg = C.jadeSoft; bd = C.jade; }
                        else if (i === wordTest.picked) { bg = C.persimmonSoft; bd = C.persimmon; }
                      }
                      return (
                        <button key={i} onClick={() => pickWordAnswer(i)} style={{ display: "block", width: "100%", textAlign: "left", minHeight: 56, marginTop: 10, padding: "12px 16px", fontSize: 20, borderRadius: 14, border: `2px solid ${bd}`, background: bg, fontFamily: serif, fontWeight: 700 }}>
                          {opt}
                        </button>
                      );
                    })}
                    {wordTest.picked !== null && (
                      <button onClick={nextWordQ} style={btn(C.jade, "#fff", { width: "100%", marginTop: 12 })}>
                        {wordTest.index + 1 < wordTest.qs.length ? "下一题" : "完成"}
                      </button>
                    )}
                  </div>
                );
              })()}
              {wordTest?.done && (
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <div style={{ fontSize: 40 }}>🎉</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>今天的任务全部完成！</div>
                  <div style={{ fontSize: 16, color: C.inkSoft, marginTop: 6 }}>
                    答对 {wordTest.qs.length - wordTest.wrong.length} / {wordTest.qs.length} 题。
                    {wordTest.wrong.length > 0 ? "没答对的单词明天会重点复习。" : "全对！这些单词已标记为「已掌握」。"}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== 三天一测（复习日） ===== */}
      {tab === "today" && isReviewDay && (
        <div style={{ padding: "0 16px" }}>
          <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `2px solid ${C.gold}` }}>
            <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700 }}>📝 三天一测</div>
            <div style={{ fontSize: 17, color: C.inkSoft, marginTop: 8, lineHeight: 1.6 }}>
              今天复习前几天学过的句子。答错的会自动加入之后的每日任务。
            </div>
            {!quiz && <button onClick={startQuiz} style={btn(C.jade, "#fff", { width: "100%", marginTop: 16 })}>开始测验</button>}
            {quiz && !quiz.done && (() => {
              const q = quiz.questions[quiz.index];
              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 15, color: C.inkSoft }}>第 {quiz.index + 1} 题 / 共 {quiz.questions.length} 题</div>
                  <div style={{ fontSize: 21, fontWeight: 700, marginTop: 8 }}>「{q.zh}」用英语怎么说？</div>
                  {q.options.map((opt, i) => {
                    let bg = C.paper, bd = C.line;
                    if (quiz.picked !== null) {
                      if (i === q.answer) { bg = C.jadeSoft; bd = C.jade; }
                      else if (i === quiz.picked) { bg = C.persimmonSoft; bd = C.persimmon; }
                    }
                    return (
                      <button key={i} onClick={() => pickAnswer(i)} style={{ display: "block", width: "100%", textAlign: "left", minHeight: 56, marginTop: 10, padding: "12px 16px", fontSize: 18, borderRadius: 14, border: `2px solid ${bd}`, background: bg, fontFamily: serif }}>
                        {opt}
                      </button>
                    );
                  })}
                  {quiz.picked !== null && (
                    <button onClick={nextQuestion} style={btn(C.jade, "#fff", { width: "100%", marginTop: 12 })}>
                      {quiz.index + 1 < quiz.questions.length ? "下一题" : "完成测验"}
                    </button>
                  )}
                </div>
              );
            })()}
            {quiz?.done && (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <div style={{ fontSize: 40 }}>{quiz.wrongIds.length === 0 ? "🏆" : "💪"}</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>答对 {quiz.questions.length - quiz.wrongIds.length} / {quiz.questions.length} 题</div>
                <div style={{ fontSize: 16, color: C.inkSoft, marginTop: 6 }}>
                  {quiz.wrongIds.length === 0 ? "全对！已标记为「已掌握」。" : `${quiz.wrongIds.length} 句已加入之后的每日任务。`}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 学习记录 ===== */}
      {tab === "log" && (
        <div style={{ padding: "0 16px" }}>
          <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, padding: "6px 4px 12px" }}>学习记录</div>

          <div style={{ fontSize: 18, fontWeight: 700, margin: "4px 4px 8px" }}>单词（{wordEntries.length} 个）</div>
          {wordEntries.length === 0 && <div style={{ fontSize: 16, color: C.inkSoft, padding: "0 4px 12px" }}>还没有学过的单词。</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {wordEntries.map(([w, e]) => {
              const color = e.status === "已掌握" ? C.jade : e.status === "需加强" ? C.persimmon : C.gold;
              return (
                <button key={w} data-speak-text={w} data-speak-rate="0.7" onPointerDown={(ev) => speakFromTap(ev, w, 0.7)} onClick={(ev) => speakFromTap(ev, w, 0.7)} onTouchEnd={(ev) => speakFromTap(ev, w, 0.7)} style={{ fontSize: 16, fontFamily: serif, fontWeight: 700, padding: "8px 12px", borderRadius: 12, border: `2px solid ${color}`, background: C.card, color, textAlign: "left" }}>
                  <div>🔊 {w} <span style={{ fontFamily: sans, fontSize: 13 }}>{e.zh} · {e.status || "学习中"}</span></div>
                  <WordIPA word={w} style={{ fontSize: 16, marginTop: 2, color }} />
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 18, fontWeight: 700, margin: "4px 4px 8px" }}>句子（{logEntries.length} 句）</div>
          {logEntries.length === 0 && (
            <div style={{ background: C.card, borderRadius: 16, padding: 24, textAlign: "center", fontSize: 17, color: C.inkSoft }}>
              还没有学习记录。去「今天」页面开始学习吧！
            </div>
          )}
          {logEntries.map(([id, e]) => {
            const color = e.status === "已掌握" ? C.jade : e.status === "需加强" ? C.persimmon : C.gold;
            return (
              <div key={id} style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 10, border: `1px solid ${C.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: serif, fontSize: 19, fontWeight: 700 }}>{e.en}</div>
                    <div style={{ fontSize: 17, color: C.inkSoft, marginTop: 4 }}>{e.zh}</div>
                    {e.pronScore !== undefined && <div style={{ fontSize: 14, color: C.inkSoft, marginTop: 4 }}>最近发音得分：{e.pronScore} 分</div>}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, padding: "6px 12px", borderRadius: 10, background: `${color}18`, color, whiteSpace: "nowrap" }}>{e.status}</span>
                </div>
                <button data-speak-text={e.en} data-speak-rate="0.8" onPointerDown={(ev) => speakFromTap(ev, e.en)} onClick={(ev) => speakFromTap(ev, e.en)} onTouchEnd={(ev) => speakFromTap(ev, e.en)} style={{ marginTop: 10, minHeight: 44, fontSize: 15, fontWeight: 700, borderRadius: 12, border: "none", background: C.jadeSoft, color: C.jade, padding: "0 16px" }}>🔊 听发音</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== 进度 ===== */}
      {tab === "progress" && (
        <div style={{ padding: "0 16px" }}>
          <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, padding: "6px 4px 12px" }}>学习进度</div>
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { n: wordEntries.length, label: "学过的单词", color: C.jade },
              { n: logEntries.length, label: "学过的句子", color: C.jade },
              { n: wordEntries.filter(([, e]) => e.status === "需加强").length + logEntries.filter(([, e]) => e.status === "需加强").length, label: "需加强", color: C.persimmon },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: C.card, borderRadius: 16, padding: "16px 8px", textAlign: "center", border: `1px solid ${C.line}` }}>
                <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: s.color }}>{s.n}</div>
                <div style={{ fontSize: 14, color: C.inkSoft, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: C.card, borderRadius: 20, padding: 20, marginTop: 14, border: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>最近 7 天完成情况</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 130 }}>
              {Array.from({ length: 7 }, (_, i) => day - 6 + i).filter((d) => d >= 1).map((d) => {
                const v = state.history[d] || 0;
                return (
                  <div key={d} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 14, color: C.inkSoft, marginBottom: 4 }}>{v > 0 ? v : ""}</div>
                    <div style={{ height: Math.max(6, Math.min(v, 7) / 7 * 96), borderRadius: 8, background: d === day ? C.persimmon : C.jade, opacity: v === 0 ? 0.15 : 1 }} />
                    <div style={{ fontSize: 14, marginTop: 8, fontWeight: d === day ? 700 : 400, color: d === day ? C.persimmon : C.inkSoft }}>第{d}天</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ background: C.jadeSoft, borderRadius: 16, padding: 16, marginTop: 14, fontSize: 17, color: C.jade, fontWeight: 700, textAlign: "center" }}>
            活到老，学到老。坚持就是胜利！
          </div>
        </div>
      )}

      {/* 底部导航 */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: C.card, borderTop: `1px solid ${C.line}`, display: "flex" }}>
        {[
          { id: "today", icon: "📖", label: "今天" },
          { id: "log", icon: "📋", label: "学习记录" },
          { id: "progress", icon: "📊", label: "进度" },
        ].map((n) => (
          <button key={n.id} onClick={() => setTab(n.id)}
            style={{ flex: 1, minHeight: 64, border: "none", background: "transparent", fontSize: 15, fontWeight: 700, color: tab === n.id ? C.jade : C.inkSoft, borderTop: tab === n.id ? `3px solid ${C.jade}` : "3px solid transparent" }}>
            <span style={{ fontSize: 22, display: "block" }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}
