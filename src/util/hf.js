import axios from "axios";

async function callHFChat({ modelId, userMessage }) {
  const API_URL = "https://router.huggingface.co/v1/chat/completions";
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error("HF_TOKEN missing in environment");

  // 🧠 Embedded behavioral prompt (since no system role)
  const prompt = `
You are an AI assistant. 
Respond naturally in the SAME language as the user's message (Arabic ↔ English).
Only output your final, clean response — no explanations, no <think> tags, and no reasoning steps.
Avoid phrases like "the user said" or "my answer is".
If the user asks something, just answer directly.
---
User message: ${userMessage}
`.trim();

  const { data } = await axios.post(
    API_URL,
    {
      model: modelId,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 512,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 120000,
    }
  );

  // 🧹 Clean and return response text
  let text = data?.choices?.[0]?.message?.content || "";
  text = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?think>/gi, "")
    .replace(/^(User|Assistant|System):/gi, "")
    .trim();

  return text || "(empty reply)";
}

export { callHFChat };
