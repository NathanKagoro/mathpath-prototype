const drills = [
  { prompt: '2x + 3 = 11', answer: '4', hint: 'Subtract 3, then divide by 2.' },
  { prompt: '3x - 6 = 15', answer: '7', hint: 'Add 6, then divide by 3.' },
  { prompt: '4x + 8 = 24', answer: '4', hint: 'Subtract 8, then divide by 4.' }
];

let drillIndex = 0;

const drillProblem = document.getElementById('practice-problem');
const drillAnswer = document.getElementById('practice-answer');
const drillHint = document.getElementById('practice-hint');
const drillFeedback = document.getElementById('practice-feedback');
const drillButton = document.getElementById('practice-check');
const toggleHintButton = document.getElementById('toggle-practice-hint');
const scanWorkingButton = document.getElementById('scan-working-btn');
const scanPanel = document.getElementById('scan-panel');

function showDrill() {
  const current = drills[drillIndex];
  drillProblem.textContent = current.prompt;
  drillHint.textContent = `Hint: ${current.hint}`;
}

drillButton.addEventListener('click', () => {
  const current = drills[drillIndex];
  const correct = drillAnswer.value.trim() === current.answer;

  if (correct) {
    drillFeedback.className = 'feedback good';
    drillFeedback.textContent = 'Correct. Great work. The drill is adapting upward to a harder pattern.';
    drillIndex = Math.min(drills.length - 1, drillIndex + 1);
  } else {
    drillFeedback.className = 'feedback bad';
    drillFeedback.textContent = 'Not yet. The drill is adapting downward to reinforce the concept. Recheck your inverse operations and signs.';
    drillIndex = Math.max(0, drillIndex - 1);
  }

  drillAnswer.value = '';
  showDrill();
});

toggleHintButton.addEventListener('click', () => {
  const hidden = drillHint.classList.contains('hidden');
  if (hidden) {
    drillHint.classList.remove('hidden');
    toggleHintButton.textContent = 'Hide Hint';
  } else {
    drillHint.classList.add('hidden');
    toggleHintButton.textContent = 'Show Hint';
  }
});

scanWorkingButton.addEventListener('click', () => {
  const hidden = scanPanel.classList.contains('hidden');
  if (hidden) {
    scanPanel.classList.remove('hidden');
    scanWorkingButton.textContent = 'Hide Scanned Working';
  } else {
    scanPanel.classList.add('hidden');
    scanWorkingButton.textContent = 'Scan Working';
  }
});

showDrill();