const DEFAULT_SUMMARY = "data/backtest_summary.csv";
const DEFAULT_CURVE = "data/equity_curve.csv";

const state = {
  summary: [],
  curve: [],
};

const formatPercent = (value) => `${(Number(value) * 100).toFixed(2)}%`;
const formatNumber = (value) => Number(value).toFixed(2);

function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, "").trim();
  if (!clean) return [];
  const lines = clean.split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function loadCsv(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`无法读取 ${path}`);
  return parseCsv(await response.text());
}

function metricValue(name) {
  const row = state.summary.find((item) => item["指标"] === name);
  return row ? Number(row["数值"]) : 0;
}

function renderMetrics() {
  const metrics = [
    { name: "策略累计收益", value: metricValue("策略累计收益"), type: "percent" },
    { name: "基准累计收益", value: metricValue("基准累计收益"), type: "percent" },
    { name: "策略最大回撤", value: metricValue("策略最大回撤"), type: "percent" },
    { name: "策略夏普比率", value: metricValue("策略夏普比率"), type: "number" },
    { name: "基准最大回撤", value: metricValue("基准最大回撤"), type: "percent" },
    { name: "策略年化波动率", value: metricValue("策略年化波动率"), type: "percent" },
    { name: "交易次数", value: metricValue("交易次数"), type: "count" },
    { name: "持仓时间占比", value: metricValue("持仓时间占比"), type: "percent" },
  ];

  const container = document.querySelector("#metrics");
  container.innerHTML = metrics
    .map((metric) => {
      const display =
        metric.type === "percent"
          ? formatPercent(metric.value)
          : metric.type === "count"
            ? String(Math.round(metric.value))
            : formatNumber(metric.value);
      const tone = metric.value > 0 ? "positive" : metric.value < 0 ? "negative" : "";
      return `
        <article class="metric-card ${tone}">
          <span>${metric.name}</span>
          <strong>${display}</strong>
          <small>${metric.type === "count" ? "回测期间触发换仓" : "由 CSV 数据自动计算渲染"}</small>
        </article>
      `;
    })
    .join("");
}

function renderChart() {
  const container = document.querySelector("#chart");
  const rows = state.curve
    .map((row) => ({
      date: row.date,
      strategy: Number(row.strategy_equity),
      benchmark: Number(row.benchmark_equity),
    }))
    .filter((row) => Number.isFinite(row.strategy) && Number.isFinite(row.benchmark));

  if (rows.length < 2) {
    container.innerHTML = "<p>净值数据不足，无法绘制曲线。</p>";
    return;
  }

  const width = 920;
  const height = 420;
  const pad = { top: 22, right: 26, bottom: 38, left: 56 };
  const values = rows.flatMap((row) => [row.strategy, row.benchmark]);
  const min = Math.min(...values) * 0.985;
  const max = Math.max(...values) * 1.015;
  const x = (index) => pad.left + (index / (rows.length - 1)) * (width - pad.left - pad.right);
  const y = (value) => pad.top + ((max - value) / (max - min)) * (height - pad.top - pad.bottom);

  const line = (key) => rows.map((row, index) => `${x(index).toFixed(2)},${y(row[key]).toFixed(2)}`).join(" ");
  const yTicks = Array.from({ length: 5 }, (_, index) => min + ((max - min) * index) / 4);
  const xTicks = [0, Math.floor(rows.length / 4), Math.floor(rows.length / 2), Math.floor((rows.length * 3) / 4), rows.length - 1];

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      ${yTicks
        .map(
          (tick) => `
            <line class="grid-line" x1="${pad.left}" x2="${width - pad.right}" y1="${y(tick)}" y2="${y(tick)}" />
            <text x="12" y="${y(tick) + 4}" fill="currentColor">${tick.toFixed(2)}</text>
          `,
        )
        .join("")}
      ${xTicks
        .map(
          (tick) => `
            <line class="grid-line" x1="${x(tick)}" x2="${x(tick)}" y1="${pad.top}" y2="${height - pad.bottom}" />
            <text x="${x(tick) - 34}" y="${height - 12}" fill="currentColor">${rows[tick].date}</text>
          `,
        )
        .join("")}
      <polyline points="${line("benchmark")}" fill="none" stroke="#f0a33a" stroke-width="3" opacity="0.88" />
      <polyline points="${line("strategy")}" fill="none" stroke="#30d17d" stroke-width="3.5" />
    </svg>
  `;
}

function setStatus(text) {
  document.querySelector("#dataStatus").textContent = text;
}

async function boot() {
  try {
    const [summary, curve] = await Promise.all([loadCsv(DEFAULT_SUMMARY), loadCsv(DEFAULT_CURVE)]);
    state.summary = summary;
    state.curve = curve;
    renderMetrics();
    renderChart();
    setStatus("已读取 data 目录中的回测 CSV，页面由数据自动渲染。");
  } catch (error) {
    setStatus(`读取默认数据失败：${error.message}。请使用右侧按钮上传 CSV。`);
  }
}

function bindUploads() {
  document.querySelector("#summaryUpload").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    state.summary = parseCsv(await file.text());
    renderMetrics();
    setStatus(`已加载指标文件：${file.name}`);
  });

  document.querySelector("#curveUpload").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    state.curve = parseCsv(await file.text());
    renderChart();
    setStatus(`已加载净值文件：${file.name}`);
  });
}

bindUploads();
boot();
