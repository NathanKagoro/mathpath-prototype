const questions = [
  {
    prompt: '3(x + 2) = 18',
    answer: '4',
    contexts: [
      'A student buys 3 packs, each with x pens and 2 pencils, totaling 18 items.',
      'A market seller bundles 3 baskets each with x mangoes plus 2 extra, total 18 mangoes.',
      'A coach runs 3 drills of (x + 2) minutes each and spends 18 minutes in total.'
    ],
    hint: 'Expand first: 3x + 6 = 18.',
    pinpoint: {
      '6': 'Pinpoint: You likely divided 18 by 3 but forgot to subtract 2 after simplifying.',
      '2': 'Pinpoint: You likely subtracted first and then divided incorrectly. Keep operation order after expansion.'
    },
    defaultPinpoint: 'Pinpoint: Start with expansion, then isolate x using inverse operations.'
  },
  {
    prompt: '2(x - 4) = 10',
    answer: '9',
    contexts: [
      'Two identical game rounds each score (x - 4) points, total score 10.',
      'Two taxi trips each have fare adjustment (x - 4), and the combined adjustment is 10.',
      'Two fundraising rounds each raise (x - 4) units, total 10 units.'
    ],
    hint: 'Expand first: 2x - 8 = 10.',
    pinpoint: {
      '7': 'Pinpoint: You likely moved -8 incorrectly. Add 8 to both sides before dividing.',
      '3': 'Pinpoint: You may have treated x - 4 as x/4. Keep subtraction and division separate.'
    },
    defaultPinpoint: 'Pinpoint: Recheck sign movement after expansion.'
  },
  {
    prompt: '4(x + 1) = 28',
    answer: '6',
    contexts: [
      'Four travel cards each cost (x + 1) dollars, total is 28 dollars.',
      'Four meal sets each include x items plus 1 drink, total items are 28.',
      'Four school teams each score (x + 1) points, total is 28 points.'
    ],
    hint: 'Expand first: 4x + 4 = 28.',
    pinpoint: {
      '7': 'Pinpoint: You likely divided 28 by 4 first and forgot to subtract 1.',
      '5': 'Pinpoint: You may have subtracted 4 before division. Expand and isolate step by step.'
    },
    defaultPinpoint: 'Pinpoint: Expand, then subtract constants, then divide by the coefficient.'
  },
  {
    prompt: '5(x - 3) = 20',
    answer: '7',
    contexts: [
      'Five snack bundles each have (x - 3) items, and there are 20 items total.',
      'Five team entries each score (x - 3), total 20 points.',
      'Five buses each travel (x - 3) km and together travel 20 km.'
    ],
    hint: 'Expand first: 5x - 15 = 20.',
    pinpoint: {
      '4': 'Pinpoint: You likely forgot that subtracting 3 is inside brackets before expansion.',
      '1': 'Pinpoint: You may have used only one inverse operation. Complete both steps.'
    },
    defaultPinpoint: 'Pinpoint: Keep distribution and sign handling consistent.'
  },
  {
    prompt: '2x + 9 = 25',
    answer: '8',
    contexts: [
      'Twice a value plus 9 equals 25. Solve for x.',
      'A bus fare doubles by distance and adds 9, total cost is 25.',
      'Two ticket bundles plus a fixed 9 fee total 25.'
    ],
    hint: 'Subtract 9, then divide by 2.',
    pinpoint: {
      '17': 'Pinpoint: You likely subtracted incorrectly. 25 - 9 should be 16.',
      '12': 'Pinpoint: You likely added 9 instead of subtracting it.'
    },
    defaultPinpoint: 'Pinpoint: Remove constants first, then divide by coefficient.'
  }
];

let index = 0;
let contextIndex = 0;
let advancing = false;
let contextGenerated = false;

const problem = document.getElementById('lesson-problem');
const answerInput = document.getElementById('lesson-answer');
const counter = document.getElementById('question-counter');
const feedback = document.getElementById('lesson-feedback');
const hint = document.getElementById('lesson-hint');
const progressFill = document.getElementById('lesson-progress');
const progressText = document.getElementById('lesson-progress-text');
const checkButton = document.getElementById('check-answer');
const generateContextButton = document.getElementById('generate-context');
const toggleHintButton = document.getElementById('toggle-lesson-hint');
const pinpointFeedback = document.getElementById('pinpoint-feedback');
const contextElement = document.getElementById('lesson-context');
const scanWorkingButton = document.getElementById('scan-lesson-working-btn');
const lessonScanPanel = document.getElementById('lesson-scan-panel');
const scanQuestionLabel = document.getElementById('scan-question-label');
const scanWorkingText = document.getElementById('scan-working-text');
const scanWorkingFeedback = document.getElementById('scan-working-feedback');

