import { Router } from "express";
import { requireAuth } from "../util/auth.js";
import db from "../db.js";
import { callHFChat } from "../util/hf.js";

const r = Router();

/** Friendly names -> HF Inference Router model IDs */
const HF_MODELS = {
    "deepseek-r1": "deepseek-ai/DeepSeek-R1-Distill-Llama-8B:novita",
    "llama3.1": "meta-llama/Llama-3.1-8B-Instruct:fireworks-ai",
    "qwen3": "Qwen/Qwen3-8B:nscale",
};





/** Arabic support flags (assume all true; tweak if needed) */
const MODEL_SUPPORT = { "deepseek-r1": true, "llama3.1": true, "qwen3": true };

/** POST /chat { model: 'deepseek-r1'|'llama3.1'|'qwen3', message, lang } */
/** POST /chat { model, message, lang, conversationId? } */
r.post("/", requireAuth, async (req, res) => {
  try {
    const { model = "llama3.1", message = "", lang = "en", conversationId } = req.body || {};
    if (!message) return res.status(400).json({ error: "message required" });
    if (!HF_MODELS[model]) { /* or OLLAMA_MODELS if you use Ollama */ /* unchanged */ }

    // ensure conversation exists OR create new if none provided
    let convId = conversationId;
    if (!convId) {
      const ins = db.prepare(`INSERT INTO conversations (user_id, title) VALUES (?, ?)`)
        .run(req.user.uid, message.length > 40 ? message.slice(0, 40) + "…" : message);
      convId = ins.lastInsertRowid;
    } else {
      // touch updated_at
      db.prepare(`
        UPDATE conversations SET updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?
      `).run(convId, req.user.uid);
    }

    const add = db.prepare("INSERT INTO messages (user_id, conversation_id, model, role, content) VALUES (?, ?, ?, ?, ?)");
    add.run(req.user.uid, convId, model, "user", message);

    // call your model (HF or Ollama) -> reply
    const reply = await callHFChat({ modelId: HF_MODELS[model], userMessage: message });

    add.run(req.user.uid, convId, model, "assistant", reply);

    res.json({ reply, model, lang, conversationId: convId });
  } catch (e) {
    console.error(e?.response?.data || e?.message || e);
    res.status(502).json({ error: "LLM error" });
  }
});



/** Optional: list models for the mobile dropdown */
r.get("/models", (_req, res) => {
    res.json({ models: Object.keys(HF_MODELS) });
});


export default r;
