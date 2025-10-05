import { Router } from "express";
import db from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

const r = Router();
const payload = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

r.post("/signup", (req, res) => {
  const parsed = payload.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
  const { email, password } = parsed.data;

  const hash = bcrypt.hashSync(password, 10);
  try {
    const st = db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)");
    const info = st.run(email, hash);
    const token = jwt.sign({ uid: info.lastInsertRowid, email }, process.env.JWT_SECRET || "dev_secret", { expiresIn: "7d" });
    res.json({ token });
  } catch (e) {
    res.status(409).json({ error: "Email already exists" });
  }
});

const loginSchema = z.object({
  email: z.string().trim(),
  // ✅ Login: only require non-empty (no 6-char rule here)
  password: z.string().min(1, "Password is required"),
});

r.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map(i => i.message).join(" • ");
    return res.status(400).json({ ok: false, code: "BAD_REQUEST", error: message });
  }

  const { email, password } = parsed.data;

  const user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  if (!user) {
    // 404: account not found
    return res.status(404).json({ ok: false, code: "NOT_FOUND", error: "account_not_found" });
    console.log(res.status(404).json);
    }

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    // 401: wrong password
    return res.status(401).json({ ok: false, code: "BAD_CREDENTIALS", error: "incorrect_password" });
  }

  const token = jwt.sign(
    { uid: user.id, email: user.email },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: "7d" }
  );
;
  return res.json({ ok: true, token });
  
});

export default r;