function renderQuestion() {
  const current = questions[index];
  problem.textContent = current.prompt;
  counter.textContent = `Question ${index + 1} of ${questions.length}`;
  hint.textContent = current.hint;
  contextElement.textContent = current.contexts[contextIndex];
  hint.classList.add('hidden');
  contextElement.classList.add('hidden');
  toggleHintButton.textContent = 'Show Hint';
  generateContextButton.textContent = contextGenerated ? '' : 'Generate Context';
  pinpointFeedback.style.display = 'none';
  lessonScanPanel.classList.add('hidden');
  scanWorkingButton.textContent = 'Scan Working';
  const pct = 38 + index * 12;
  progressFill.style.width = `${Math.min(100, pct)}%`;
  progressText.textContent = `${Math.min(100, pct)}%`;
}

checkButton.addEventListener('click', () => {
  if (advancing) {
    return;
  }

  const current = questions[index];
  const input = answerInput.value.trim();
  if (input === current.answer) {
    feedback.className = 'feedback good';
    feedback.textContent = 'Correct. You solved for x correctly. Moving to next question.';
    pinpointFeedback.style.display = 'none';

    advancing = true;
    const isLastQuestion = index === questions.length - 1;

    setTimeout(() => {
      if (isLastQuestion) {
        feedback.className = 'feedback good';
        feedback.textContent = 'Great work. You completed this lesson.';
        counter.textContent = `Question ${questions.length} of ${questions.length}`;
        checkButton.disabled = true;
        checkButton.textContent = 'Lesson Complete';
      } else {
        index += 1;
        contextIndex = 0;
        contextGenerated = false;
        answerInput.value = '';
        feedback.className = 'feedback neutral';
        feedback.textContent = 'Solve for x and check your inverse operations.';
        renderQuestion();
      }
      advancing = false;
    }, 700);
  } else {
    feedback.className = 'feedback bad';
    feedback.textContent = 'Not yet. Your answer is not the final value for x.';
    const pinpointMessage = current.pinpoint[input] || current.defaultPinpoint;
    pinpointFeedback.textContent = pinpointMessage;
    pinpointFeedback.style.display = 'block';
  }
});

generateContextButton.addEventListener('click', () => {
  if (contextGenerated) {
    return;
  }

  const current = questions[index];
  if (contextElement.classList.contains('hidden')) {
    contextElement.classList.remove('hidden');
    generateContextButton.textContent = '';
    contextElement.textContent = current.contexts[contextIndex];
    contextGenerated = true;
    return;
  }
});

toggleHintButton.addEventListener('click', () => {
  const hidden = hint.classList.contains('hidden');
  if (hidden) {
    hint.classList.remove('hidden');
    toggleHintButton.textContent = 'Hide Hint';
  } else {
    hint.classList.add('hidden');
    toggleHintButton.textContent = 'Show Hint';
  }
});

scanWorkingButton.addEventListener('click', () => {
  const hidden = lessonScanPanel.classList.contains('hidden');

  if (hidden) {
    lessonScanPanel.classList.remove('hidden');
    scanWorkingButton.textContent = 'Hide Scanned Working';

    if (index === 0) {
      scanQuestionLabel.textContent = 'Question: 3(x + 2) = 18';
      scanWorkingText.textContent = '3(x + 2) = 18\n3x + 2 = 18\n3x = 16\nx = 4';
      scanWorkingFeedback.textContent = 'Where it went wrong: distribution was applied incorrectly. 3(x + 2) should become 3x + 6, not 3x + 2.';
    } else {
      scanQuestionLabel.textContent = `Question: ${questions[index].prompt}`;
      scanWorkingText.textContent = 'No sample working uploaded for this question yet in the demo.';
      scanWorkingFeedback.textContent = 'This demo currently includes a full false-working analysis for Question 1 only.';
    }
  } else {
    lessonScanPanel.classList.add('hidden');
    scanWorkingButton.textContent = 'Scan Working';
  }
});

renderQuestion();