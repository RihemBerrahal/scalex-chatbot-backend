import "dotenv/config";
import express from "express";
import cors from "cors";
import "./db.js";                 // ensure tables exist
import authRouter from "./routes/auth.js";
import chatRouter from "./routes/chat.js";  
import historyRouter from "./routes/history.js";
import summaryRouter from "./routes/summary.js";
import conversationsRouter from "./routes/conversations.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true, service: "scalex-server" }));
app.use("/auth", authRouter);
app.use("/chat", chatRouter);
app.use("/history", historyRouter);
app.use("/summary", summaryRouter);
app.use("/conversations", conversationsRouter);



const PORT = process.env.PORT || 5050;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${PORT}`);
});
