const replayInput = document.getElementById("replayInput");
const fileHint = document.getElementById("fileHint");
const mapDetectHint = document.getElementById("mapDetectHint");
const analyzeBtn = document.getElementById("analyzeBtn");

const mapSelect = document.getElementById("mapSelect");
const allyAlive = document.getElementById("allyAlive");
const enemyAlive = document.getElementById("enemyAlive");
const heavyCount = document.getElementById("heavyCount");
const mediumCount = document.getElementById("mediumCount");
const tdCount = document.getElementById("tdCount");

const timelineSlider = document.getElementById("timelineSlider");
const timelineLabel = document.getElementById("timelineLabel");

const awarenessList = document.getElementById("awarenessList");
const realtimeList = document.getElementById("realtimeList");
const duelList = document.getElementById("duelList");
const reviewList = document.getElementById("reviewList");
const timelineList = document.getElementById("timelineList");

const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");
const imageCache = new Map();

const MAP_CONFIG = {
  荒蛮之地: {
    aliases: ["荒蛮之地", "sand river", "sandriver", "desert"],
    image: "./maps/sand-river.svg",
    fallback: drawDesertFallback,
  },
  普罗霍洛夫卡: {
    aliases: ["普罗霍洛夫卡", "prokhorovka", "prohorovka", "04_prohorovka"],
    image: "./maps/prokhorovka.svg",
    fallback: drawFieldFallback,
  },
  锡默尔斯多夫: {
    aliases: ["锡默尔斯多夫", "himmelsdorf", "city"],
    image: "./maps/himmelsdorf.svg",
    fallback: drawCityFallback,
  },
  湖边的角逐: {
    aliases: ["湖边的角逐", "lakeville", "lake"],
    image: "./maps/lakeville.svg",
    fallback: drawLakeFallback,
  },
  "埃里-哈罗夫": {
    aliases: ["埃里-哈罗夫", "埃里哈罗夫", "erlenberg", "erle", "eirikharov"],
    image: "./maps/erlenberg.svg",
    fallback: drawRiverTownFallback,
  },
};

replayInput.addEventListener("change", async () => {
  const file = replayInput.files?.[0];
  if (!file) return;

  const isReplay = file.name.toLowerCase().endsWith(".wotreplay");
  fileHint.textContent = isReplay
    ? `已加载录像：${file.name}`
    : "文件后缀不是 .wotreplay，请确认输入文件类型。";

  if (!isReplay) {
    mapDetectHint.textContent = "自动识别未执行：文件后缀不正确。";
    return;
  }

  mapDetectHint.textContent = "正在从录像文件识别地图...";
  const result = await detectMapFromReplay(file);

  if (result.map) {
    mapSelect.value = result.map;
    mapDetectHint.textContent = `自动识别地图：${result.map}（来源：${result.source}）`;
    analyzeBtn.click();
  } else {
    mapDetectHint.textContent = "未识别到地图，请手动选择。";
  }
});

analyzeBtn.addEventListener("click", async () => {
  const stats = getStats();
  renderAwareness(stats);
  renderRealtime(stats);
  renderDuel(stats);
  renderReview(stats);
  renderTimeline(stats);
  await drawMap(stats);
});

mapSelect.addEventListener("change", () => analyzeBtn.click());
timelineSlider.addEventListener("input", () => {
  timelineLabel.textContent = formatTime(Number(timelineSlider.value));
  renderTimeline(getStats());
});

function getStats() {
  return {
    map: mapSelect.value,
    ally: Number(allyAlive.value),
    enemy: Number(enemyAlive.value),
    heavy: Number(heavyCount.value),
    medium: Number(mediumCount.value),
    td: Number(tdCount.value),
    timelineSec: Number(timelineSlider.value),
  };
}

function setList(el, items) {
  el.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    el.appendChild(li);
  });
}

