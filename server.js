// server.js
require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const userRoutes = require("./routes/users.routes");
const authRoutes = require("./routes/auth.routes");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

// connect DB
connectDB(process.env.MONGO_URI).catch((err) => {
  console.error("Mongo connection failed:", err.message);
  process.exit(1);
});

// basic security + logging
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10kb" })); // avoid huge payloads
app.use(cookieParser());

// rate limit auth endpoints (throttle brute force)
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // generous for dev; tweak in prod
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

// health check (Railway can use this)
app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "dev" });
});

// routes
app.use("/api/users", userRoutes); // /register, /me
app.use("/api/auth", authRoutes);  // /login

// 404 + errors
app.use(notFound);
app.use(errorHandler);

// boot
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
