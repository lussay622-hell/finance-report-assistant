(function initLandingPage() {
  const data = window.FINANCE_DATA;
  const selected = new Set(data.defaultSelection);
  const tickerInput = document.getElementById("tickerInput");
  const viewReportBtn = document.getElementById("viewReportBtn");
  const requestBtn = document.getElementById("requestBtn");
  const requestDialog = document.getElementById("requestDialog");
  const companyRequestInput = document.getElementById("companyRequestInput");
  const emailInput = document.getElementById("emailInput");
  const searchHint = document.getElementById("searchHint");
  const inputErrorTip = document.getElementById("inputErrorTip");
  const requestFeedback = document.getElementById("request-feedback");
  const requestFeedbackText = document.getElementById("request-feedback-text");
  const pills = Array.from(document.querySelectorAll(".company-pill"));
  const lockedCards = Array.from(document.querySelectorAll(".card-locked"));
  let requestFeedbackHideTimer = null;
  let requestFeedbackFadeTimer = null;

  const aliasMap = {
    "2331": "li-ning",
    "2331.hk": "li-ning",
    "li-ning": "li-ning",
    lining: "li-ning",
    "李宁": "li-ning",
    "2020": "anta",
    "2020.hk": "anta",
    anta: "anta",
    "安踏": "anta"
  };

  function normalizeToken(token) {
    return token.trim().toLowerCase();
  }

  function syncPillUI() {
    pills.forEach((pill) => {
      const code = pill.dataset.code;
      if (selected.has(code)) {
        pill.classList.add("active");
      } else {
        pill.classList.remove("active");
      }
    });
  }

  function parseInputToSelection(raw) {
    const tokens = raw
      .split(",")
      .map(normalizeToken)
      .filter(Boolean);
    const mapped = tokens.map((token) => aliasMap[token]).filter(Boolean);
    return new Set(mapped);
  }

  function goToReportPage() {
    if (tickerInput.value.trim() === "") {
      if (inputErrorTip) {
        inputErrorTip.textContent = "请先输入股票代码";
        inputErrorTip.classList.add("visible");
        setTimeout(() => {
          inputErrorTip.classList.remove("visible");
        }, 2000);
      }
      tickerInput.classList.add("input-shake");
      setTimeout(() => {
        tickerInput.classList.remove("input-shake");
      }, 380);
      return;
    }

    const currentFromInput = parseInputToSelection(tickerInput.value);
    if (currentFromInput.size > 0) {
      selected.clear();
      currentFromInput.forEach((item) => selected.add(item));
    }

    if (selected.size === 0) {
      searchHint.textContent = "至少选择一家公司（支持：李宁、安踏）。";
      searchHint.style.color = "#d9534f";
      return;
    }

    if (selected.size === 1) {
      searchHint.textContent = "建议选择两家公司，页面会展示同年横向对比。";
      searchHint.style.color = "#a56a49";
    } else {
      searchHint.textContent = "正在翻开这两家公司的账本...";
      searchHint.style.color = "#2d8854";
    }

    const companies = Array.from(selected).join(",");
    const url = `./report.html?companies=${encodeURIComponent(companies)}&year=${data.defaultYear}`;
    setTimeout(() => {
      window.location.href = url;
    }, 250);
  }

  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const code = pill.dataset.code;
      if (selected.has(code)) {
        selected.delete(code);
      } else {
        selected.add(code);
      }
      syncPillUI();
      tickerInput.value = Array.from(selected)
        .map((c) => data.companies[c]?.code || c)
        .join(",");
    });
  });

  viewReportBtn.addEventListener("click", goToReportPage);

  tickerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      goToReportPage();
    }
  });

  tickerInput.addEventListener("input", () => {
    if (inputErrorTip) {
      inputErrorTip.classList.remove("visible");
    }
  });

  requestBtn.addEventListener("click", () => {
    requestDialog.showModal();
  });

  function clearRequestFeedbackTimers() {
    if (requestFeedbackHideTimer) {
      clearTimeout(requestFeedbackHideTimer);
      requestFeedbackHideTimer = null;
    }
    if (requestFeedbackFadeTimer) {
      clearTimeout(requestFeedbackFadeTimer);
      requestFeedbackFadeTimer = null;
    }
  }

  function showRequestFeedback(companyName) {
    if (!requestFeedback || !requestFeedbackText) return;
    const nameText = companyName || "你的提交";
    clearRequestFeedbackTimers();
    requestFeedbackText.textContent = `已收到申请：${nameText}，我们将尽快完成数据接入。`;
    requestFeedback.style.opacity = "1";
    requestFeedback.style.transition = "";
    requestFeedback.style.display = "flex";
    requestFeedbackHideTimer = setTimeout(() => {
      requestFeedback.style.opacity = "0";
      requestFeedback.style.transition = "opacity 0.4s";
      requestFeedbackFadeTimer = setTimeout(() => {
        requestFeedback.style.display = "none";
        requestFeedback.style.opacity = "1";
        requestFeedback.style.transition = "";
      }, 400);
    }, 3000);
  }

  requestDialog.addEventListener("close", () => {
    if (requestDialog.returnValue === "confirm") {
      const companies = companyRequestInput.value.trim();
      const displayName = companies || "你的提交";
      showRequestFeedback(displayName);
      companyRequestInput.value = "";
      emailInput.value = "";
    }
  });

  lockedCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  });

  tickerInput.value = data.defaultSelection
    .map((c) => data.companies[c].code.replace(".HK", ""))
    .join(",");
  syncPillUI();
})();
