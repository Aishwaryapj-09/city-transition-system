require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();


app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

// Security Middlewares
app.use(helmet());
app.use(cors());

app.use(express.json({ limit: "10kb" }));

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(globalLimiter);

// Routes
app.use("/api/auth", authRoutes);

// Health
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK"
  });
});

// Error Handler
app.use(errorMiddleware);

module.exports = app;