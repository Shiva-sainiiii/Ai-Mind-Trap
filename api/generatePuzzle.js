// /api/generatePuzzle.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    const { level, requestType, currentPuzzle } = req.body;
    const API_KEY = process.env.OPENROUTER_API_KEY;

    let prompt = "";
    
    // Hint ke liye
    if (requestType === 'hint') {
        prompt = `The user is stuck on this puzzle: "${currentPuzzle}". Give a very easy, funny hint in Hinglish (Hindi written in English alphabet) that almost gives it away. Max 10 words. Return ONLY the hint text.`;
    } 
    // New Puzzle ke liye
    else {
        // Uniqueness ke liye random topics ki list
        const topics = ["technology", "food", "daily life", "school/college", "animals", "movies", "internet slang", "nature", "space", "mysterious things"];
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];

        // Random element add kiya taaki AI hamesha naya soche
        const randomSeed = Math.floor(Math.random() * 10000); 

        prompt = `Generate a completely unique, fun logic puzzle or riddle for a web game.
        Topic Focus: ${randomTopic}
        Randomization Seed: ${randomSeed}
        Level: ${level}
        Difficulty: ${level < 3 ? 'Very Easy' : 'Medium'}
        
        STRICT RULES:
        1. LANGUAGE: The puzzle text MUST be written in conversational 'Hinglish' (a mix of Hindi and English, written in English script. Example: "Main ek aisi cheez hu jo...").
        2. ANSWER FORMAT: The answer MUST be strictly ONE SINGLE WORD in English (so the user can type it easily).
        3. UNIQUENESS: Do not repeat common or classic riddles. Create something brand new based on the Topic Focus.
        4. OUTPUT: Return ONLY valid JSON format: {"puzzle": "hinglish riddle text here", "answer": "englishword"}. No markdown, no extra text.`;
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
                temperature: 0.9, // Higher temperature means more creative and unique answers
                top_p: 0.9
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content.replace(/```json|```/g, "").trim();
        
        res.status(200).json(JSON.parse(content));
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "AI is tired, refresh please!" });
    }
                        }
            
