const bcrypt = require("bcrypt");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const { generateAccessToken, generateRefreshToken } = require("../utils/jwt");

// REGISTER
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if(email === ''){
      return res.status(400).json({error : "Email required"})
    }
    
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }
    if (!["host", "client"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    if(password.length < 6){
      return res.status(400).json({error: "Password too short"});
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1,$2,$3,$4)`,
      [name, email, hashedPassword, role]
    );

    res.status(201).json({ message: "User registered successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
};


// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT id, name, password, role FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Access token payload
    const accessToken = generateAccessToken({
      id: user.id,
      role: user.role,
      name: user.name,
    });

    // Refresh token payload
    const refreshToken = generateRefreshToken({
      id: user.id
    });

    await pool.query(
      `INSERT INTO refresh_tokens(user_id, token, expires_at)
       VALUES ($1,$2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken]
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax"
    });

    res.json({
      message: "Logged in successfully",
      accessToken
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
};


// REFRESH TOKEN
const refresh = async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ error: "Refresh token missing" });
  }

  try {

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const dbResult = await pool.query(
      `SELECT * FROM refresh_tokens
      WHERE token=$1
      AND revoked=false
      AND expires_at > NOW()`,
      [token]
    );

    if (dbResult.rows.length === 0) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    // Get user again from DB
    const userResult = await pool.query(
      "SELECT id,name,role FROM users WHERE id=$1",
      [payload.id]
    );

    const user = userResult.rows[0];

    const newAccessToken = generateAccessToken({
      id: user.id,
      role: user.role,
      name: user.name
    });

    res.json({ accessToken: newAccessToken });

  } catch (err) {
    return res.status(401).json({ error: "Token expired" });
  }
};


// LOGOUT
const logout = async (req, res) => {

  const token = req.cookies.refreshToken;

  if (token) {
    await pool.query(
      "UPDATE refresh_tokens SET revoked=true WHERE token=$1",
      [token]
    );
  }

  res.clearCookie("refreshToken");

  res.json({ message: "Logged out successfully" });
};


module.exports = { register, login, refresh, logout };