function renderAwareness({ ally, enemy, heavy, medium, td }) {
  const fireDensity = heavy * 1.2 + td * 1.4 + medium * 0.9;
  const level = fireDensity >= 10 ? "高" : fireDensity >= 6 ? "中" : "低";

  setList(awarenessList, [
    `敌我存活：${ally} vs ${enemy}（${ally < enemy ? "劣势" : "可控"}）`,
    `敌方火力密度：${level}`,
    `威胁排序：${sortThreat(heavy, medium, td).join(" > ")}`,
    "小地图提示：优先确认敌方TD潜在狙击线。",
  ]);
}

function renderRealtime({ ally, enemy, heavy, td }) {
  const shouldHullDown = heavy >= 3 || td >= 2;
  const shouldRetreat = enemy - ally >= 3;

  setList(realtimeList, [
    `姿态建议：${shouldHullDown ? "优先卖头，减少车体外露" : "可尝试短时侧摆换炮"}`,
    `穿深风险：${td >= 2 ? "此角度高概率被穿，建议后撤半个车身" : "可接受，但避免停留超过 5 秒"}`,
    `转场建议：${shouldRetreat ? "向二线点位回撤并等待队友交叉火" : "可向中路支援点推进"}`,
  ]);
}

function renderDuel({ heavy, medium, td }) {
  const focus = heavy >= medium ? "重坦" : "中坦";
  const weakSpot =
    focus === "重坦" ? "炮塔环 / 下首" : "首下连接处 / 侧后部弹药架区域";

  setList(duelList, [
    `当前重点对线目标：敌方${focus}`,
    `弱点速查：${weakSpot}`,
    "装填窗口：估算敌方主炮装填 8-12 秒，建议在其开火后 2 秒内探头输出。",
    `高威胁补充：${td > 1 ? "TD可能在后场二线埋伏，勿长时间直线行驶。" : "保持蛇形机动，避免被预瞄。"}`,
  ]);
}

function renderReview({ ally, enemy }) {
  const diff = ally - enemy;
  const cause = diff < 0 ? "过度推进 + 掩体利用不足" : "开火时机可优化";

  setList(reviewList, [
    `死亡原因分类：${cause}`,
    "时间轴：02:10 首次暴露侧面；03:40 交叉火位失守；04:15 被集火击毁。",
    "更优分支：03:20 即可转场至次要掩体，避免双线受击。",
    "训练建议：每局复盘至少记录 1 次“可避免伤害”。",
  ]);
}

function renderTimeline({ timelineSec, map, ally, enemy, td }) {
  const phase = timelineSec < 90 ? "开局" : timelineSec < 240 ? "中期" : "残局";
  const pressure = enemy - ally >= 2 ? "高压" : "平衡";
  const mapAdvice =
    map === "普罗霍洛夫卡"
      ? "优先争夺中线草丛视野，避免无掩体横穿。"
      : map === "锡默尔斯多夫"
        ? "利用街角与废墟做短探，打完立即收车。"
        : map === "湖边的角逐"
          ? "城镇线和湖边线二选一，避免两线摇摆。"
          : map === "埃里-哈罗夫"
            ? "桥头与城堡线不要同时硬顶，优先保住交叉火。"
            : "沙河高低差明显，注意低洼地被夹击风险。";

  const timingAdvice =
    phase === "开局"
      ? "建议先抢侦察位与第一道掩体，不急于换血。"
      : phase === "中期"
        ? "根据击毁信息决定转场，优先补齐弱侧防线。"
        : "保血量优先，利用已点亮敌车信息打收割。";

  setList(timelineList, [
    `当前时间：${formatTime(timelineSec)}（${phase}）`,
    `局势压力：${pressure}；敌方TD活跃度：${td >= 2 ? "高" : "中低"}`,
    `该时段策略：${timingAdvice}`,
    `地图细化建议：${mapAdvice}`,
  ]);
}

function sortThreat(heavy, medium, td) {
  const data = [
    ["TD", td * 1.4],
    ["重坦", heavy * 1.2],
    ["中坦", medium],
  ];
  return data.sort((a, b) => b[1] - a[1]).map((x) => x[0]);
}

