require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const accommodationRoutes = require("./routes/accommodation.routes");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(helmet());
app.use(express.json({ limit: "10kb" }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(globalLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/accommodation", accommodationRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.use(errorMiddleware);

module.exports = app;