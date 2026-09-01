import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/tynex_hosting";

export const pool = new Pool({
  connectionString,
});

// ডাটাবেস টেবিল ও কানেকশন টেস্ট করার ফাংশন
export async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log("🔌 Connected to PostgreSQL database successfully.");
  } finally {
    client.release();
  }
}

// হেল্পার ফাংশন: কোয়েরি এক্সিকিউট করার জন্য
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return res;
}