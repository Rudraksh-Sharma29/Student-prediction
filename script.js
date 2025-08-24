document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".feature-form");
  const resultBox = document.querySelector(".result p em");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const studyHours = parseFloat(document.getElementById("studyHours").value) || 0;
    const attendance = parseFloat(document.getElementById("attendance").value) || 0;
    const prevGrade = parseFloat(document.getElementById("prevGrade").value) || 0;
    const assignments = parseInt(document.getElementById("assignments").value) || 0;
    const extra = parseFloat(document.getElementById("extra").value) || 0;
    const sleep = parseFloat(document.getElementById("sleep").value) || 0;

    let score =
      (studyHours * 2) +
      (attendance * 0.3) +
      (prevGrade * 8) +
      (assignments * 0.5) +
      (sleep * 1.5) -
      (extra * 0.3);

    score = Math.max(0, Math.min(100, score));

    let prediction;
    if (score >= 80) {
      prediction = "Excellent 📈";
    } else if (score >= 60) {
      prediction = "Good 👍";
    } else if (score >= 40) {
      prediction = "Average 😐";
    } else {
      prediction = "Needs Improvement ⚠️";
    }

    // Remove previous animation class (if any)
    resultBox.classList.remove("show");

    // Update text
    resultBox.textContent = `${prediction} (Score: ${score.toFixed(1)})`;

    // Trigger reflow to restart animation
    void resultBox.offsetWidth;

    // Add animation class
    resultBox.classList.add("show");
  });
});
