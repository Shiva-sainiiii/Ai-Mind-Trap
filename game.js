// game.js
// AI Mind Trap ka main game logic.
// Sawaal ab questions.js se aate hain (instant), AI API ka wait khatam.

import { QUESTIONS } from './questions.js';
import { mountRings, countUp, reducedMotion, store } from './ui.js';

// ───────── Settings: game balance yahin se badlo ─────────
const CFG = {
  baseTime: 45,          // time = baseTime - (level * timeDropPerLevel)
  timeDropPerLevel: 2,
  minTime: 15,           // isse kam time kabhi nahi milega
  hintCost: 10,
  skipCost: 5,
  easyUntilLevel: 5,     // level 1-5  -> tier 1 (easy) sawaal
  mediumUntilLevel: 10,  // level 6-10 -> tier 2, uske baad tier 3 (hard)
  correctDelay: 1000,    // sahi jawab ke baad next card se pehle kitna ruke (ms)
  skipDelay: 450,
  dangerSeconds: 10,     // itne second bachne par timer lal ho jata hai
};

const RING_LENGTH = 2 * Math.PI * 28; // timer ring ka circumference (r = 28)
const SUITS = ['spade', 'heart', 'diamond', 'club'];
const PRAISE = ['Sahi pakde.', 'Trap se bach gaye.', 'Dimaag tez hai.', 'Ye wala toh nikal gaya.'];
const TAUNT = ['Galat. Phans gaye.', 'Nahi, ye trap tha.', 'Dobara socho.', 'Itna seedha nahi tha.'];

// ───────── State ─────────
const state = {
  level: 1,
  score: 0,
  q: null,
  options: [],
  total: 0,        // is sawaal ka total time (sec)
  timeLeft: 0,     // bacha hua time (sec, upar round)
  deadline: 0,
  raf: 0,
  locked: false,   // animation / answer ke beech clicks band
  hintUsed: false,
  over: false,
  suitIndex: 0,
  username: store.get('trap_user') || 'Player_' + Math.floor(Math.random() * 1000),
};

// ───────── DOM ─────────
const $ = (id) => document.getElementById(id);
const el = {
  shell: $('shell'),
  card: $('card'),
  question: $('question'),
  options: $('options'),
  feedback: $('feedback'),
  hintWrap: $('hint-wrap'),
  hint: $('hint'),
  hintBtn: $('hint-btn'),
  skipBtn: $('skip-btn'),
  level: $('level'),
  score: $('score'),
  delta: $('delta'),
  timer: $('timer'),
  timerBar: $('timer-bar'),
  time: $('time'),
  pipTop: $('pip-top'),
  pipBottom: $('pip-bottom'),
  overlay: $('overlay'),
  resultScore: $('result-score'),
  resultLevel: $('result-level'),
  resultBest: $('result-best'),
  resultSave: $('result-save'),
  againBtn: $('again-btn'),
};

mountRings($('rings'));

// Firebase ko peeche load hone do. CDN block bhi ho toh game chalta rahe.
const firebaseReady = import('./firebase.js').catch(() => null);

// ───────── Helpers ─────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Animation chalao aur khatam hone tak ruko. Reduced motion mein seedha aage badho.
function animate(node, keyframes, options) {
  if (reducedMotion()) return Promise.resolve();
  return node.animate(keyframes, options).finished.catch(() => {});
}

// ───────── Sawaal chunna (repeat nahi hone dete) ─────────
const SEEN_KEY = 'trap_seen';
let seen = new Set();
try { seen = new Set(JSON.parse(store.get(SEEN_KEY, '[]'))); } catch { /* purana data kharab, ignore */ }

function tierFor(level) {
  if (level <= CFG.easyUntilLevel) return 1;
  if (level <= CFG.mediumUntilLevel) return 2;
  return 3;
}

function pickQuestion() {
  const tier = tierFor(state.level);
  const all = QUESTIONS.map((q, i) => ({ q, i }));

  // 1) is tier ka koi naya sawaal, 2) kisi bhi tier ka naya sawaal, 3) sab dekh liye toh reset
  let pool = all.filter(({ q, i }) => q.t === tier && !seen.has(i));
  if (!pool.length) pool = all.filter(({ i }) => !seen.has(i));
  if (!pool.length) {
    seen.clear();
    pool = all.filter(({ q }) => q.t === tier);
  }

  const chosen = pick(pool);
  seen.add(chosen.i);
  store.set(SEEN_KEY, JSON.stringify([...seen]));
  return chosen.q;
}

// ───────── Render ─────────
function renderQuestion() {
  const q = pickQuestion();
  state.q = q;
  state.locked = false;
  state.hintUsed = false;
  state.options = shuffle([q.a, ...q.w]);

  el.question.textContent = q.q;
  el.options.replaceChildren(
    ...state.options.map((text) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'option';
      b.textContent = text;
      b.addEventListener('click', () => choose(b, text));
      return b;
    })
  );

  // Sab options chhote (<= 10 chars) hain toh mobile pe 2 columns mein dikhao, height bachti hai
  el.options.classList.toggle('is-short', state.options.every((o) => o.length <= 10));

  closeHint();
  setFeedback('');
  setSuit();
  updateActions();
  dealIn();
  startTimer();
}

