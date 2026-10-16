// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAxbpvkjIrziaRReOQ2qb-N6-zXzCn5quY",
  authDomain: "ai-mind-trap.firebaseapp.com",
  databaseURL: "https://ai-mind-trap-default-rtdb.firebaseio.com",
  projectId: "ai-mind-trap",
  storageBucket: "ai-mind-trap.firebasestorage.app",
  messagingSenderId: "564569141863",
  appId: "1:564569141863:web:dfa96c0e63b311ea3f9ac2",
  measurementId: "G-G0898XQVK3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Network slow ho ya offline, UI ko latka ke nahi rakhna. 6 sec ke baad haar maan lo.
const TIMEOUT_MS = 6000;
const withTimeout = (promise, ms = TIMEOUT_MS) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);

// Leaderboard mein score save karne ke liye. true = save hua, false = fail.
export async function saveScore(username, score, level) {
  try {
    await withTimeout(
      addDoc(collection(db, "leaderboard"), {
        username: String(username).trim().slice(0, 16),
        score: Math.max(0, Math.floor(Number(score) || 0)),
        level: Math.max(1, Math.floor(Number(level) || 1)),
        date: new Date()
      })
    );
    return true;
  } catch (e) {
    console.error("Error saving score: ", e);
    return false;
  }
}

// Top 5 players lane ke liye.
// Array wapas aata hai (khaali bhi ho sakta hai). Fail hone par null, taaki UI error dikha sake.
export async function getLeaderboard() {
  try {
    const q = query(collection(db, "leaderboard"), orderBy("score", "desc"), limit(5));
    const snap = await withTimeout(getDocs(q));
    return snap.docs.map((d) => d.data());
  } catch (e) {
    console.error("Error fetching leaderboard: ", e);
    return null;
  }
}
