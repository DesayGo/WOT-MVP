const replayInput = document.getElementById("replayInput");
const fileHint = document.getElementById("fileHint");
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

replayInput.addEventListener("change", () => {
  const file = replayInput.files?.[0];
  if (!file) return;
  fileHint.textContent = file.name.endsWith(".wotreplay")
    ? `已加载录像：${file.name}`
    : "文件后缀不是 .wotreplay，请确认输入文件类型。";
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
    `装填窗口：估算敌方主炮装填 8-12 秒，建议在其开火后 2 秒内探头输出。`,
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

  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#334155";
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

  const dangerCount = Math.min(6, Math.max(2, Math.floor(enemy / 2) + td));
  const safePoints = map.includes("普罗")
    ? [
        [120, 400],
        [280, 360],
        [430, 300],
      ]
    : [
        [140, 420],
        [300, 300],
        [460, 220],
      ];

  for (let i = 0; i < dangerCount; i++) {
    const x = 70 + i * 75;
    const y = 120 + ((i % 3) * 80);
    drawDot(x, y, "#f87171");
  }

  safePoints.forEach(([x, y]) => drawDot(x, y, "#4ade80"));
}

function drawDot(x, y, color) {
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

analyzeBtn.click();
