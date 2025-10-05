import { Router } from "express";
import { requireAuth } from "../util/auth.js";
import db from "../db.js";

const r = Router();

r.get("/", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT id, model, role, content, ts
    FROM messages
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT 200
  `).all(req.user.uid);
  res.json({ items: rows });
});

export default r;
