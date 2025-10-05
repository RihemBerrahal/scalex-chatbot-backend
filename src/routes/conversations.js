import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../util/auth.js";

const r = Router();

// List user's conversations (newest first)
r.get("/", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT id, title, created_at, updated_at
    FROM conversations
    WHERE user_id = ?
    ORDER BY updated_at DESC, id DESC
  `).all(req.user.uid);
  res.json({ items: rows });
});
async function generateConversationTitle(firstMessage) {
  const token = process.env.HF_TOKEN;
  if (!token) return firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');

  try {
    const API_URL = "https://router.huggingface.co/v1/chat/completions";
    const prompt = `Create a very short, 2-4 word title for a conversation that starts with this message. Return only the title, no quotes or explanations:\n\n"${firstMessage}"`;

    const { data } = await axios.post(API_URL, {
      model: "meta-llama/Llama-3.1-8B-Instruct:fireworks-ai",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 20,
    }, { 
      headers: { Authorization: `Bearer ${token}` }, 
      timeout: 30000 
    });

    const title = data?.choices?.[0]?.message?.content?.trim();
    return title || firstMessage.slice(0, 30) + '...';
  } catch (error) {
    console.error('Title generation error:', error);
    // Fallback: use first words of the message
    return firstMessage.split(' ').slice(0, 4).join(' ') + '...';
  }
}
// Create a new conversation (optional custom title)
r.post("/", requireAuth, (req, res) => {
  const { title = "New chat" } = req.body || {};
  const st = db.prepare(`
    INSERT INTO conversations (user_id, title) VALUES (?, ?)
  `);
  const info = st.run(req.user.uid, title);
  res.json({ id: info.lastInsertRowid, title });
});

// Rename conversation
r.patch("/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const { title } = req.body || {};
  if (!title) return res.status(400).json({ error: "title required" });
  const upd = db.prepare(`
    UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(title, id, req.user.uid);
  if (!upd.changes) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// Delete conversation (+ its messages)
r.delete("/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  db.prepare(`DELETE FROM messages WHERE conversation_id = ? AND user_id = ?`).run(id, req.user.uid);
  const del = db.prepare(`DELETE FROM conversations WHERE id = ? AND user_id = ?`).run(id, req.user.uid);
  if (!del.changes) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// Get messages for one conversation
r.get("/:id/messages", requireAuth, (req, res) => {
  const { id } = req.params;
  const conv = db.prepare(`SELECT id FROM conversations WHERE id=? AND user_id=?`).get(id, req.user.uid);
  if (!conv) return res.status(404).json({ error: "not found" });
  const rows = db.prepare(`
    SELECT id, model, role, content, ts
    FROM messages
    WHERE user_id=? AND conversation_id=?
    ORDER BY id ASC
  `).all(req.user.uid, id);
  res.json({ items: rows });
});

export default r;
