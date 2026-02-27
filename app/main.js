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

const awarenessList = document.getElementById("awarenessList");
const realtimeList = document.getElementById("realtimeList");
const duelList = document.getElementById("duelList");
const reviewList = document.getElementById("reviewList");

const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");

const MAP_CONFIG = {
  荒蛮之地: {
    aliases: ["荒蛮之地", "sand river", "sandriver", "desert"],
    drawBase() {
      fillGradient("#3f2e23", "#5d452f");
      drawGrid();
      drawPatch("#80634a", [
        [48, 90],
        [180, 70],
        [290, 150],
        [240, 230],
        [90, 210],
      ]);
      drawPatch("#6a4f39", [
        [300, 340],
        [420, 300],
        [530, 400],
        [490, 520],
        [340, 520],
      ]);
      drawRoute("#d8bf8d", [
        [70, 500],
        [200, 390],
        [310, 300],
        [430, 170],
        [520, 80],
      ]);
      drawMapTitle("荒蛮之地");
    },
  },
  普罗霍洛夫卡: {
    aliases: ["普罗霍洛夫卡", "prokhorovka", "prohorovka", "04_prohorovka"],
    drawBase() {
      fillGradient("#284235", "#335f43");
      drawGrid();
      drawRoute("#85b98f", [
        [45, 100],
        [120, 140],
        [220, 250],
        [360, 370],
        [520, 510],
      ], 56);
      drawRoute("#4c7e5b", [
        [60, 480],
        [210, 390],
        [310, 330],
        [480, 240],
      ], 36);
      drawRail([95, 500], [500, 95]);
      drawMapTitle("普罗霍洛夫卡");
    },
  },
  锡默尔斯多夫: {
    aliases: ["锡默尔斯多夫", "himmelsdorf", "city"],
    drawBase() {
      fillGradient("#252a34", "#31384a");
      drawGrid("#445069");
      drawCityBlocks();
      drawRoute("#62738e", [
        [70, 500],
        [100, 420],
        [170, 350],
        [230, 260],
        [320, 170],
        [430, 90],
      ], 30);
      drawMapTitle("锡默尔斯多夫");
    },
  },
  湖边的角逐: {
    aliases: ["湖边的角逐", "lakeville", "lake"],
    drawBase() {
      fillGradient("#234055", "#2f5b77");
      drawGrid();
      drawPatch("#2f7ea6", [
        [50, 60],
        [240, 50],
        [360, 140],
        [380, 260],
        [330, 360],
        [150, 340],
        [60, 260],
      ]);
      drawPatch("#4f8762", [
        [390, 250],
        [530, 210],
        [530, 530],
        [300, 530],
      ]);
      drawRoute("#9ecfb3", [
        [60, 430],
        [210, 430],
        [360, 420],
        [500, 390],
      ]);
      drawMapTitle("湖边的角逐");
    },
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

analyzeBtn.addEventListener("click", () => {
  const stats = {
    map: mapSelect.value,
    ally: Number(allyAlive.value),
    enemy: Number(enemyAlive.value),
    heavy: Number(heavyCount.value),
    medium: Number(mediumCount.value),
    td: Number(tdCount.value),
  };

  renderAwareness(stats);
  renderRealtime(stats);
  renderDuel(stats);
  renderReview(stats);
  drawMap(stats);
});

mapSelect.addEventListener("change", () => analyzeBtn.click());

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

function sortThreat(heavy, medium, td) {
  const data = [
    ["TD", td * 1.4],
    ["重坦", heavy * 1.2],
    ["中坦", medium],
  ];
  return data.sort((a, b) => b[1] - a[1]).map((x) => x[0]);
}

function drawMap({ enemy, td, map }) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const profile = MAP_CONFIG[map] ?? MAP_CONFIG["荒蛮之地"];
  profile.drawBase();

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
    const sample = bytes.slice(0, Math.min(bytes.length, 2 * 1024 * 1024));

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
  for (const [mapName, config] of Object.entries(MAP_CONFIG)) {
    if (config.aliases.some((alias) => text.includes(alias.toLowerCase()))) {
      return mapName;
    }
  }
  return null;
}

function fillGradient(from, to) {
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, from);
  grad.addColorStop(1, to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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

function drawPatch(color, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawRoute(color, points, width = 24) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.45;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawRail(start, end) {
  ctx.strokeStyle = "#d6d3d1";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(start[0], start[1]);
  ctx.lineTo(end[0], end[1]);
  ctx.stroke();

  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = start[0] + (end[0] - start[0]) * t;
    const y = start[1] + (end[1] - start[1]) * t;
    ctx.beginPath();
    ctx.strokeStyle = "#8b8a86";
    ctx.lineWidth = 2;
    ctx.moveTo(x - 8, y + 8);
    ctx.lineTo(x + 8, y - 8);
    ctx.stroke();
  }
}

function drawCityBlocks() {
  const blocks = [
    [60, 70],
    [160, 70],
    [260, 70],
    [360, 70],
    [80, 180],
    [200, 180],
    [320, 180],
    [440, 180],
    [70, 300],
    [190, 300],
    [310, 300],
    [430, 300],
    [90, 420],
    [220, 420],
    [360, 420],
  ];

  blocks.forEach(([x, y], idx) => {
    const w = 70 + (idx % 3) * 8;
    const h = 56 + (idx % 2) * 12;
    ctx.fillStyle = idx % 2 === 0 ? "#4c576f" : "#5d6780";
    ctx.fillRect(x, y, w, h);
  });
}

function drawMapTitle(name) {
  ctx.fillStyle = "rgba(226,232,240,.92)";
  ctx.font = 'bold 20px "Segoe UI", "PingFang SC", sans-serif';
  ctx.fillText(name, 16, 30);
}

analyzeBtn.click();
