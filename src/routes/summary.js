import { Router } from "express";
import db from "../db.js";
import axios from "axios";
import { requireAuth } from "../util/auth.js";

const r = Router();

async function summarizeWithHF(text) {
  const token = process.env.HF_TOKEN;
  if (!token) return "Summary unavailable (no HF token).";
  const API_URL = "https://router.huggingface.co/v1/chat/completions";
  const prompt = `Summarize the user's recurring interests in one short paragraph. Be specific and neutral.\n\nConversation:\n${text}`;

  const { data } = await axios.post(API_URL, {
    model: "meta-llama/Llama-3.1-8B-Instruct:fireworks-ai",
    messages: [{ role: "user", content: prompt }],
  }, { headers: { Authorization: `Bearer ${token}` }, timeout: 120000 });

  return data?.choices?.[0]?.message?.content?.trim() || "No summary.";
}

r.get("/:conversation_id/summary", requireAuth, async (req, res) => {
  try {
    const convoId = parseInt(req.params.conversation_id);
    console.log('Received conversation_id:', req.params.conversation_id, 'Parsed:', convoId);

    if (isNaN(convoId)) {
      return res.status(400).json({ error: "Invalid conversation ID" });
    }

    // Verify ownership — ensure this conversation belongs to the logged-in user
    const convo = db
      .prepare("SELECT id FROM conversations WHERE id=? AND user_id=?")
      .get(convoId, req.user.uid);
    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Fetch messages for that conversation
    const rows = db
      .prepare(
        "SELECT role, content FROM messages WHERE conversation_id=? AND user_id=? ORDER BY id ASC LIMIT 200"
      )
      .all(convoId, req.user.uid);

    if (!rows.length) {
      return res.json({ summary: "(empty conversation)" });
    }

    const text = rows.map(r => `${r.role}: ${r.content}`).join("\n");

    // Generate AI summary
    const summary = await summarizeWithHF(text);

    res.json({
      conversation_id: convoId,
      summary,
      message_count: rows.length,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to summarize conversation" });
  }
});


export default r;
