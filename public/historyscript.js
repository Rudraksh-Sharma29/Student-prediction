// Elements
const predictForm = document.getElementById("predict-form");
const dayChartCtx = document.getElementById("dayChart").getContext("2d");
const resetBtn = document.getElementById("resetData");
const dateInput = document.getElementById("date");
const studentIdInput = document.getElementById("studentId");
const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const monthlyPanel = document.getElementById("monthlyPanel");
const monthlyTitle = document.getElementById("monthlyTitle");
const monthChartCtx = document.getElementById("monthChart").getContext("2d");

// Default date -> today
dateInput.valueAsDate = new Date();

// Theme defaults for dark
Chart.defaults.color = "#cbd5e0";
Chart.defaults.borderColor = "#2d3748";

// Center text plugin for doughnut
const centerText = {
  id: "centerText",
  afterDatasetsDraw(chart) {
    const ds = chart.data.datasets?.[0];
    if (!ds) return;
    const value = ds.data?.[0] ?? 0;
    const { ctx, chartArea } = chart;
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.font = "700 20px Segoe UI";
    ctx.fillStyle = "#e0e0e0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${value}%`, cx, cy);
    ctx.restore();
  }
};

// Charts
const dayChart = new Chart(dayChartCtx, {
  type: "doughnut",
  data: { labels: ["Score", "Remaining"], datasets: [{ data: [0,100], backgroundColor: ["#36A2EB","#2a2a2a"] }] },
  options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: "70%" },
  plugins: [centerText]
});

const monthChart = new Chart(monthChartCtx, {
  type: "bar",
  data: { labels: [], datasets: [{ label: "Score (%)", data: [], backgroundColor: "#36A2EB" }] },
  options: {
    responsive: true, maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, max: 100, grid: { drawBorder: false } },
      x: { grid: { display: false } }
    },
    plugins: { legend: { display: false } }
  }
});

// Helpers
const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function getYearOptions() {
  const now = new Date().getFullYear();
  return [now-1, now, now+1];
}
function renderYearOptions() {
  yearSelect.innerHTML = "";
  for (const y of getYearOptions()) {
    const opt = document.createElement("option");
    opt.value = y; opt.textContent = y;
    if (y === new Date().getFullYear()) opt.selected = true;
    yearSelect.appendChild(opt);
  }
}
function renderMonthOptions() {
  monthSelect.innerHTML = '<option value=\"\">Select month…</option>';
  monthNames.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = String(i + 1);  // 1..12
    opt.textContent = m;
    monthSelect.appendChild(opt);
  });
}

async function fetchMonthly(studentId, year, month) {
  const resp = await fetch(`/api/scores?studentId=${encodeURIComponent(studentId)}&year=${year}&month=${month}`);
  if (!resp.ok) throw new Error("failed_fetch_month");
  return await resp.json();
}

async function onMonthOrYearChange() {
  const studentId = studentIdInput.value.trim();
  const year = Number(yearSelect.value);
  const month = Number(monthSelect.value);
  if (!studentId || !year || !month) {
    monthlyPanel.classList.add("hidden");
    return;
  }
  try {
    const data = await fetchMonthly(studentId, year, month);
    const labels = Array.from({ length: data.monthLength }, (_, i) => String(i+1).padStart(2,'0'));
    const values = data.days.map(d => d.score || 0);
    monthChart.data.labels = labels;
    monthChart.data.datasets[0].data = values;
    monthChart.update();
    monthlyTitle.textContent = `Monthly Scores — ${monthNames[month-1]} ${year}`;
    monthlyPanel.classList.remove("hidden");
    monthlyPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (e) {
    alert("Could not load monthly scores");
  }
}

// Scoring happens on the server. We send raw inputs; server returns score.
async function saveEntry(payload) {
  const resp = await fetch("/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    let msg = "save_failed";
    try { const j = await resp.json(); msg = j.error || JSON.stringify(j); } catch {}
    throw new Error(msg);
  }
  return await resp.json();
}

// Submit handler
predictForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const studentId = studentIdInput.value.trim();
  if (!studentId) { alert("Student ID required"); return; }
  const payload = {
    studentId,
    date: document.getElementById("date").value,
    hours: Number(document.getElementById("hours").value),
    attendance: Number(document.getElementById("attendance").value),
    sleep: Number(document.getElementById("sleep").value),
    assign: Number(document.getElementById("assign").value),
    extra: document.getElementById("extra").value,
    mobile: Number(document.getElementById("mobile").value)
  };
  try {
    const { score } = await saveEntry(payload);
    dayChart.data.datasets[0].data = [score, 100 - score];
    dayChart.update();
    localStorage.setItem("studentId", studentId);
    predictForm.reset();
    document.getElementById("date").valueAsDate = new Date();
    document.getElementById("studentId").value = studentId;
  } catch (err) {
    alert("Could not save entry: " + err.message);
  }
});

// Reset only clears the current daily chart (data persists in DB)
resetBtn.addEventListener("click", () => {
  dayChart.data.datasets[0].data = [0, 100];
  dayChart.update();
});

// Init dropdowns
document.getElementById("date").valueAsDate = new Date();
document.getElementById("studentId").value = localStorage.getItem("studentId") || "";
renderYearOptions();
renderMonthOptions();
yearSelect.addEventListener("change", onMonthOrYearChange);
monthSelect.addEventListener("change", onMonthOrYearChange);
