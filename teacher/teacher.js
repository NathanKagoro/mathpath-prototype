const openButton = document.getElementById('open-plan-btn');
const statusBadge = document.getElementById('plan-status');
const feedback = document.getElementById('open-plan-feedback');

if (openButton && statusBadge && feedback) {
  openButton.addEventListener('click', () => {
    statusBadge.textContent = 'Open to students';
    statusBadge.classList.add('open');
    feedback.className = 'feedback good';
    feedback.textContent = 'Lesson is now open. Students will see it as the active lesson in their learning path.';
  });
}

const liveInsight = document.getElementById('live-insight');
const insightMessages = [
  'Confusion spike detected after Question 3.',
  'Improvement detected after context-based hint.',
  'Sign confusion rising in 18% of students.',
  'Distribution mastery increased for peer-group B.'
];

if (liveInsight && !document.getElementById('start-session-btn')) {
  let index = 0;
  setInterval(() => {
    index = (index + 1) % insightMessages.length;
    liveInsight.textContent = insightMessages[index];
  }, 5000);
}

const startSessionButton = document.getElementById('start-session-btn');
const startLessonButton = document.getElementById('start-lesson-btn');
const sessionStage = document.getElementById('live-session-stage');
const joinList = document.getElementById('join-list');

if (startSessionButton && startLessonButton && sessionStage && joinList && liveInsight) {
  const roster = ['Amina J', 'John M', 'Sarah K', 'Daniel T', 'Fatima N'];
  let joinedCount = 0;

  startSessionButton.addEventListener('click', () => {
    startSessionButton.disabled = true;
    sessionStage.textContent = 'Session started. Waiting for students to join...';

    const joinTick = setInterval(() => {
      if (joinedCount >= roster.length) {
        clearInterval(joinTick);
        sessionStage.textContent = 'All students joined. You can now start the lesson.';
        startLessonButton.disabled = false;
        liveInsight.textContent = 'All students are present. Ready to begin lesson instruction.';
        return;
      }

      const currentName = roster[joinedCount];
      const items = Array.from(joinList.children);
      const row = items.find((item) => item.textContent.startsWith(currentName));

      if (row) {
        row.classList.remove('waiting');
        row.classList.add('joined');
        row.textContent = `${currentName} - Joined`;
      }

      sessionStage.textContent = `${joinedCount + 1} of ${roster.length} students joined.`;
      joinedCount += 1;
    }, 1500);
  });

  startLessonButton.addEventListener('click', () => {
    startLessonButton.disabled = true;
    sessionStage.textContent = 'Lesson started for Year 9. Live tracking is now active.';

    let insightIndex = 0;
    setInterval(() => {
      insightIndex = (insightIndex + 1) % insightMessages.length;
      liveInsight.textContent = insightMessages[insightIndex];
    }, 5000);
  });
}

const sendHomeworkButton = document.getElementById('send-homework-btn');
const sendHomeworkFeedback = document.getElementById('send-homework-feedback');

if (sendHomeworkButton && sendHomeworkFeedback) {
  sendHomeworkButton.addEventListener('click', () => {
    sendHomeworkFeedback.className = 'feedback good';
    sendHomeworkFeedback.textContent = 'Homework sent to all Year 9 students successfully.';
  });
}

const studentChipList = document.getElementById('student-chip-list');

if (studentChipList) {
  const studentData = {
    'John M': {
      distribution: 40,
      equations: 70,
      misconception: 'John distributes only the first term and then attempts to solve for x.',
      history: ['5 incorrect attempts', '2 partial improvements', '1 correct after scaffold hint']
    },
    'Amina J': {
      distribution: 88,
      equations: 92,
      misconception: 'Occasional arithmetic slips in final simplification step.',
      history: ['1 incorrect attempt', '4 consistent correct answers', 'Strong confidence trend']
    },
    'Sarah K': {
      distribution: 75,
      equations: 81,
      misconception: 'Minor sign errors when moving constants across equals.',
      history: ['2 incorrect attempts', '3 corrected after hint', 'Stable improvement curve']
    }
  };

  const nameElement = document.getElementById('student-name');
  const distFill = document.getElementById('dist-fill');
  const eqFill = document.getElementById('eq-fill');
  const distText = document.getElementById('dist-text');
  const eqText = document.getElementById('eq-text');
  const misconceptionText = document.getElementById('misconception-text');
  const attemptHistory = document.getElementById('attempt-history');

  const chips = Array.from(document.querySelectorAll('.student-chip'));

  function renderStudent(name) {
    nameElement.textContent = `Student: ${name}`;
    const data = studentData[name];

    if (!data) {
      distFill.style.width = '0%';
      eqFill.style.width = '0%';
      distText.textContent = 'N/A';
      eqText.textContent = 'N/A';
      misconceptionText.textContent = 'No generated data yet for this student in the demo.';
      attemptHistory.innerHTML = '<li>Data pending</li><li>Enable detailed tracking in future phase</li>';
      return;
    }

    distFill.style.width = `${data.distribution}%`;
    eqFill.style.width = `${data.equations}%`;
    distText.textContent = `${data.distribution}%`;
    eqText.textContent = `${data.equations}%`;
    misconceptionText.textContent = data.misconception;
    attemptHistory.innerHTML = data.history.map((item) => `<li>${item}</li>`).join('');
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((other) => other.classList.remove('active'));
      chip.classList.add('active');
      renderStudent(chip.dataset.student);
    });
  });
}
