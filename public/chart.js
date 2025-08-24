// Data storage
const subjectsData = {};

// Utility functions
function showValidationMsg(msg) {
  document.getElementById('validationMsg').innerText = msg;
}
function clearValidationMsg() {
  document.getElementById('validationMsg').innerText = '';
}

// Add subject data
function addSubject() {
  clearValidationMsg();
  const subject = document.getElementById('subject').value.trim();
  const a1 = parseFloat(document.getElementById('assessment1').value);
  const a2 = parseFloat(document.getElementById('assessment2').value);
  const q1 = parseFloat(document.getElementById('quiz1').value);
  const q2 = parseFloat(document.getElementById('quiz2').value);
  const assignment = parseFloat(document.getElementById('assignment').value);

  // Validation
  if (!subject) { showValidationMsg('Please enter the subject name.'); return; }
  if (
    isNaN(a1) || a1 < 0 || a1 > 50 ||
    isNaN(a2) || a2 < 0 || a2 > 50 ||
    isNaN(q1) || q1 < 0 || q1 > 10 ||
    isNaN(q2) || q2 < 0 || q2 > 10 ||
    isNaN(assignment) || assignment < 0 || assignment > 10
  ) {
    showValidationMsg('Enter valid marks within specified ranges.');
    return;
  }

  // Initialize if new subject
  if (!subjectsData[subject]) {
    subjectsData[subject] = {
      totalAssessment1: 0, totalAssessment2: 0,
      totalQuiz1: 0, totalQuiz2: 0,
      totalAssignment: 0,
      count: 0
    };
  }

  // Store data
  subjectsData[subject].totalAssessment1 += a1;
  subjectsData[subject].totalAssessment2 += a2;
  subjectsData[subject].totalQuiz1 += q1;
  subjectsData[subject].totalQuiz2 += q2;
  subjectsData[subject].totalAssignment += assignment;
  subjectsData[subject].count += 1;

  // Clear inputs
  document.getElementById('subject').value = '';
  document.getElementById('assessment1').value = '';
  document.getElementById('assessment2').value = '';
  document.getElementById('quiz1').value = '';
  document.getElementById('quiz2').value = '';
  document.getElementById('assignment').value = '';

  updateSummary();
  updateGraphs();
  computeFinalScores();
}

// Update data summary
function updateSummary() {
  const container = document.getElementById('data-summary');
  container.innerHTML = '';
  for (const subj in subjectsData) {
    const data = subjectsData[subj];
    const a1_avg = (data.totalAssessment1 / data.count).toFixed(2);
    const a2_avg = (data.totalAssessment2 / data.count).toFixed(2);
    const q1_avg = (data.totalQuiz1 / data.count).toFixed(2);
    const q2_avg = (data.totalQuiz2 / data.count).toFixed(2);
    const assignment_avg = (data.totalAssignment / data.count).toFixed(2);
    const div = document.createElement('div');
    div.innerHTML = `<strong>${subj}</strong>: Assessments Avg = (${a1_avg} + ${a2_avg})/2, Quizzes Avg = (${q1_avg} + ${q2_avg})/2, Assignment = ${assignment_avg}`;
    container.appendChild(div);
  }
}

// Charts
let assessmentChart = null;
let quizChart = null;
let contributionChart = null;

function updateGraphs() {
  const ctxAssess = document.getElementById('assessmentChart').getContext('2d');
  const ctxQuiz = document.getElementById('quizChart').getContext('2d');

  const subjects = Object.keys(subjectsData);
  const avgAssessments = [];
  const avgQuizzes = [];

  subjects.forEach(s => {
    const data = subjectsData[s];
    const avgA1 = data.totalAssessment1 / data.count;
    const avgA2 = data.totalAssessment2 / data.count;
    const avgQ1 = data.totalQuiz1 / data.count;
    const avgQ2 = data.totalQuiz2 / data.count;
    avgAssessments.push(((avgA1 + avgA2) / 2));
    avgQuizzes.push(((avgQ1 + avgQ2) / 2));
  });

  if (assessmentChart) assessmentChart.destroy();
  if (quizChart) quizChart.destroy();

  assessmentChart = new Chart(ctxAssess, {
    type: 'bar',
    data: {
      labels: subjects,
      datasets: [{ label: 'Assessments Avg', data: avgAssessments, backgroundColor: 'rgba(0, 123, 255, 0.6)', borderColor: '#007bff', borderWidth: 1 }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true, max: 50 } } }
  });

  quizChart = new Chart(ctxQuiz, {
    type: 'bar',
    data: {
      labels: subjects,
      datasets: [{ label: 'Quizzes Avg', data: avgQuizzes, backgroundColor: 'rgba(255, 193, 7, 0.6)', borderColor: '#ffc107', borderWidth: 1 }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true, max: 10 } } }
  });
}

