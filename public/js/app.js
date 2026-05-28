const API_URL = "/api/trades";

const fieldNames = [
  "date",
  "token",
  "chain",
  "narrative",
  "entryMc",
  "liquidity",
  "volume",
  "entryPrice",
  "exitPrice",
  "modal",
  "profitPercent",
  "result",
  "holdTime",
  "entryReason",
  "exitReason",
  "notes",
];

let resultChart;
let profitChart;
let trades = [];
let historyPage = 1;

const els = {
  dashboardView: document.querySelector("#dashboardView"),
  inputView: document.querySelector("#inputView"),
  historyView: document.querySelector("#historyView"),
  tradeForm: document.querySelector("#tradeForm"),
  tradeId: document.querySelector("#tradeId"),
  submitBtn: document.querySelector("#submitBtn"),
  submitText: document.querySelector(".submit-text"),
  cancelEditBtn: document.querySelector("#cancelEditBtn"),
  refreshBtn: document.querySelector("#refreshBtn"),
  historyRefreshBtn: document.querySelector("#historyRefreshBtn"),
  toast: document.querySelector("#appToast"),
  toastMessage: document.querySelector("#toastMessage"),
  tradeRows: document.querySelector("#tradeRows"),
  historyCards: document.querySelector("#historyCards"),
  tableCount: document.querySelector("#tableCount"),
  historySummary: document.querySelector("#historySummary"),
  historyMonth: document.querySelector("#historyMonth"),
  historySort: document.querySelector("#historySort"),
  historyPageSize: document.querySelector("#historyPageSize"),
  paginationInfo: document.querySelector("#paginationInfo"),
  prevPageBtn: document.querySelector("#prevPageBtn"),
  nextPageBtn: document.querySelector("#nextPageBtn"),
  connectionStatus: document.querySelector("#connectionStatus"),
  entryPrice: document.querySelector("#entryPrice"),
  exitPrice: document.querySelector("#exitPrice"),
  profitPercent: document.querySelector("#profitPercent"),
  result: document.querySelector("#result"),
  holdAmount: document.querySelector("#holdAmount"),
  holdUnit: document.querySelector("#holdUnit"),
  holdTime: document.querySelector("#holdTime"),
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#date").valueAsDate = new Date();
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  els.tradeForm.addEventListener("submit", handleSubmit);
  els.tradeForm.addEventListener("reset", () => setTimeout(clearEditMode, 0));
  els.cancelEditBtn.addEventListener("click", () => {
    els.tradeForm.reset();
    clearEditMode();
  });
  els.refreshBtn.addEventListener("click", loadTrades);
  els.historyRefreshBtn.addEventListener("click", loadTrades);
  els.tradeRows.addEventListener("click", handleHistoryAction);
  els.historyCards.addEventListener("click", handleHistoryAction);
  els.historyMonth.addEventListener("change", () => {
    historyPage = 1;
    renderHistory();
  });
  els.historySort.addEventListener("change", () => {
    historyPage = 1;
    renderHistory();
  });
  els.historyPageSize.addEventListener("change", () => {
    historyPage = 1;
    renderHistory();
  });
  els.prevPageBtn.addEventListener("click", () => {
    historyPage = Math.max(1, historyPage - 1);
    renderHistory();
  });
  els.nextPageBtn.addEventListener("click", () => {
    historyPage += 1;
    renderHistory();
  });
  els.entryPrice.addEventListener("input", updateTradeResult);
  els.exitPrice.addEventListener("input", updateTradeResult);
  els.holdAmount.addEventListener("input", updateHoldTime);
  els.holdUnit.addEventListener("change", updateHoldTime);

  ["entryMc", "liquidity", "volume"].forEach((id) => {
    const input = document.querySelector(`#${id}`);
    input.addEventListener("input", () => updateCompactPreview(id));
    updateCompactPreview(id);
  });

  initCharts();
  loadTrades();
});

function showView(view) {
  const isDashboard = view === "dashboard";
  els.dashboardView.classList.toggle("d-none", !isDashboard);
  els.inputView.classList.toggle("d-none", view !== "input");
  els.historyView.classList.toggle("d-none", view !== "history");

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
}

async function handleSubmit(event) {
  event.preventDefault();
  event.stopPropagation();

  updateTradeResult();
  updateHoldTime();

  if (!els.tradeForm.checkValidity()) {
    els.tradeForm.classList.add("was-validated");
    showToast("Lengkapi field wajib dulu. Profit dan result otomatis dari entry/exit price.", "warning");
    return;
  }

  const payload = Object.fromEntries(new FormData(els.tradeForm).entries());

  setSubmitting(true);
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await parseJsonResponse(response);

    if (!result.success) {
      throw new Error(result.message || "Submit gagal.");
    }

    showToast(payload.id ? "Trade berhasil diupdate." : "Trade berhasil disimpan.", "success");
    els.tradeForm.reset();
    clearEditMode();
    showView("dashboard");
    await loadTrades();
  } catch (error) {
    showToast(error.message || "Tidak bisa mengirim data.", "danger");
  } finally {
    setSubmitting(false);
  }
}

