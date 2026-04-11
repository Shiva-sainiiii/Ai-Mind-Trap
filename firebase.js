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

// Leaderboard mein score save karne ke liye
export async function saveScore(username, score, level) {
    try {
        await addDoc(collection(db, "leaderboard"), {
            username: username,
            score: Number(score),
            level: Number(level),
            date: new Date()
        });
        console.log("Score saved successfully!");
    } catch (e) {
        console.error("Error saving score: ", e);
    }
}

// Top 5 players lane ke liye
export async function getLeaderboard() {
    try {
        const q = query(collection(db, "leaderboard"), orderBy("score", "desc"), limit(5));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data());
    } catch (e) {
        console.error("Error fetching leaderboard: ", e);
        return [];
    }
}
