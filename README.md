# AI Mind Trap

Seedhe lagne wale trick sawaalon ka game. Ek galti, aur phans gaye.

**Live:** [ai-mind-trap.vercel.app](https://ai-mind-trap.vercel.app)

## Kya hai

- 100 readymade Hinglish trick sawaal (`questions.js`), AI ka wait nahi, har sawaal instant
- 3 difficulty tier: level 1-5 easy, 6-10 medium, 11+ hard
- Har sawaal ka apna hint (instant), skip, aur level ke saath kam hota timer
- Same sawaal jaldi repeat nahi hota (browser yaad rakhta hai kaunse dekh liye)
- Firebase leaderboard (Top 5)
- Laptop aur mobile dono ke liye responsive, `prefers-reduced-motion` ka respect

## Files

```
index.html     home page (naam, start, leaderboard)
game.html      game page
style.css      poora theme (green felt, ivory card, brass)
home.js        home page logic
game.js        game logic + settings (CFG)
questions.js   100 sawaalon ka data
ui.js          shared helpers (moire rings, count-up, safe storage)
firebase.js    leaderboard save / load
```

Koi build step nahi hai. Tailwind aur GSAP ab use nahi hote, sirf Google Fonts load hote hain
(Bodoni Moda + Instrument Sans).

## Naya sawaal kaise add karein

`questions.js` mein ek line add karo:

```js
{ t: 1, q: "Sawaal yahan?", a: "sahi jawab", w: ["galat 1", "galat 2", "galat 3"], h: "Funny hint" },
```

- `t` = tier (1 easy, 2 medium, 3 hard)
- `a` sahi jawab, `w` exactly 3 galat options. Options game mein har baar shuffle hote hain.

## Game balance badalna

`game.js` ke upar `CFG` object hai: time, hint/skip ka cost, tier kis level pe badalta hai, sab wahin se.

## Locally chalana

ES modules use hote hain, isliye `index.html` ko seedha double-click karke nahi, server se kholo:

```bash
python3 -m http.server 8000
# phir http://localhost:8000 kholo
```

## Deploy

Static site hai, Vercel pe seedha chalti hai. Ab `/api` folder aur `OPENROUTER_API_KEY` ki zaroorat nahi.

## Firebase

`firebase.js` mein apna project config hai. Leaderboard `leaderboard` collection mein score save karta hai.
Firestore rules mein write ko limit karna accha rahega (score aur username ki range check ke saath).
