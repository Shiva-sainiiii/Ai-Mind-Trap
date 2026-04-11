// /api/generatePuzzle.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    const { level, requestType, currentPuzzle } = req.body;
    const API_KEY = process.env.OPENROUTER_API_KEY;

    let prompt = "";
    if (requestType === 'hint') {
        prompt = `The user is stuck on this puzzle: "${currentPuzzle}". Give a very easy, funny hint that almost gives it away. Max 10 words.`;
    } else {
        // Level wise difficulty set ki hai, starting levels ko easy rakha hai
        prompt = `Generate a fun, catchy logic puzzle or riddle for a web game.
        Level: ${level}
        Difficulty: ${level < 3 ? 'Very Easy' : 'Medium'}
        Rules:
        - The answer MUST be only ONE word.
        - Return ONLY JSON: {"puzzle": "the riddle text", "answer": "word"}.
        - Make it interesting, not boring math.`;
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "nvidia/nemotron-3-super-120b-a12b:free",
                messages: [{ role: "user", content: prompt }]
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content.replace(/```json|```/g, "").trim();
        res.status(200).json(JSON.parse(content));
    } catch (error) {
        res.status(500).json({ error: "AI is tired, refresh please!" });
    }
                      }
    
