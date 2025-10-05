import fs from "fs";
import path from "path";

const dbFile = path.resolve("scalex.db");

if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
  console.log("🗑️  Database deleted successfully!");
} else {
  console.log("⚠️  No existing database found.");
}

console.log("✅ Run 'npm run dev' to recreate the database.");