async function loadTrades() {
  els.connectionStatus.textContent = "Loading...";
  try {
    const response = await fetch(API_URL);
    const result = await parseJsonResponse(response);

    if (!result.success) {
      throw new Error(result.message || "Gagal mengambil data.");
    }

    trades = result.data || [];
    els.connectionStatus.textContent = "SQLite aktif";
    renderDashboard(trades);
    renderMonthOptions();
    renderHistory();
  } catch (error) {
    els.connectionStatus.textContent = "DB error";
    showToast(error.message || "Gagal refresh data.", "danger");
  }
}

function renderDashboard(data) {
  const totalTrade = data.length;
  const totalWin = countByResult(data, "Win");
  const totalLose = countByResult(data, "Lose");
  const totalRug = countByResult(data, "Rug");
  const totalBe = countByResult(data, "BE");
  const totalProfit = data.reduce((sum, trade) => sum + toNumber(trade.profitPercent), 0);
  const winRate = totalTrade ? (totalWin / totalTrade) * 100 : 0;

  setText("totalTrade", totalTrade);
  setText("totalWin", totalWin);
  setText("totalLose", totalLose);
  setText("totalRug", totalRug);
  setText("winRate", `${formatNumber(winRate)}%`);
  setText("totalProfit", `${formatNumber(totalProfit)}%`);

  const totalProfitEl = document.querySelector("#totalProfit");
  totalProfitEl.classList.toggle("text-profit", totalProfit >= 0);
  totalProfitEl.classList.toggle("text-loss", totalProfit < 0);

  renderCharts(data, { totalWin, totalLose, totalRug, totalBe });
}

function renderCharts(data, counts) {
  resultChart.data.datasets[0].data = [counts.totalWin, counts.totalLose, counts.totalRug, counts.totalBe];
  resultChart.update();

  profitChart.data.labels = data.map((trade, index) => trade.token || `Trade ${index + 1}`);
  profitChart.data.datasets[0].data = data.map((trade) => toNumber(trade.profitPercent));
  profitChart.update();
}