async function drawMap({ enemy, td, map }) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const profile = MAP_CONFIG[map] ?? MAP_CONFIG["荒蛮之地"];

  const hasRealImage = await drawMapImage(profile.image);
  if (!hasRealImage) {
    profile.fallback();
  }

  drawGrid("rgba(255,255,255,.18)");
  drawMapTitle(`${map}${hasRealImage ? "（俯视图）" : "（示意图）"}`);

  const dangerCount = Math.min(6, Math.max(2, Math.floor(enemy / 2) + td));
  const safePoints = map.includes("普罗")
    ? [
        [120, 400],
        [280, 360],
        [430, 300],
      ]
    : map.includes("锡默")
      ? [
          [140, 450],
          [240, 320],
          [390, 210],
        ]
      : map.includes("湖边")
        ? [
            [130, 460],
            [270, 420],
            [470, 360],
          ]
        : map.includes("埃里")
          ? [
              [150, 430],
              [290, 280],
              [460, 180],
            ]
          : [
              [140, 420],
              [300, 300],
              [460, 220],
            ];

  for (let i = 0; i < dangerCount; i++) {
    const x = 70 + i * 75;
    const y = 120 + ((i % 3) * 80);
    drawDot(x, y, "#f87171", "danger");
  }

  safePoints.forEach(([x, y]) => drawDot(x, y, "#4ade80", "safe"));
}

function drawDot(x, y, color, type) {
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.95;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.strokeStyle = type === "danger" ? "rgba(248,113,113,.4)" : "rgba(74,222,128,.4)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

async function detectMapFromReplay(file) {
  const fromFileName = detectMapFromText(file.name.toLowerCase());
  if (fromFileName) {
    return { map: fromFileName, source: "文件名" };
  }

  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const sample = bytes.slice(0, Math.min(bytes.length, 4 * 1024 * 1024));

    const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(sample).toLowerCase();
    const utf16 = new TextDecoder("utf-16le", { fatal: false }).decode(sample).toLowerCase();

    const byUtf8 = detectMapFromText(utf8);
    if (byUtf8) return { map: byUtf8, source: "录像内容(UTF-8片段)" };

    const byUtf16 = detectMapFromText(utf16);
    if (byUtf16) return { map: byUtf16, source: "录像内容(UTF-16片段)" };
  } catch {
    return { map: null, source: "读取失败" };
  }

  return { map: null, source: "未识别" };
}

function detectMapFromText(text) {
  if (!text) return null;
  const normalized = text.toLowerCase().replace(/[\s_\-]+/g, "");

  for (const [mapName, config] of Object.entries(MAP_CONFIG)) {
    if (
      config.aliases.some((alias) => {
        const key = alias.toLowerCase().replace(/[\s_\-]+/g, "");
        return normalized.includes(key);
      })
    ) {
      return mapName;
    }
  }

  return null;
}

function formatTime(totalSec) {
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function drawGrid(stroke = "#334155") {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 14; i++) {
    const p = i * 40;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 560);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(560, p);
    ctx.stroke();
  }
}

function drawMapTitle(name) {
  ctx.fillStyle = "rgba(226,232,240,.92)";
  ctx.font = 'bold 20px "Segoe UI", "PingFang SC", sans-serif';
  ctx.fillText(name, 16, 30);
}

function drawDesertFallback() {
  fillGradient("#3f2e23", "#5d452f");
}

function drawFieldFallback() {
  fillGradient("#284235", "#335f43");
}

function drawCityFallback() {
  fillGradient("#252a34", "#31384a");
}

function drawLakeFallback() {
  fillGradient("#234055", "#2f5b77");
}

function drawRiverTownFallback() {
  fillGradient("#32414a", "#485d68");
}

function fillGradient(from, to) {
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, from);
  grad.addColorStop(1, to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

async function drawMapImage(src) {
  const image = await loadImage(src);
  if (!image) return false;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return true;
}

function loadImage(src) {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src));
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      imageCache.set(src, image);
      resolve(image);
    };
    image.onerror = () => {
      imageCache.set(src, null);
      resolve(null);
    };
    image.src = src;
  });
}

timelineLabel.textContent = formatTime(Number(timelineSlider.value));
analyzeBtn.click();
