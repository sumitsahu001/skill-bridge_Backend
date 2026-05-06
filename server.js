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

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg = 'The CORS policy for this site does not ' +
                  'allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
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
app.use("/api/profile", require("./routes/profile.routes"));
app.use("/api/projects", require("./routes/project.routes"));
app.use("/api/jobs",    require("./routes/jobListing.routes"));
app.use("/api/stats",  require("./routes/stats.routes"));
app.use("/api/admin",  require("./routes/admin.routes"));

// 404 + errors
app.use(notFound);
app.use(errorHandler);

// boot
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
