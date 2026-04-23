document.addEventListener("DOMContentLoaded", () => {
  if (!window.FINANCE_DATA || !window.FINANCE_DATA.companies) {
    // 根因兜底：如果 data.js 未加载或加载顺序错误，明确抛错，避免页面默默空白
    throw new Error("FINANCE_DATA 不存在，请检查 data.js 引入顺序。");
  }

  const { companies, supportedYears, defaultSelection, defaultYear } = window.FINANCE_DATA;
  const companyKeys = Object.keys(companies);
  const params = new URLSearchParams(window.location.search);

  const leftCompanySelect = document.getElementById("leftCompany");
  const rightCompanySelect = document.getElementById("rightCompany");
  const yearSelect = document.getElementById("yearSelect");
  const primaryCode = document.getElementById("primaryCode");
  const titleText = document.getElementById("titleText");
  const metaText = document.getElementById("metaText");
  const incomeKpis = document.getElementById("incomeKpis");
  const balanceKpis = document.getElementById("balanceKpis");
  const cashKpis = document.getElementById("cashKpis");
  const leftAnalysisTitle = document.getElementById("leftAnalysisTitle");
  const rightAnalysisTitle = document.getElementById("rightAnalysisTitle");
  const leftAnalysisList = document.getElementById("leftAnalysisList");
  const rightAnalysisList = document.getElementById("rightAnalysisList");
  const compareSummary = document.getElementById("compareSummary");
  const liNingDiagnosis = document.getElementById("liNingDiagnosis");
  const aiSectionContainer = document.getElementById("aiSectionContainer");

  const gapCardRevenue = document.getElementById("gapCardRevenue");
  const gapCardGross = document.getElementById("gapCardGross");
  const gapCardNet = document.getElementById("gapCardNet");
  const gapCardCash = document.getElementById("gapCardCash");
  const trendSignalsGrid = document.getElementById("trendSignalsGrid");
  const trendSectionTitle = document.getElementById("trendSectionTitle");

  function parseCompaniesParam() {
    const raw = (params.get("companies") || "").trim();
    if (!raw) {
      return [...defaultSelection];
    }
    const parsed = raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((key) => key in companies);
    if (parsed.length === 0) {
      return [...defaultSelection];
    }
    if (parsed.length === 1) {
      const fallback = companyKeys.find((k) => k !== parsed[0]) || parsed[0];
      return [parsed[0], fallback];
    }
    return parsed.slice(0, 2);
  }

  function getLatestPublishedYear() {
    return Math.max(...supportedYears);
  }

  function parseYearParam() {
    const year = Number(params.get("year"));
    if (year === 2026) return getLatestPublishedYear();
    return supportedYears.includes(year) ? year : defaultYear;
  }

  const selection = {
    left: parseCompaniesParam()[0],
    right: parseCompaniesParam()[1],
    year: parseYearParam()
  };

  function fmt(value, digits = 1) {
    return Number(value).toFixed(digits);
  }

  function toFiniteNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function formatMetricValue(value, suffix = "", digits = 1) {
    const num = toFiniteNumber(value);
    if (num === null) return "—";
    return `${fmt(num, digits)}${suffix}`;
  }

  function splitLabelEnZh(full) {
    const idx = full.search(/[\u4e00-\u9fff]/);
    if (idx === -1) {
      return { en: full, zh: "" };
    }
    return { en: full.slice(0, idx).trim(), zh: full.slice(idx).trim() };
  }

  function renderMetricRow(label, leftValue, rightValue, options = {}) {
    const { suffix = "", digits = 1, diffNote = "" } = options;
    const { en, zh } = splitLabelEnZh(label);
    const labelLine = zh ? `${en} ${zh}` : en;
    const leftNum = toFiniteNumber(leftValue);
    const rightNum = toFiniteNumber(rightValue);
    const hasDiff = leftNum !== null && rightNum !== null;
    const diff = hasDiff ? leftNum - rightNum : null;
    const signed = hasDiff ? (diff >= 0 ? `+${fmt(diff, digits)}` : fmt(diff, digits)) : "—";
    const deltaText = diffNote ? `（差值 ${signed}${suffix}，${diffNote}）` : `（差值 ${signed}${suffix}）`;
    return `
      <div class="metric-row">
        <div class="metric-label">${labelLine}</div>
        <div class="metric-values">${formatMetricValue(leftValue, suffix, digits)} vs ${formatMetricValue(rightValue, suffix, digits)}</div>
        <div class="metric-delta">${deltaText}</div>
      </div>
    `;
  }

  function colorizeGrowthValue(value, digits = 1) {
    const num = Number(value);
    const t = fmt(value, digits);
    if (num > 0) {
      return `<span class="kpi-growth-pos">+${t}</span>`;
    }
    if (num < 0) {
      return `<span class="kpi-growth-neg">${t}</span>`;
    }
    return `<span class="kpi-growth-neu">${t}</span>`;
  }

  function kpiRowGrowthYoY(label, leftValue, rightValue, diff, suffix = "pct", digits = 1) {
    const { en, zh } = splitLabelEnZh(label);
    const labelLine = zh ? `${en} ${zh}` : en;
    const signed = diff >= 0 ? `+${fmt(diff, digits)}` : fmt(diff, digits);
    return `
      <div class="metric-row metric-row-growth">
        <div class="metric-label">${labelLine}</div>
        <div class="metric-values metric-values--html">
          ${colorizeGrowthValue(leftValue, digits)}${suffix} vs ${colorizeGrowthValue(rightValue, digits)}${suffix}
        </div>
        <div class="metric-delta">（差值 ${signed}${suffix}）</div>
      </div>
    `;
  }

  function safeYearData(companyKey, year) {
    const meta = companies[companyKey];
    if (!meta || !meta.years) return null;
    return meta.years[String(year)] || meta.years[year] || null;
  }

  function renderCompanyOptions() {
    const options = companyKeys
      .map((key) => {
        const c = companies[key];
        return `<option value="${key}">${c.nameCn}（${c.code}）</option>`;
      })
      .join("");
    leftCompanySelect.innerHTML = options;
    rightCompanySelect.innerHTML = options;
    leftCompanySelect.value = selection.left;
    rightCompanySelect.value = selection.right;
  }

  function renderYearOptions() {
    const base = supportedYears.map((year) => `<option value="${year}">${year}</option>`).join("");
    yearSelect.innerHTML = `${base}<option value="2026">2026</option>`;
    yearSelect.value = String(selection.year);
  }

  function showYearUnavailable() {
    const tip = document.getElementById("year-unavailable-tip");
    if (!tip) return;
    tip.style.display = "flex";
    tip.style.opacity = "1";
    setTimeout(() => {
      tip.style.opacity = "0";
      setTimeout(() => {
        tip.style.display = "none";
        tip.style.opacity = "1";
      }, 400);
    }, 3000);
  }

  function getCurrentYear() {
    return String(selection.year);
  }

  function renderAnalysisList(target, items) {
    target.innerHTML = (items || []).map((item) => `<li>${item}</li>`).join("");
  }

  function renderKPICard(label, leftVal, rightVal, unit) {
    const uCompact = unit === "pct" ? "pct" : "亿";
    const diff = rightVal - leftVal;
    const gapMain = Math.abs(diff) < 0.0001 ? `0.0` : fmt(diff, 1);
    const leftName = companies[selection.left].nameCn;
    const rightName = companies[selection.right].nameCn;
    return `
    <div class="kpi-label">${label}</div>
    <div class="kpi-value">${gapMain} ${uCompact}</div>
    <div class="kpi-sub">${leftName} ${fmt(leftVal, 1)}${uCompact} · ${rightName} ${fmt(rightVal, 1)}${uCompact}</div>`;
  }

  function trendMeta(values, higherIsBetter) {
    const yearsAsc = [...supportedYears].sort((a, b) => a - b);
    const yearRange = `${yearsAsc[0]}–${yearsAsc[yearsAsc.length - 1]}`;
    if (!values || values.length === 0) {
      return { arrow: "→", cssClass: "trend-flat", yearRange, liNingStart: "—", liNingEnd: "—" };
    }
    if (values.length < 2) {
      const v = fmt(values[0], 1);
      return { arrow: "→", cssClass: "trend-flat", yearRange, liNingStart: v, liNingEnd: v };
    }
    const liNingStart = fmt(values[0], 1);
    const liNingEnd = fmt(values[values.length - 1], 1);
    const d = values[values.length - 1] - values[0];
    if (Math.abs(d) < 0.05) {
      return { arrow: "→", cssClass: "trend-flat", yearRange, liNingStart, liNingEnd };
    }
    if (d > 0) {
      const cls = higherIsBetter ? "trend-up-good" : "trend-up-bad";
      return { arrow: "↑", cssClass: cls, yearRange, liNingStart, liNingEnd };
    }
    const cls = higherIsBetter ? "trend-down-bad" : "trend-down-good";
    return { arrow: "↓", cssClass: cls, yearRange, liNingStart, liNingEnd };
  }

  function renderTrendCard(metricName, arrow, cssClass, yearRange) {
    return `
    <div class="trend-item trend-card">
      <div class="trend-metric-name">${metricName}</div>
      <div class="trend-subject">李宁</div>
      <div class="trend-arrow ${cssClass}" title="${arrow === "↑" ? "上升" : arrow === "↓" ? "下降" : "基本持平"}">${arrow}</div>
      <div class="trend-year">${yearRange}</div>
    </div>`;
  }

  function renderTrendSignals() {
    const yearsAsc = [...supportedYears].sort((a, b) => a - b);
    const y0 = yearsAsc[0];
    const y1 = yearsAsc[yearsAsc.length - 1];
    if (trendSectionTitle) {
      trendSectionTitle.textContent = `李宁近三年经营趋势（${y0}–${y1}）`;
    }
    const points = yearsAsc.map((y) => safeYearData("li-ning", y)).filter(Boolean);
    const rev = points.map((p) => p.revenue);
    const g = points.map((p) => p.grossMargin);
    const n = points.map((p) => p.netProfit);
    const c = points.map((p) => p.cashFlowFromOps);
    const mRev = trendMeta(rev, true);
    const mG = trendMeta(g, true);
    const mN = trendMeta(n, true);
    const mC = trendMeta(c, true);
    if (!trendSignalsGrid) return;
    trendSignalsGrid.innerHTML = [
      renderTrendCard("营业收入", mRev.arrow, mRev.cssClass, mRev.yearRange),
      renderTrendCard("毛利率", mG.arrow, mG.cssClass, mG.yearRange),
      renderTrendCard("净利润", mN.arrow, mN.cssClass, mN.yearRange),
      renderTrendCard("经营现金流", mC.arrow, mC.cssClass, mC.yearRange)
    ].join("");
  }

  function renderSummary(left, right) {
    const revenueDiff = right.revenue - left.revenue;
    const grossDiff = right.grossMargin - left.grossMargin;
    const netDiff = right.netProfit - left.netProfit;
    const cashDiff = right.cashFlowFromOps - left.cashFlowFromOps;
    const points = [
      `规模对比：${companies[selection.right].nameCn}在营收规模上领先 ${fmt(Math.abs(revenueDiff), 1)} 亿。`,
      `盈利质量：${companies[selection.right].nameCn}毛利率领先 ${fmt(Math.abs(grossDiff), 1)}pct。`,
      `利润表现：${companies[selection.right].nameCn}净利润领先 ${fmt(Math.abs(netDiff), 1)} 亿。`,
      `现金创造：${companies[selection.right].nameCn}经营现金流领先 ${fmt(Math.abs(cashDiff), 1)} 亿。`,
      "经营关注点：重点关注库存周转、渠道折扣率和费用投入效率的联动变化。"
    ];
    compareSummary.innerHTML = points.map((item) => `<li>${item}</li>`).join("");
  }

  function renderDiagnosis(leftMeta, rightMeta, left, right) {
    const revenueGap = right.revenue - left.revenue;
    const grossGap = right.grossMargin - left.grossMargin;
    const cashGap = right.cashFlowFromOps - left.cashFlowFromOps;
    liNingDiagnosis.textContent =
      `${leftMeta.nameCn}${selection.year}年相对${rightMeta.nameCn}仍存在规模和盈利质量差距：` +
      `收入落后${fmt(Math.abs(revenueGap), 1)}亿，毛利率落后${fmt(Math.abs(grossGap), 1)}pct。` +
      `但${leftMeta.nameCn}在经营利润率与库存周转方面维持稳定，若能持续优化渠道折扣和产品结构，` +
      `并提升现金流效率（当前差距${fmt(Math.abs(cashGap), 1)}亿），中期盈利弹性仍有改善空间。`;
  }

  function renderAIModule(year, left, right) {
    aiSectionContainer.innerHTML = `
      <div class="ai-section">
        <div class="ai-action-row">
          <button class="ai-btn" type="button" id="ai-btn-${year}" onclick="triggerAI('${year}')">深度解读</button>
        </div>
      </div>
    `;
    window.__REPORT_CONTEXT = window.__REPORT_CONTEXT || { aiByYear: {} };
    window.__REPORT_CONTEXT.aiByYear[String(year)] = {
      liNingData: {
        revenue: left.revenue,
        revenueGrowth: left.revenueYoY,
        grossMargin: left.grossMargin,
        operatingMargin: left.opMargin,
        netProfit: left.netProfit,
        operatingCashFlow: left.cashFlowFromOps
      },
      antaData: {
        revenue: right.revenue,
        revenueGrowth: right.revenueYoY,
        grossMargin: right.grossMargin,
        operatingMargin: right.opMargin,
        netProfit: right.netProfit,
        operatingCashFlow: right.cashFlowFromOps
      }
    };
  }

  function render() {
    const leftMeta = companies[selection.left];
    const rightMeta = companies[selection.right];
    const left = safeYearData(selection.left, selection.year);
    const right = safeYearData(selection.right, selection.year);
    if (!leftMeta || !rightMeta || !left || !right) {
      throw new Error("未找到对应公司或年份数据，请检查 URL 参数与 data.js。");
    }

    titleText.textContent = `${leftMeta.nameCn} vs ${rightMeta.nameCn}`;
    primaryCode.textContent = `${leftMeta.code} vs ${rightMeta.code}`;
    metaText.textContent = `Annual Report 对比（${selection.year}） · ${leftMeta.sector} vs ${rightMeta.sector}`;

    gapCardRevenue.innerHTML = renderKPICard("收入差距", left.revenue, right.revenue, "亿");
    gapCardGross.innerHTML = renderKPICard("毛利率差距", left.grossMargin, right.grossMargin, "pct");
    gapCardNet.innerHTML = renderKPICard("净利润差距", left.netProfit, right.netProfit, "亿");
    gapCardCash.innerHTML = renderKPICard("经营现金流差距", left.cashFlowFromOps, right.cashFlowFromOps, "亿");
    renderTrendSignals();

    incomeKpis.innerHTML = [
      renderMetricRow("Revenue 营业收入", left.revenue, right.revenue, { suffix: "亿", digits: 1 }),
      kpiRowGrowthYoY("Revenue YoY 收入增速", left.revenueYoY, right.revenueYoY, left.revenueYoY - right.revenueYoY, "pct", 1),
      renderMetricRow("Gross Margin 毛利率", left.grossMargin, right.grossMargin, { suffix: "pct", digits: 1 }),
      renderMetricRow("Operating Margin 经营利润率", left.opMargin, right.opMargin, { suffix: "pct", digits: 1 })
    ].join("");

    balanceKpis.innerHTML = [
      renderMetricRow("Debt/Asset 资产负债率", left.debtToAsset, right.debtToAsset, { suffix: "pct", digits: 1 }),
      renderMetricRow("Inventory Days 库存周转天数", left.inventoryTurnoverDays, right.inventoryTurnoverDays, { suffix: "天", digits: 0 }),
      renderMetricRow("Net Profit 净利润", left.netProfit, right.netProfit, { suffix: "亿", digits: 1 })
    ].join("");

    const leftProfitToCfo = left.cashFlowFromOps === 0 ? 0 : left.netProfit / left.cashFlowFromOps;
    const rightProfitToCfo = right.cashFlowFromOps === 0 ? 0 : right.netProfit / right.cashFlowFromOps;
    const leftCashConversion = left.revenue === 0 ? 0 : (left.cashFlowFromOps / left.revenue) * 100;
    const rightCashConversion = right.revenue === 0 ? 0 : (right.cashFlowFromOps / right.revenue) * 100;
    cashKpis.innerHTML = [
      renderMetricRow("Operating Cash Flow 经营现金流", left.cashFlowFromOps, right.cashFlowFromOps, { suffix: "亿", digits: 1 }),
      renderMetricRow("Profit / CFO 净利现金比", leftProfitToCfo, rightProfitToCfo, { suffix: "", digits: 2 }),
      renderMetricRow("Cash Conversion 现金转化", leftCashConversion, rightCashConversion, { suffix: "pct", digits: 1 })
    ].join("");

    leftAnalysisTitle.textContent = `${leftMeta.nameCn}（${selection.year}）解读`;
    rightAnalysisTitle.textContent = `${rightMeta.nameCn}（${selection.year}）解读`;
    renderAnalysisList(leftAnalysisList, left.interpretation);
    renderAnalysisList(rightAnalysisList, right.interpretation);
    renderDiagnosis(leftMeta, rightMeta, left, right);
    renderSummary(left, right);
    renderAIModule(selection.year, left, right);
  }

  function refreshUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("companies", `${selection.left},${selection.right}`);
    url.searchParams.set("year", String(selection.year));
    window.history.replaceState(null, "", url.toString());
  }

  leftCompanySelect.addEventListener("change", () => {
    selection.left = leftCompanySelect.value;
    if (selection.left === selection.right) {
      selection.right = companyKeys.find((k) => k !== selection.left) || selection.left;
      rightCompanySelect.value = selection.right;
    }
    refreshUrl();
    render();
  });

  rightCompanySelect.addEventListener("change", () => {
    selection.right = rightCompanySelect.value;
    if (selection.right === selection.left) {
      selection.left = companyKeys.find((k) => k !== selection.right) || selection.right;
      leftCompanySelect.value = selection.left;
    }
    refreshUrl();
    render();
  });

  yearSelect.addEventListener("change", function () {
    const year = this.value;
    if (year === "2026") {
      showYearUnavailable();
      this.value = getCurrentYear();
      return;
    }
    selection.year = Number(yearSelect.value);
    refreshUrl();
    render();
  });

  renderCompanyOptions();
  renderYearOptions();
  render();
  if (Number(params.get("year")) === 2026) {
    refreshUrl();
  }
});
