// /api/generatePuzzle.js
export default async function handler(req, res) {
    // Sirf POST requests allow karne ke liye
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { level, requestType, currentPuzzle } = req.body;
    const API_KEY = process.env.OPENROUTER_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: "API Key not configured in environment variables" });
    }

    let prompt = "";

    // Hint logic
    if (requestType === 'hint') {
        prompt = `The user is stuck on this puzzle: "${currentPuzzle}". Give a very easy, funny hint that almost gives it away. Max 10 words.`;
    } 
    // New Puzzle logic
    else {
        prompt = `Generate a fun, catchy logic puzzle or riddle for a web game.
        Level: ${level}
        Difficulty: ${level < 3 ? 'Very Easy' : 'Medium'}
        Rules:
        - The answer MUST be only ONE word.
        - Return ONLY JSON: {"puzzle": "the riddle text", "answer": "word"}.
        - Make it interesting, not boring math.
        - Ensure the JSON is valid and the answer is accurate.`;
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://ai-mind-trap.vercel.app", // Optional: Tera site link
                "X-Title": "AI Mind Trap" // Optional: Game title
            },
            body: JSON.stringify({
                model: "nvidia/nemotron-3-super-120b-a12b:free",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 150
            })
        });

        const data = await response.json();

        if (!data.choices || data.choices.length === 0) {
            throw new Error("No response from AI model");
        }

        let content = data.choices[0].message.content.trim();

        // Agar AI ne markdown triple backticks mein code bheja hai toh usse clean karo
        if (content.includes("```")) {
            content = content.replace(/```json|```/g, "").trim();
        }

        // Response ko parse karke bhejo
        try {
            const parsedData = JSON.parse(content);
            res.status(200).json(parsedData);
        } catch (parseError) {
            console.error("JSON Parse Error:", content);
            // Fallback agar AI ne format sahi nahi diya
            res.status(200).json({ 
                puzzle: "I am something you keep until you give it away. What am I?", 
                answer: "promise" 
            });
        }

    } catch (err) {
        console.error("API Error:", err);
        res.status(500).json({ error: "Failed to generate content", details: err.message });
    }
        }