// Har sawaal pe card ka suit badalta hai (♠ ♥ ♦ ♣)
function setSuit() {
  const suit = SUITS[state.suitIndex++ % SUITS.length];
  const red = suit === 'heart' || suit === 'diamond';
  for (const pip of [el.pipTop, el.pipBottom]) {
    pip.firstElementChild.setAttribute('href', `#suit-${suit}`);
    pip.classList.toggle('is-red', red);
  }
}

function setFeedback(text, kind = '') {
  el.feedback.textContent = text;
  el.feedback.className = `feedback ${kind}`.trim();
}

function updateHUD() {
  el.level.textContent = state.level;
}

// Hint / skip afford nahi ho sakta toh thoda dim dikhao (click phir bhi reason batata hai)
function updateActions() {
  el.hintBtn.classList.toggle('is-low', state.score < CFG.hintCost || state.hintUsed);
  el.skipBtn.classList.toggle('is-low', state.score < CFG.skipCost);
}

let deltaTimer = 0;
function floatDelta(text, kind) {
  el.delta.textContent = text;
  el.delta.className = `delta ${kind}`;
  animate(
    el.delta,
    [
      { opacity: 0, transform: 'translateY(4px)' },
      { opacity: 1, transform: 'translateY(-10px)', offset: 0.25 },
      { opacity: 1, transform: 'translateY(-18px)', offset: 0.7 },
      { opacity: 0, transform: 'translateY(-26px)' },
    ],
    { duration: 1000, easing: 'ease-out' }
  );
  // Text ko 1 sec baad saaf karo (reduced motion mein bhi itni der dikhega)
  clearTimeout(deltaTimer);
  deltaTimer = setTimeout(() => { el.delta.textContent = ''; }, 1000);
}

function changeScore(delta) {
  const from = state.score;
  state.score = Math.max(0, state.score + delta);
  countUp(el.score, from, state.score, 600);
  floatDelta(delta > 0 ? `+${delta}` : `${delta}`, delta > 0 ? 'gain' : 'loss');
  updateActions();
}