// Calculate overall weighted scores
function computeFinalScores() {
  const container = document.getElementById('weights-result');
  container.innerHTML = '';

  const labels = [];
  const finalScores = [];
  const contributionLabels = ['Assessments', 'Quizzes', 'Assignment'];

  // Weights
  const weights = { assessment: 0.70, quiz: 0.10, assignment: 0.20 };

  // For overall contribution pie chart
  let totalAssessmentWeighted = 0;
  let totalQuizWeighted = 0;
  let totalAssignmentWeighted = 0;

  for (const subj in subjectsData) {
    const data = subjectsData[subj];

    const avgA1 = data.totalAssessment1 / data.count;
    const avgA2 = data.totalAssessment2 / data.count;
    const avgQ1 = data.totalQuiz1 / data.count;
    const avgQ2 = data.totalQuiz2 / data.count;
    const avgAssignment = data.totalAssignment / data.count;

    const assessmentScore = (avgA1 + avgA2) / 2; // out of 50
    const quizScore = (avgQ1 + avgQ2) / 2; // out of 10
    const assignmentScore = avgAssignment; // out of 10

    // Calculate weighted percentage scores
    const weightedAssessment = (assessmentScore / 50) * weights.assessment * 100;
    const weightedQuiz = (quizScore / 10) * weights.quiz * 100;
    const weightedAssignment = (assignmentScore / 10) * weights.assignment * 100;

    const totalScore = (weightedAssessment + weightedQuiz + weightedAssignment).toFixed(2);

    labels.push(subj);
    finalScores.push(totalScore);

    // Accumulate for overall contribution pie
    totalAssessmentWeighted += weightedAssessment;
    totalQuizWeighted += weightedQuiz;
    totalAssignmentWeighted += weightedAssignment;
  }

  // Display per subject final scores
  for (let i=0; i<labels.length; i++) {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${labels[i]}</strong>: Final Score = ${finalScores[i]} / 100`;
    document.getElementById('weights-result').appendChild(div);
  }

  // Draw contribution pie chart
  if (contributionChart) contributionChart.destroy();
  const ctxPie = document.getElementById('contributionPie').getContext('2d');
  contributionChart = new Chart(ctxPie, {
    type: 'pie',
    data: {
      labels: contributionLabels,
      datasets: [{
        data: [
          totalAssessmentWeighted,
          totalQuizWeighted,
          totalAssignmentWeighted
        ],
        backgroundColor: [
          'rgba(0, 123, 255, 0.7)',
          'rgba(255, 193, 7, 0.7)',
          'rgba(40, 167, 69, 0.7)'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

// Reset all data
function resetData() {
  for (const key in subjectsData) delete subjectsData[key];
  document.getElementById('data-summary').innerHTML = '';
  if (assessmentChart) assessmentChart.destroy();
  if (quizChart) quizChart.destroy();
  if (contributionChart) contributionChart.destroy();
  document.getElementById('weights-result').innerHTML = '';
  // Clear canvases
  const ctxAssess = document.getElementById('assessmentChart').getContext('2d');
  ctxAssess.clearRect(0, 0, 600, 300);
  const ctxQuiz = document.getElementById('quizChart').getContext('2d');
  ctxQuiz.clearRect(0, 0, 600, 300);
  document.getElementById('contributionPie').getContext('2d').clearRect(0, 0, 400, 400);
}