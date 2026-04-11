require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false, // 🔥 THIS FIXES YOUR ERROR
  },

  max: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on("connect", () => {
  console.log("✅ DB pool connected to Supabase");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected DB error:", err);
});

module.exports = pool;