// ───────── Card animations ─────────
// Naya card "deal" hota hai
function dealIn() {
  animate(
    el.card,
    [
      { opacity: 0, transform: 'translateY(28px) rotate(-1.6deg) scale(.97)' },
      { opacity: 1, transform: 'translateY(0) rotate(0) scale(1)' },
    ],
    { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' }
  );
}

// Purana card side mein sarak jata hai
function dealOut() {
  return animate(
    el.card,
    [
      { opacity: 1, transform: 'translateX(0) rotate(0)' },
      { opacity: 0, transform: 'translateX(-56px) rotate(-5deg)' },
    ],
    { duration: 260, easing: 'ease-in', fill: 'forwards' }
  ).then(() => { el.card.getAnimations().forEach((a) => a.cancel()); });
}

function glowCard() {
  animate(
    el.card,
    [
      { boxShadow: '0 40px 70px -35px rgba(0,0,0,.7), 0 0 0 0 rgba(211,171,92,0)' },
      { boxShadow: '0 40px 70px -35px rgba(0,0,0,.7), 0 0 0 10px rgba(211,171,92,.35)', offset: 0.4 },
      { boxShadow: '0 40px 70px -35px rgba(0,0,0,.7), 0 0 0 0 rgba(211,171,92,0)' },
    ],
    { duration: 700, easing: 'ease-out' }
  );
}

function shakeNode(node) {
  animate(
    node,
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-7px)' },
      { transform: 'translateX(6px)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(2px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 380, easing: 'ease-out' }
  );
}

// ───────── Jawab dena ─────────
function choose(btn, text) {
  if (state.locked || state.over) return;
  if (text === state.q.a) onCorrect(btn);
  else onWrong(btn);
}

function onCorrect(btn) {
  state.locked = true;
  stopTimer();

  // Score formula wahi hai jo pehle tha: bacha hua time x 5 + level x 10
  const gained = state.timeLeft * 5 + state.level * 10;

  btn.classList.add('is-correct');
  for (const o of el.options.children) {
    o.disabled = true;
    if (o !== btn) o.classList.add('is-dim');
  }

  changeScore(gained);
  setFeedback(pick(PRAISE), 'ok');
  glowCard();

  setTimeout(async () => {
    state.level++;
    updateHUD();
    popLevel();
    await dealOut();
    renderQuestion();
  }, CFG.correctDelay);
}

function onWrong(btn) {
  btn.classList.add('is-wrong');
  btn.disabled = true; // wahi option dobara click nahi hoga
  shakeNode(btn);
  setFeedback(pick(TAUNT), 'bad');
}

function popLevel() {
  animate(
    el.level,
    [{ transform: 'scale(1)' }, { transform: 'scale(1.35)', offset: 0.4 }, { transform: 'scale(1)' }],
    { duration: 450, easing: 'ease-out' }
  );
}

// ───────── Hint ─────────
function useHint() {
  if (state.locked || state.over) return;

  if (state.hintUsed) {
    setFeedback('Is sawaal ka hint pehle hi le chuke ho.', 'bad');
    return;
  }
  if (state.score < CFG.hintCost) {
    setFeedback(`Hint ke liye ${CFG.hintCost} points chahiye.`, 'bad');
    return;
  }

  state.hintUsed = true;
  changeScore(-CFG.hintCost);
  el.hint.textContent = state.q.h;
  el.hintWrap.classList.add('is-open');
  setFeedback('');
}

function closeHint() {
  el.hintWrap.classList.remove('is-open');
}

// ───────── Skip ─────────
function skip() {
  if (state.locked || state.over) return;

  if (state.score < CFG.skipCost) {
    setFeedback(`Skip ke liye ${CFG.skipCost} points chahiye.`, 'bad');
    return;
  }

  state.locked = true;
  stopTimer();
  changeScore(-CFG.skipCost);
  setFeedback('Sawaal skip kiya.');

  setTimeout(async () => {
    await dealOut();
    renderQuestion();
  }, CFG.skipDelay);
}

// ───────── Timer ─────────
// Deadline se calculate karte hain, toh tab slow chale tab bhi time sahi rehta hai
function startTimer() {
  stopTimer();
  state.total = Math.max(CFG.minTime, CFG.baseTime - state.level * CFG.timeDropPerLevel);
  state.deadline = performance.now() + state.total * 1000;
  state.timeLeft = state.total;
  el.time.textContent = state.total;
  el.timer.classList.remove('is-danger');
  el.timerBar.style.strokeDashoffset = 0;

  const loop = (now) => {
    const remaining = Math.max(0, state.deadline - now);
    const secs = Math.ceil(remaining / 1000);

    el.timerBar.style.strokeDashoffset = RING_LENGTH * (1 - remaining / (state.total * 1000));

    if (secs !== state.timeLeft) {
      state.timeLeft = secs;
      el.time.textContent = secs;
      el.timer.classList.toggle('is-danger', secs <= CFG.dangerSeconds);
    }

    if (remaining <= 0) {
      endGame();
      return;
    }
    state.raf = requestAnimationFrame(loop);
  };
  state.raf = requestAnimationFrame(loop);
}

function stopTimer() {
  cancelAnimationFrame(state.raf);
}

// ───────── Game over ─────────
async function endGame() {
  if (state.over) return;
  state.over = true;
  state.locked = true;
  stopTimer();

  el.time.textContent = 0;
  el.timerBar.style.strokeDashoffset = RING_LENGTH;
  setFeedback('Time khatam. Trap mein phas gaye.', 'bad');
  for (const o of el.options.children) o.disabled = true;

  const prevBest = Number(store.get('trap_best', '0')) || 0;
  const isNewBest = state.score > prevBest;
  if (isNewBest) store.set('trap_best', String(state.score));

  await wait(900); // thodi der user ko "time up" dekhne do
  showResult(Math.max(prevBest, state.score), isNewBest);

  // Score save (0 score leaderboard pe nahi jata)
  if (state.score <= 0) {
    el.resultSave.textContent = 'Score 0 hai, leaderboard pe nahi chadhega.';
    return;
  }
  el.resultSave.textContent = 'Score leaderboard pe save ho raha hai...';
  const fb = await firebaseReady;
  const ok = fb ? await fb.saveScore(state.username, state.score, state.level) : false;
  el.resultSave.textContent = ok
    ? 'Score leaderboard pe save ho gaya.'
    : 'Score save nahi ho paya. Internet check karo.';
}

function showResult(best, isNewBest) {
  el.resultLevel.textContent = `Level ${state.level} tak pahunche`;
  el.resultBest.textContent = isNewBest ? 'Ye tumhara naya best score hai.' : `Tumhara best score: ${best}`;
  el.resultScore.textContent = '0';
  el.resultSave.textContent = '';

  el.overlay.hidden = false;
  el.shell.inert = true;

  const panel = el.overlay.firstElementChild;
  animate(el.overlay, [{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
  animate(
    panel,
    [
      { opacity: 0, transform: 'translateY(30px) rotate(1.4deg) scale(.96)' },
      { opacity: 1, transform: 'translateY(0) rotate(0) scale(1)' },
    ],
    { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' }
  );

  countUp(el.resultScore, 0, state.score, 1000);
  el.againBtn.focus();
}

function resetGame() {
  state.level = 1;
  state.score = 0;
  state.over = false;
  state.suitIndex = Math.floor(Math.random() * 4);

  el.overlay.hidden = true;
  el.shell.inert = false;
  el.score.textContent = '0';
  updateHUD();
  renderQuestion();
}

// ───────── Events + start ─────────
el.hintBtn.addEventListener('click', useHint);
el.skipBtn.addEventListener('click', skip);
el.againBtn.addEventListener('click', resetGame);

state.suitIndex = Math.floor(Math.random() * 4);
updateHUD();
renderQuestion();
