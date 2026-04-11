// /api/generatePuzzle.js
export default async function handler(req, res) {
    // Sirf POST requests allow karenge
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { level, requestType, currentPuzzle } = req.body;
    const API_KEY = process.env.OPENROUTER_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: "API Key is missing in Vercel Environment Variables." });
    }

    // Prompt engineering based on type
    let prompt = "";
    if (requestType === 'hint') {
        prompt = `The user is playing a game called 'AI Mind Trap'. They are stuck on this puzzle: "${currentPuzzle}". 
        Provide a cryptic, helpful hint (max 12 words). Do NOT give the answer.`;
    } else {
        prompt = `Generate a tricky logic puzzle or riddle for Level ${level}. 
        Difficulty should increase as level goes up.
        Rules:
        - Return ONLY a valid JSON object.
        - Structure: {"puzzle": "the riddle text", "answer": "one-word answer"}.
        - The answer must be a single word, no punctuation.
        - Level ${level} should be ${level > 5 ? 'extremely difficult' : 'moderate'}.`;
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://ai-mind-trap.vercel.app",
                "X-Title": "AI Mind Trap Game"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" } // Kuch models JSON mode support karte hain
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // AI kabhi-kabhi markdown (```json) bhej deta hai, usey saaf karenge
        const cleanContent = content.replace(/```json|```/g, "").trim();
        const parsedData = JSON.parse(cleanContent);

        res.status(200).json(parsedData);
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Failed to generate puzzle. Check AI logs." });
    }
}
