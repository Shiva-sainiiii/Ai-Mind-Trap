// script.js
import { saveScore } from './firebase.js';

// 1. Audio Setup (Using Howler.js for smoothness)
const sfx = {
    bg: new Howl({
        src: ['https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3'],
        loop: true,
        volume: 0.2
    }),
    success: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-bright-answer-263.mp3'], volume: 0.5 }),
    wrong: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-fail-modular-error-813.mp3'], volume: 0.5 }),
    click: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-modern-technology-select-3124.mp3'], volume: 0.3 }),
    gameOver: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-system-error-tone-2552.mp3'], volume: 0.6 })
};

// 2. Game State
let state = {
    level: 1,
    score: 0,
    lives: 3,
    currentAnswer: "",
    timeLeft: 45,
    timerInterval: null,
    username: localStorage.getItem('trap_user') || 'Guest',
    isProcessing: false
};

// 3. DOM Elements
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
const livesContainer = document.getElementById('lives-container');

// 4. Initialize Game
function init() {
    sfx.bg.play();
    updateHUD();
    fetchPuzzle();
    startTimer();
}

// 5. Fetch Puzzle logic
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
        
        // Typing effect for the puzzle
        puzzleText.innerText = "";
        toggleLoader(false);
        typeWriter(data.puzzle);
        
    } catch (err) {
        console.error("Fetch Error:", err);
        showFeedback("CONNECTION INTERRUPTED. RETRYING...", "text-yellow-500");
        setTimeout(fetchPuzzle, 3000);
    }
}

// 6. Handle Answer Submission
async function handleAnswer() {
    const userAns = answerInput.value.toLowerCase().trim();
    if (!userAns || state.isProcessing) return;

    sfx.click.play();

    if (userAns === state.currentAnswer) {
        // CORRECT ANSWER
        sfx.success.play();
        state.score += (state.level * 10) + state.timeLeft;
        state.level++;
        state.timeLeft = Math.max(20, 45 - (state.level * 2)); // Level hard hota jayega
        
        showFeedback("ACCESS GRANTED. ESCAPING TO NEXT NODE...", "text-cyan-400");
        gsap.to("#game-card", { borderColor: "#22d3ee", duration: 0.3, yoyo: true, repeat: 1 });
        
        answerInput.value = "";
        updateHUD();
        fetchPuzzle();
    } else {
        // WRONG ANSWER
        sfx.wrong.play();
        state.lives--;
        updateHUD();
        
        gsap.to("#game-card", { x: 10, repeat: 5, yoyo: true, duration: 0.05 }); // Shake effect
        showFeedback("WRONG OVERRIDE CODE. SYSTEM BREACH DETECTED!", "text-red-500");

        if (state.lives <= 0) {
            endGame("OUT OF LIVES");
        }
    }
}

// 7. Timer Logic
function startTimer() {
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        timerEl.innerText = `${state.timeLeft}s`;

        if (state.timeLeft <= 10) {
            timerEl.classList.add('text-red-500', 'animate-pulse');
            // Heartbeat sound logic could go here
        }

        if (state.timeLeft <= 0) endGame("TIME EXPIRED");
    }, 1000);
}

// 8. HUD Updates (Lives, Score, Level)
function updateHUD() {
    lvlDisplay.innerText = state.level < 10 ? `0${state.level}` : state.level;
    scoreDisplay.innerText = state.score.toString().padStart(4, '0');
    
    // Update Hearts UI
    livesContainer.innerHTML = '❤️'.repeat(state.lives);
}

// 9. UI Animations
function toggleLoader(show) {
    state.isProcessing = show;
    if (show) {
        loader.style.display = 'flex';
        gsap.to(puzzleContent, { opacity: 0, scale: 0.95, duration: 0.3 });
    } else {
        loader.style.display = 'none';
        gsap.to(puzzleContent, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" });
    }
}

function typeWriter(text) {
    let i = 0;
    const interval = setInterval(() => {
        puzzleText.innerText += text.charAt(i);
        i++;
        if (i > text.length) clearInterval(interval);
    }, 30);
}

function showFeedback(text, colorClass) {
    feedback.innerText = text;
    feedback.className = `h-4 text-center text-sm font-bold tracking-widest mt-4 ${colorClass}`;
    gsap.from(feedback, { opacity: 0, y: 5, duration: 0.3 });
}

// 10. End Game Logic
async function endGame(reason) {
    clearInterval(state.timerInterval);
    sfx.bg.stop();
    sfx.gameOver.play();
    
    submitBtn.disabled = true;
    showFeedback(`SYSTEM SHUTDOWN: ${reason}`, "text-red-600 font-black");
    
    // Save to Firebase
    await saveScore(state.username, state.score, state.level);
    
    setTimeout(() => {
        alert(`GAME OVER\nReason: ${reason}\nFinal Score: ${state.score}\nLevel: ${state.level}`);
        window.location.href = 'index.html';
    }, 2000);
}

// 11. Hint System
hintBtn.onclick = async () => {
    if (state.isProcessing || state.score < 20) {
        showFeedback("NOT ENOUGH DATA FOR HINT (Need 20 pts)", "text-yellow-600");
        return;
    }
    
    sfx.click.play();
    state.score -= 20;
    updateHUD();
    
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
        showFeedback(`HINT: ${data.puzzle}`, "text-cyan-300");
    } catch (err) {
        showFeedback("HINT UPLINK FAILED.", "text-red-400");
    }
};

// Event Listeners
submitBtn.addEventListener('click', handleAnswer);
answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAnswer();
});

// Start the game
init();
            
