// /api/generatePuzzle.js

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { level, requestType, currentPuzzle } = req.body;
    const API_KEY = process.env.OPENROUTER_API_KEY;

    let prompt = "";

    // 💡 HINT REQUEST
    if (requestType === 'hint') {
        prompt = `
User ek puzzle me atka hai:
"${currentPuzzle}"

Task:
- Ek funny Hinglish hint do
- Max 8 words
- Almost answer reveal ho jaye 😏

Return ONLY plain text.
`;
    }

    // 🧠 NEW PUZZLE (MCQ MODE)
    else {
        const topics = [
            "daily life", "internet", "school", "brain trick",
            "illusion", "logic twist", "funny situation",
            "genz humor", "traps", "weird facts"
        ];

        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        const randomSeed = Math.floor(Math.random() * 10000);

        prompt = `
Create a FUN, TRICKY, SHORT puzzle for a mobile game.

Details:
- Language: Hinglish (Hindi + English mix, Roman script)
- Tone: Funny, slightly sarcastic 😈
- Topic: ${randomTopic}
- Level: ${level}
- Seed: ${randomSeed}

Rules:
1. Puzzle should be SHORT (1–2 lines max)
2. Answer must be ONE WORD (simple English word)
3. Make it tricky / misleading / brain trap
4. Provide EXACTLY 4 options (including correct one)
5. Options should be confusing but fair
6. Avoid repeating common riddles

Output STRICT JSON format ONLY:
{
  "type": "mcq",
  "puzzle": "question here",
  "options": ["opt1", "opt2", "opt3", "opt4"],
  "answer": "correctOption"
}
`;
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openrouter/free",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.9,
                top_p: 0.9
            })
        });

        const data = await response.json();

        let content = data.choices[0].message.content
            .replace(/```json|```/g, "")
            .trim();

        // 🛠️ SAFE PARSE
        let parsed;

        try {
            parsed = JSON.parse(content);
        } catch {
            // fallback (agar AI ne galat format diya)
            parsed = {
                puzzle: "Main bina pair ke bhaagta hu... pakad sakta hai? 😏",
                options: ["time", "shadow", "wind", "sound"],
                answer: "time"
            };
        }

        // 🧠 VALIDATION (IMPORTANT)
        if (!parsed.options || parsed.options.length !== 4) {
            parsed.options = ["time", "shadow", "wind", "light"];
        }

        if (!parsed.answer) {
            parsed.answer = parsed.options[0];
        }

        res.status(200).json(parsed);

    } catch (error) {
        console.error("AI Error:", error);

        // 🔥 fallback puzzle (game kabhi rukna nahi chahiye)
        res.status(200).json({
            puzzle: "Main hamesha aage badhta hu, kabhi rukta nahi 😏",
            options: ["time", "shadow", "wind", "light"],
            answer: "time"
        });
    }
            }
