const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const animateCount = (el, target, duration = 800) => {
  let start = 0;
  const stepTime = Math.max(15, duration / target);
  const timer = setInterval(() => {
    start += 1;
    if (start >= target) {
      start = target;
      clearInterval(timer);
    }
    el.textContent = start;
    el.style.opacity = parseFloat(el.style.opacity || 0) + 0.02;
  }, stepTime);
};

const fadeIn = (el, speed = 20) => {
  el.style.opacity = 0;
  el.style.display = "inline-block";
  let opacity = 0;
  const timer = setInterval(() => {
    opacity += 0.03;
    el.style.opacity = opacity;
    if (opacity >= 1) clearInterval(timer);
  }, speed);
};

const calculatePerformance = (inputs) => {
  const hours = clamp(inputs.hours / 10, 0, 1);
  const attendance = clamp(inputs.attendance / 100, 0, 1);
  const prev = clamp(inputs.prev / 100, 0, 1);
  const sleep = clamp((inputs.sleep - 5) / 3, 0, 1);
  const assign = clamp(inputs.assign / 100, 0, 1);
  const stress = clamp(inputs.stress / 10, 0, 1);

  const extraMap = { none: 0, light: 0.05, moderate: 0.08, heavy: -0.03 };
  const extra = extraMap[inputs.extra] ?? 0;

  const rawScore = (0.25 * hours + 0.2 * attendance + 0.2 * prev + 0.1 * sleep + 0.1 * assign + 0.05 * extra - 0.1 * stress) * 100;

  let band = "Low", cls = "low";
  if (rawScore >= 75) { band = "High"; cls = "good"; }
  else if (rawScore >= 50) { band = "Medium"; cls = "mid"; }

  const interventions = [];
  if (hours < 3) interventions.push("Increase study hours by 1.5x.");
  if (inputs.prev < 60) interventions.push("Focus on weak subjects like Math or Science.");
  if (stress > 6) interventions.push("Join extracurricular or meditation to reduce stress.");
  if (attendance < 80) interventions.push("Attend classes regularly to improve scores.");
  if (assign < 80) interventions.push("Complete all pending assignments.");

  return { score: Math.round(rawScore), band, cls, interventions };
};

const initPredictionForm = () => {
  const form = document.getElementById("predict-form");
  const scoreEl = document.getElementById("pred-score");
  const bandEl = document.getElementById("pred-band");
  const explainEl = document.getElementById("pred-explain");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const inputs = {
      hours: parseFloat(document.getElementById("hours").value || 0),
      attendance: parseFloat(document.getElementById("attendance").value || 0),
      prev: parseFloat(document.getElementById("prev").value || 0),
      sleep: parseFloat(document.getElementById("sleep").value || 0),
      assign: parseFloat(document.getElementById("assign").value || 0),
      extra: document.getElementById("extra").value,
      stress: parseFloat(document.getElementById("stress").value || 0)
    };

    const { score, band, cls, interventions } = calculatePerformance(inputs);

    animateCount(scoreEl, score);
    bandEl.textContent = band;
    bandEl.className = `badge ${cls}`;
    fadeIn(bandEl);

    explainEl.innerHTML = interventions.length
      ? `<strong>Recommendations:</strong><ul>${interventions.map(i => `<li>${i}</li>`).join('')}</ul>`
      : "No specific interventions. Keep up the good work!";
  });
};

const initAskAIButton = () => {
  const btn = document.getElementById("open-ai-btn");
  if (btn) {
    btn.addEventListener("click", () => window.open("ai.html", "_blank"));
  }
};

document.addEventListener("DOMContentLoaded", () => {
  initPredictionForm();
  initAskAIButton();
});
