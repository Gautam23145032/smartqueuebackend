const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const cookieParser = require("cookie-parser");
const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://your-frontend.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

const authRoutes = require("./routes/auth.routes");
const queueRoutes = require("./routes/queue.routes");

app.use("/auth", authRoutes);
app.use("/queues", queueRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "server is running" });
});


app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM queues;");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

module.exports = app;
