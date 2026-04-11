// script.js
import { saveScore } from './firebase.js';

// Game State
let state = {
    level: 1,
    score: 0,
    currentAnswer: "",
    timeLeft: 45,
    timerInterval: null,
    username: localStorage.getItem('trap_user') || 'Guest',
    isProcessing: false
};

// DOM Elements
const puzzleText = document.getElementById('puzzle-text');
const answerInput = document.getElementById('answer-input');
const submitBtn = document.getElementById('submit-btn');
const hintBtn = document.getElementById('hint-btn');
const feedback = document.getElementById('feedback');
const loader = document.getElementById('loader');
const puzzleContent = document.getElementById('puzzle-content');
const lvlDisplay = document.getElementById('lvl-display');
const scoreDisplay = document.getElementById('score-display');
const timerEl = document.getElementById('timer');

// 1. Fetch Puzzle from Serverless API
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
        puzzleText.innerText = data.puzzle;
        
        toggleLoader(false);
        startTimer();
    } catch (err) {
        console.error(err);
        puzzleText.innerText = "System Failure. Could not connect to the AI's mind. Try refreshing.";
        toggleLoader(false);
    }
}

// 2. Hint System
async function getHint() {
    if (state.score < 10) {
        showFeedback("Not enough points for a hint! (Need 10)", "text-yellow-500");
        return;
    }

    hintBtn.disabled = true;
    hintBtn.innerText = "Consulting AI...";

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
        alert(`🧠 AI WHISPERS: ${data.puzzle || data.hint}`);
    } catch (err) {
        alert("Hint failed. The AI is being stubborn.");
    } finally {
        hintBtn.disabled = false;
        hintBtn.innerText = "💡 Hint";
    }
}

// 3. Timer Logic
function startTimer() {
    clearInterval(state.timerInterval);
    state.timeLeft = 45 - (state.level * 2); // Levels get faster
    if (state.timeLeft < 15) state.timeLeft = 15; // Min 15 seconds
    
    updateHUD();
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        updateHUD();
        if (state.timeLeft <= 0) endGame();
    }, 1000);
}

// 4. Handle Answer Submission
function handleAnswer() {
    const userAns = answerInput.value.toLowerCase().trim();
    const gameCard = document.getElementById('game-card');

    if (userAns === state.currentAnswer) {
        // SUCCESS
        clearInterval(state.timerInterval);
        state.score += (state.timeLeft * 5) + (state.level * 10);
        state.level++;
        
        showFeedback("ACCESS GRANTED. PROCEEDING...", "text-green-400");
        
        // GSAP Success Animation
        gsap.to(gameCard, { scale: 1.02, boxShadow: "0 0 30px rgba(34, 211, 238, 0.4)", duration: 0.3, yoyo: true, repeat: 1 });
        
        setTimeout(() => {
            answerInput.value = "";
            fetchPuzzle();
        }, 1500);
    } else {
        // WRONG ANSWER
        showFeedback("ACCESS DENIED. TRY AGAIN.", "text-red-500");
        gameCard.classList.add('shake');
        setTimeout(() => gameCard.classList.remove('shake'), 500);
        answerInput.value = "";
    }
}

// 5. HUD & UI Helpers
function updateHUD() {
    lvlDisplay.innerText = state.level;
    scoreDisplay.innerText = state.score;
    timerEl.innerText = `${state.timeLeft}s`;
    if (state.timeLeft <= 10) timerEl.classList.add('text-red-500', 'animate-pulse');
    else timerEl.classList.remove('text-red-500', 'animate-pulse');
}

function toggleLoader(show) {
    state.isProcessing = show;
    if (show) {
        loader.style.display = 'flex';
        gsap.to(puzzleContent, { opacity: 0, y: 10, duration: 0.3 });
    } else {
        loader.style.display = 'none';
        gsap.to(puzzleContent, { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.7)" });
    }
}

function showFeedback(text, colorClass) {
    feedback.innerText = text;
    feedback.className = `h-6 text-center font-bold mt-4 ${colorClass}`;
}

async function endGame() {
    clearInterval(state.timerInterval);
    submitBtn.disabled = true;
    showFeedback("TIME'S UP. TRAP CLOSED.", "text-red-600");
    
    // Save to Firebase
    await saveScore(state.username, state.score, state.level);
    
    setTimeout(() => {
        alert(`The AI trapped you! \nFinal Score: ${state.score} \nLevel Reached: ${state.level}`);
        window.location.href = 'index.html';
    }, 2000);
}

// Event Listeners
submitBtn.addEventListener('click', handleAnswer);
hintBtn.addEventListener('click', getHint);
answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAnswer();
});

// Start Game
if (!state.username || state.username === 'Anonymous') {
    // Basic fallback if localStorage is empty
    state.username = "Player_" + Math.floor(Math.random() * 1000);
}

fetchPuzzle();