function renderHistory() {
  const filtered = getFilteredTrades();
  const pageSize = Number(els.historyPageSize.value);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  historyPage = Math.min(historyPage, totalPages);
  const start = (historyPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  els.tableCount.textContent = `${filtered.length} row`;
  els.historySummary.textContent = getHistorySummary(filtered);
  els.paginationInfo.textContent = `Halaman ${historyPage} dari ${totalPages}`;
  els.prevPageBtn.disabled = historyPage <= 1;
  els.nextPageBtn.disabled = historyPage >= totalPages;
  renderTable(pageItems);
  renderHistoryCards(pageItems);
}

function renderTable(data) {

  if (!data.length) {
    els.tradeRows.innerHTML = '<tr><td colspan="13" class="text-center text-secondary py-4">Belum ada data.</td></tr>';
    return;
  }

  els.tradeRows.innerHTML = data
    .slice()
    .map((trade) => {
      const profit = toNumber(trade.profitPercent);
      const profitClass = profit >= 0 ? "text-profit" : "text-loss";
      return `
        <tr>
          <td>${escapeHtml(trade.date)}</td>
          <td class="fw-semibold">${escapeHtml(trade.token)}</td>
          <td>${escapeHtml(trade.chain)}</td>
          <td>${escapeHtml(trade.narrative)}</td>
          <td>${formatCompact(trade.entryMc)}</td>
          <td>${formatCompact(trade.liquidity)}</td>
          <td>${formatCompact(trade.volume)}</td>
          <td>${formatCurrency(trade.modal)}</td>
          <td class="${profitClass} fw-semibold">${formatNumber(profit)}%</td>
          <td>${resultPill(trade.result)}</td>
          <td>${escapeHtml(trade.holdTime)}</td>
          <td>${escapeHtml(trade.notes)}</td>
          <td>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-info table-action" type="button" data-action="edit" data-id="${trade.id}">Edit</button>
              <button class="btn btn-sm btn-outline-danger table-action" type="button" data-action="delete" data-id="${trade.id}">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderHistoryCards(data) {
  if (!data.length) {
    els.historyCards.innerHTML = '<div class="empty-state">Belum ada data.</div>';
    return;
  }

  els.historyCards.innerHTML = data
    .map((trade) => {
      const profit = toNumber(trade.profitPercent);
      const profitClass = profit >= 0 ? "text-profit" : "text-loss";

      return `
        <article class="history-card">
          <div class="history-card-head">
            <div>
              <strong>${escapeHtml(trade.token)}</strong>
              <span>${escapeHtml(trade.date)} · ${escapeHtml(trade.chain)}</span>
            </div>
            ${resultPill(trade.result)}
          </div>
          <div class="history-card-grid">
            <div><span>MC</span><strong>${formatCompact(trade.entryMc)}</strong></div>
            <div><span>Liq</span><strong>${formatCompact(trade.liquidity)}</strong></div>
            <div><span>Vol</span><strong>${formatCompact(trade.volume)}</strong></div>
            <div><span>Modal</span><strong>${formatCurrency(trade.modal)}</strong></div>
            <div><span>Profit</span><strong class="${profitClass}">${formatNumber(profit)}%</strong></div>
            <div><span>Hold</span><strong>${escapeHtml(trade.holdTime || "-")}</strong></div>
          </div>
          ${trade.notes ? `<p class="history-card-note">${escapeHtml(trade.notes)}</p>` : ""}
          <div class="history-card-actions">
            <button class="btn btn-sm btn-outline-info table-action" type="button" data-action="edit" data-id="${trade.id}">Edit</button>
            <button class="btn btn-sm btn-outline-danger table-action" type="button" data-action="delete" data-id="${trade.id}">Hapus</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function getFilteredTrades() {
  const month = els.historyMonth.value;
  const sort = els.historySort.value;

  return trades
    .filter((trade) => month === "all" || getMonthKey(trade.date) === month)
    .slice()
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      const diff = dateA === dateB ? idA - idB : dateA - dateB;
      return sort === "asc" ? diff : -diff;
    });
}

function renderMonthOptions() {
  const currentValue = els.historyMonth.value || "all";
  const months = [...new Set(trades.map((trade) => getMonthKey(trade.date)).filter(Boolean))]
    .sort()
    .reverse();

  els.historyMonth.innerHTML = [
    '<option value="all">Semua bulan</option>',
    ...months.map((month) => `<option value="${month}">${formatMonth(month)}</option>`),
  ].join("");

  els.historyMonth.value = months.includes(currentValue) ? currentValue : "all";
}

function getHistorySummary(data) {
  if (!data.length) {
    return "Belum ada data";
  }

  const totalProfit = data.reduce((sum, trade) => sum + toNumber(trade.profitPercent), 0);
  const wins = countByResult(data, "Win");
  return `${wins} win · ${formatNumber(totalProfit)}% total profit`;
}

function initCharts() {
  Chart.defaults.color = "#9fb0c0";
  Chart.defaults.borderColor = "#243244";

  resultChart = new Chart(document.querySelector("#resultChart"), {
    type: "doughnut",
    data: {
      labels: ["Win", "Lose", "Rug", "BE"],
      datasets: [{
        data: [0, 0, 0, 0],
        backgroundColor: ["#31d07f", "#ff5b6b", "#d9364a", "#f5b84b"],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
    },
  });

  profitChart = new Chart(document.querySelector("#profitChart"), {
    type: "bar",
    data: {
      labels: [],
      datasets: [{
        label: "Profit %",
        data: [],
        backgroundColor: (context) => {
          const value = context.raw || 0;
          return value >= 0 ? "#31d07f" : "#ff5b6b";
        },
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { ticks: { callback: (value) => `${value}%` } },
      },
      plugins: { legend: { display: false } },
    },
  });
}

function countByResult(data, result) {
  return data.filter((trade) => String(trade.result).toLowerCase() === result.toLowerCase()).length;
}

function setSubmitting(isSubmitting) {
  els.submitBtn.disabled = isSubmitting;
  els.submitText.classList.toggle("d-none", isSubmitting);
  els.submitBtn.querySelector(".spinner-border").classList.toggle("d-none", !isSubmitting);
}

function showToast(message, type = "dark") {
  els.toast.className = `toast text-bg-${type} border-0`;
  els.toastMessage.textContent = message;
  bootstrap.Toast.getOrCreateInstance(els.toast).show();
}

function updateTradeResult() {
  if (els.entryPrice.value === "" || els.exitPrice.value === "") {
    els.profitPercent.value = "";
    els.result.value = "";
    return;
  }

  const entry = toNumber(els.entryPrice.value);
  const exit = toNumber(els.exitPrice.value);

  if (!entry || !Number.isFinite(entry) || !Number.isFinite(exit)) {
    els.profitPercent.value = "";
    els.result.value = "";
    return;
  }

  const profit = ((exit - entry) / entry) * 100;
  els.profitPercent.value = profit.toFixed(2);

  if (exit === 0 || profit <= -90) {
    els.result.value = "Rug";
  } else if (Math.abs(profit) < 0.01) {
    els.result.value = "BE";
  } else if (profit > 0) {
    els.result.value = "Win";
  } else {
    els.result.value = "Lose";
  }
}

function updateHoldTime() {
  const amount = Number(els.holdAmount.value);
  const unit = els.holdUnit.value;
  els.holdTime.value = Number.isFinite(amount) && amount > 0 ? `${amount} ${unit}` : "";
}

function updateCompactPreview(id) {
  const input = document.querySelector(`#${id}`);
  const preview = document.querySelector(`[data-preview-for="${id}"]`);
  preview.textContent = input.value ? formatCompact(input.value) : "-";
}

async function parseJsonResponse(response) {
  const text = await response.text();
  const trimmed = text.trim();

  if (!response.ok) {
    throw new Error(`Endpoint error ${response.status}. Cek server PHP dan database SQLite.`);
  }

  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    throw new Error("Endpoint membalas HTML, bukan JSON. Jalankan lewat PHP server, bukan buka file HTML langsung.");
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    throw new Error("Response endpoint bukan JSON valid. Cek error PHP.");
  }
}

async function handleHistoryAction(event) {
  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const id = Number(button.dataset.id);
  const trade = trades.find((item) => Number(item.id) === id);

  if (!trade) {
    showToast("Data trade tidak ditemukan.", "danger");
    return;
  }

  if (button.dataset.action === "edit") {
    fillFormForEdit(trade);
    showView("input");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (button.dataset.action === "delete") {
    await deleteTrade(id);
  }
}

function fillFormForEdit(trade) {
  fieldNames.forEach((field) => {
    const input = document.querySelector(`[name="${field}"]`);
    if (input) {
      ensureSelectValue(input, trade[field]);
      input.value = trade[field] ?? "";
    }
  });

  els.tradeId.value = trade.id;
  parseHoldTime(trade.holdTime);
  updateTradeResult();
  ["entryMc", "liquidity", "volume"].forEach(updateCompactPreview);
  els.submitText.textContent = "Update Trade";
  els.cancelEditBtn.classList.remove("d-none");
}

async function deleteTrade(id) {
  const confirmed = window.confirm("Hapus trade ini dari database lokal?");

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    const result = await parseJsonResponse(response);

    if (!result.success) {
      throw new Error(result.message || "Gagal hapus trade.");
    }

    showToast("Trade berhasil dihapus.", "success");
    await loadTrades();
  } catch (error) {
    showToast(error.message || "Gagal hapus data.", "danger");
  }
}

function clearEditMode() {
  els.tradeForm.classList.remove("was-validated");
  els.tradeId.value = "";
  els.profitPercent.value = "";
  els.result.value = "";
  els.holdTime.value = "";
  els.submitText.textContent = "Simpan Trade";
  els.cancelEditBtn.classList.add("d-none");
  document.querySelector("#date").valueAsDate = new Date();
  ["entryMc", "liquidity", "volume"].forEach(updateCompactPreview);
}

function parseHoldTime(value) {
  const match = String(value || "").match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  els.holdAmount.value = match ? match[1] : "";
  els.holdUnit.value = match ? match[2] : "menit";
  updateHoldTime();
}

function ensureSelectValue(input, value) {
  if (input.tagName !== "SELECT" || !value) {
    return;
  }

  const hasOption = [...input.options].some((option) => option.value === value);

  if (!hasOption) {
    input.add(new Option(value, value));
  }
}

function resultPill(result) {
  const value = escapeHtml(result || "BE");
  return `<span class="result-pill result-${String(result).toLowerCase()}">${value}</span>`;
}

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

function toNumber(value) {
  const number = Number(String(value || "0").replace("%", "").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  return Number(value).toLocaleString("id-ID", {
    maximumFractionDigits: 2,
  });
}

function formatCompact(value) {
  const number = toNumber(value);
  if (!number) {
    return "-";
  }

  const abs = Math.abs(number);
  const units = [
    { value: 1_000_000_000, suffix: "b" },
    { value: 1_000_000, suffix: "m" },
    { value: 1_000, suffix: "k" },
  ];

  const unit = units.find((item) => abs >= item.value);
  if (!unit) {
    return formatNumber(number);
  }

  const compact = number / unit.value;
  return `${formatNumber(compact)}${unit.suffix}`;
}

function formatCurrency(value) {
  const number = toNumber(value);
  return number
    ? `$${number.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
    : "-";
}

function getMonthKey(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(monthKey) {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
