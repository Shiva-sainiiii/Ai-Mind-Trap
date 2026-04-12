// script.js
import { saveScore } from './firebase.js';

// 🎮 GAME STATE
let state = {
    level: 1,
    score: 0,
    currentAnswer: "",
    options: [],
    timeLeft: 45,
    timerInterval: null,
    username: localStorage.getItem('trap_user') || 'Guest',
    isProcessing: false
};

// 🧩 DOM
const puzzleText = document.getElementById('puzzle-text');
const optionsContainer = document.getElementById('options-container');
const hintBtn = document.getElementById('hint-btn');
const skipBtn = document.getElementById('skip-btn');
const feedback = document.getElementById('feedback');
const loader = document.getElementById('loader');
const puzzleContent = document.getElementById('puzzle-content');
const lvlDisplay = document.getElementById('lvl-display');
const scoreDisplay = document.getElementById('score-display');
const timerEl = document.getElementById('timer');

// 🎯 FETCH PUZZLE (UPDATED)
async function fetchPuzzle() {
    if (state.isProcessing) return;

    toggleLoader(true);

    try {
        const res = await fetch('/api/generatePuzzle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: state.level, requestType: 'new' })
        });

        const data = await res.json();

        if (data.error) throw new Error(data.error);

        state.currentAnswer = data.answer.toLowerCase().trim();
        state.options = data.options || [];

        puzzleText.innerText = data.puzzle;

        renderOptions();

        toggleLoader(false);
        startTimer();

    } catch (err) {
        console.error(err);
        puzzleText.innerText = "AI crashed... refresh karo 😵";
        toggleLoader(false);
    }
}

// 🧠 RENDER OPTIONS (NEW)
function renderOptions() {
    optionsContainer.innerHTML = "";

    state.options.forEach(opt => {
        const btn = document.createElement("button");

        btn.innerText = opt;

        btn.className = `
            bg-slate-800 hover:bg-cyan-600 
            py-4 rounded-xl font-bold 
            transition-all transform hover:scale-105 active:scale-95
        `;

        btn.onclick = () => selectOption(opt);

        optionsContainer.appendChild(btn);
    });
}

// ✅ HANDLE OPTION CLICK
function selectOption(selected) {
    if (state.isProcessing) return;

    const gameCard = document.getElementById('game-card');

    if (selected.toLowerCase() === state.currentAnswer) {
        // 🎉 CORRECT
        clearInterval(state.timerInterval);

        state.score += (state.timeLeft * 5) + (state.level * 10);
        state.level++;

        showFeedback("🔥 Correct! AI ko hara diya!", "text-green-400");

        gsap.to(gameCard, {
            scale: 1.05,
            boxShadow: "0 0 30px rgba(34,211,238,0.5)",
            duration: 0.3,
            yoyo: true,
            repeat: 1
        });

        setTimeout(() => {
            fetchPuzzle();
        }, 1200);

    } else {
        // ❌ WRONG
        showFeedback("❌ Galat! Dimag use kar 😏", "text-red-500");

        gameCard.classList.add('shake');
        setTimeout(() => gameCard.classList.remove('shake'), 500);
    }
}

// 💡 HINT SYSTEM
async function getHint() {
    if (state.score < 10) {
        showFeedback("⚠️ 10 points chahiye hint ke liye!", "text-yellow-400");
        return;
    }

    hintBtn.disabled = true;
    hintBtn.innerText = "AI soch rha hai...";

    try {
        const res = await fetch('/api/generatePuzzle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requestType: 'hint',
                currentPuzzle: puzzleText.innerText
            })
        });

        const data = await res.json();

        state.score -= 10;
        updateHUD();

        alert("🧠 Hint: " + (data.hint || data.puzzle));

    } catch {
        alert("Hint fail ho gaya 😑");
    }

    hintBtn.disabled = false;
    hintBtn.innerText = "💡 Hint (-10)";
}

// ⏭️ SKIP SYSTEM
function skipPuzzle() {
    if (state.score < 5) {
        showFeedback("⚠️ 5 points chahiye skip ke liye!", "text-yellow-400");
        return;
    }

    state.score -= 5;
    updateHUD();

    showFeedback("⏭️ Puzzle skipped", "text-blue-400");

    clearInterval(state.timerInterval);

    setTimeout(() => {
        fetchPuzzle();
    }, 800);
}

// ⏱️ TIMER
function startTimer() {
    clearInterval(state.timerInterval);

    state.timeLeft = 45 - (state.level * 2);
    if (state.timeLeft < 15) state.timeLeft = 15;

    updateHUD();

    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        updateHUD();

        if (state.timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

// 🎨 UI HELPERS
function updateHUD() {
    lvlDisplay.innerText = state.level;
    scoreDisplay.innerText = state.score;
    timerEl.innerText = `${state.timeLeft}s`;

    if (state.timeLeft <= 10) {
        timerEl.classList.add('text-red-500', 'animate-pulse');
    } else {
        timerEl.classList.remove('animate-pulse');
    }
}

function toggleLoader(show) {
    state.isProcessing = show;

    if (show) {
        loader.style.display = 'flex';
        gsap.to(puzzleContent, { opacity: 0, y: 10, duration: 0.3 });
    } else {
        loader.style.display = 'none';
        gsap.to(puzzleContent, { opacity: 1, y: 0, duration: 0.5 });
    }
}

function showFeedback(text, color) {
    feedback.innerText = text;
    feedback.className = `h-6 text-center font-bold ${color}`;
}

// 🛑 END GAME
async function endGame() {
    clearInterval(state.timerInterval);

    showFeedback("💀 TIME UP! AI ne pakad liya!", "text-red-600");

    await saveScore(state.username, state.score, state.level);

    setTimeout(() => {
        alert(`Game Over 😈\nScore: ${state.score}\nLevel: ${state.level}`);
        window.location.href = "index.html";
    }, 2000);
}

// 🎯 EVENTS
hintBtn.addEventListener('click', getHint);
skipBtn.addEventListener('click', skipPuzzle);

// 🚀 START GAME
if (!state.username) {
    state.username = "Player_" + Math.floor(Math.random() * 1000);
}

fetchPuzzle();
