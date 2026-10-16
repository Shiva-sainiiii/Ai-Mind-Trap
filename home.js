// home.js
// Home page: rings, naam input, game start transition, leaderboard

import { mountRings, reducedMotion, store } from './ui.js';

const form = document.getElementById('start-form');
const nameInput = document.getElementById('username');
const nameError = document.getElementById('name-error');
const boardList = document.getElementById('board-list');
const boardNote = document.getElementById('board-note');

mountRings(document.getElementById('rings'));

// Pichli baar ka naam yaad rakho
nameInput.value = store.get('trap_user', '') || '';

// ───────── Start game ─────────
// Naam se control characters hata do aur 16 chars tak limit
const cleanName = (s) => s.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16);

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = cleanName(nameInput.value);

  if (!name) {
    nameError.textContent = 'Pehle apna naam likho.';
    nameInput.setAttribute('aria-invalid', 'true');
    nameInput.focus();
    shake(nameInput);
    return;
  }

  nameError.textContent = '';
  nameInput.removeAttribute('aria-invalid');
  store.set('trap_user', name);
  enterTrap();
});

nameInput.addEventListener('input', () => {
  if (nameError.textContent) {
    nameError.textContent = '';
    nameInput.removeAttribute('aria-invalid');
  }
});

function shake(el) {
  if (reducedMotion()) return;
  el.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-8px)' },
      { transform: 'translateX(7px)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(3px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 380, easing: 'ease-out' }
  );
}

// Rings zoom hoke tumhe andar kheench leti hain, phir game page khulta hai
function enterTrap() {
  if (reducedMotion()) {
    location.href = 'game.html';
    return;
  }
  document.body.classList.add('is-leaving');
  setTimeout(() => { location.href = 'game.html'; }, 650);
}

// Back button se wapas aaye toh page ko normal state mein lao
window.addEventListener('pageshow', (e) => {
  if (e.persisted) document.body.classList.remove('is-leaving');
});

// ───────── Leaderboard ─────────
// Username ko textContent se daalte hain (innerHTML nahi), taaki koi script inject na kar sake
function renderBoard(rows) {
  boardList.setAttribute('aria-busy', 'false');
  boardList.replaceChildren();

  rows.forEach((r, i) => {
    const li = document.createElement('li');
    li.className = 'board-row';

    const rank = document.createElement('span');
    rank.className = 'board-rank';
    rank.textContent = i + 1;

    const who = document.createElement('span');
    who.className = 'board-who';

    const name = document.createElement('span');
    name.className = 'board-name';
    name.textContent = String(r.username || 'Guest').slice(0, 16);

    const level = document.createElement('span');
    level.className = 'board-level';
    level.textContent = `Level ${Number(r.level) || 1}`;

    who.append(name, level);

    const score = document.createElement('span');
    score.className = 'board-score';
    score.textContent = Number(r.score) || 0;

    li.append(rank, who, score);
    boardList.appendChild(li);
  });
}

function showNote(text) {
  boardList.setAttribute('aria-busy', 'false');
  boardList.replaceChildren();
  boardNote.textContent = text;
  boardNote.hidden = false;
}

async function loadBoard() {
  // Firebase load na ho (CDN block / offline) tab bhi game khelne layak rehna chahiye
  const fb = await import('./firebase.js').catch(() => null);
  const rows = fb ? await fb.getLeaderboard() : null;

  if (rows === null) {
    showNote('Leaderboard abhi load nahi ho paya. Game phir bhi khel sakte ho.');
  } else if (!rows.length) {
    showNote('Abhi tak koi nahi bacha. Pehla naam tumhara ho sakta hai.');
  } else {
    renderBoard(rows);
  }
}

loadBoard();
