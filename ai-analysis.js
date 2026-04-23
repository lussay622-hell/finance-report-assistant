// ai-analysis.js - DeepSeek via Vercel proxy
// 覆盖时间：请直接替换整个文件，不要保留任何旧代码

// data.js 使用 FINANCE_DATA.companies，字段为 opMargin / cashFlowFromOps
const COMPANY_DATA =
  (typeof window !== "undefined" && window.FINANCE_DATA && window.FINANCE_DATA.companies) || {};

function normalizeYearRow(row) {
  if (!row) return null;
  return {
    ...row,
    operatingMargin: row.operatingMargin != null ? row.operatingMargin : row.opMargin,
    operatingCashFlow: row.operatingCashFlow != null ? row.operatingCashFlow : row.cashFlowFromOps
  };
}

function getLiNingDataByYear(year) {
  const y = String(year);
  const c =
    COMPANY_DATA["2331"] ||
    COMPANY_DATA["li-ning"] ||
    Object.values(COMPANY_DATA).find((v) => v.aliases && v.aliases.includes("li-ning"));
  return normalizeYearRow(c?.years?.[y]) || null;
}

function getAntaDataByYear(year) {
  const y = String(year);
  const c =
    COMPANY_DATA["2020"] ||
    COMPANY_DATA["anta"] ||
    Object.values(COMPANY_DATA).find((v) => v.aliases && v.aliases.includes("anta"));
  return normalizeYearRow(c?.years?.[y]) || null;
}

async function generateAnalysis(year, liNingData, antaData) {
  const revenueMultiple = (antaData.revenue / liNingData.revenue).toFixed(1);
  const grossMarginGap = (antaData.grossMargin - liNingData.grossMargin).toFixed(1);
  const antaProfit = antaData.netProfitCore || antaData.netProfit || 0;
  const netProfitGap = (antaProfit - liNingData.netProfit).toFixed(1);

  const systemPrompt = `你是李宁集团的内部财务分析师。基于真实财报数据，从李宁视角生成归因分析。要求：简体中文，专业不晦涩，3-4个自然段，不使用标题和bullet points。字数200-300字。只基于提供的数据进行分析，不捏造任何数字。`;

  const userPrompt = `请分析${year}年李宁与安踏的财报对比：

李宁${year}年：收入${liNingData.revenue}亿元（同比${liNingData.revenueGrowth > 0 ? "+" : ""}${liNingData.revenueGrowth}%），毛利率${liNingData.grossMargin}%，经营利润率${liNingData.operatingMargin}%，净利润${liNingData.netProfit}亿元，经营现金流${liNingData.operatingCashFlow ?? "暂无"}亿元。

安踏${year}年：收入${antaData.revenue}亿元（同比${antaData.revenueGrowth > 0 ? "+" : ""}${antaData.revenueGrowth}%），毛利率${antaData.grossMargin}%，经营利润率${antaData.operatingMargin}%，核心净利润${antaProfit}亿元。

差距：安踏收入是李宁${revenueMultiple}倍，毛利率差${grossMarginGap}pct，净利润差${netProfitGap}亿元。

请分析：1.毛利率差距的结构性原因 2.李宁现金流变化解释 3.李宁相对安踏的具体优势 4.管理层需关注的风险信号。`;

  const res = await fetch("/api/deepseek", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat",
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.7
    })
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "HTTP " + res.status);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("返回内容为空");
  return text;
}

async function triggerAI(year) {
  const drawer = document.getElementById("ai-drawer");
  const overlay = document.getElementById("ai-drawer-overlay");
  const body = document.getElementById("ai-drawer-body");
  const yearTag = document.getElementById("ai-drawer-year");

  drawer.classList.add("open");
  if (overlay) overlay.classList.add("visible");
  if (yearTag) yearTag.textContent = year + "年";

  body.innerHTML = `<div style="display:flex;align-items:center;gap:10px;color:#9ca3af;font-size:13px;padding-top:4px;">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="animation:spin 1s linear infinite;flex-shrink:0;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
    正在生成分析，约需 5–10 秒...
  </div>`;

  const liNingData = getLiNingDataByYear(year);
  const antaData = getAntaDataByYear(year);

  if (!liNingData || !antaData) {
    body.innerHTML = `<p style="color:#dc2626;font-size:13px;">未找到 ${year} 年数据，请确认 data.js 已录入。</p>`;
    return;
  }

  try {
    const text = await generateAnalysis(year, liNingData, antaData);
    body.innerHTML = `<p style="font-size:14px;line-height:1.9;color:#374151;margin:0;white-space:pre-wrap;"></p>`;
    const p = body.querySelector("p");
    let i = 0;
    (function type() {
      if (i < text.length) {
        p.textContent += text[i++];
        setTimeout(type, 16);
      }
    })();
  } catch (err) {
    body.innerHTML = `<div style="font-size:13px;line-height:1.8;">
      <p style="color:#dc2626;margin:0 0 8px;">生成失败：${err.message}</p>
      <p style="color:#9ca3af;margin:0;font-size:12px;">请确认 Vercel 已配置 DEEPSEEK_API_KEY 并重新部署。</p>
      <button type="button" onclick="triggerAI('${String(year).replace(/'/g, "\\'")}')" style="margin-top:12px;padding:6px 14px;font-size:12px;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;color:#374151;">重试</button>
    </div>`;
  }
}

function closeAIDrawer() {
  const drawer = document.getElementById("ai-drawer");
  const overlay = document.getElementById("ai-drawer-overlay");
  if (drawer) drawer.classList.remove("open");
  if (overlay) overlay.classList.remove("visible");
}

function clearStoredDeepSeekKey() {
  return;
}

window.triggerAI = triggerAI;
window.closeAIDrawer = closeAIDrawer;
window.clearStoredDeepSeekKey = clearStoredDeepSeekKey;
