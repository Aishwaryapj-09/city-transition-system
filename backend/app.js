require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const listingRoutes = require("./routes/listing.routes");
const accommodationRoutes = require("./routes/accommodation.routes");
const nearbyRoutes = require("./routes/nearby.routes");
const languageHelperRoutes = require("./routes/language-helper.routes");

const errorMiddleware = require("./middleware/errorMiddleware");
const { metricsHandler, metricsMiddleware } = require("./middleware/metrics.middleware");

const app = express();

// Security middleware.
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(helmet());

// Prometheus scrapes this endpoint. Keep it before the API rate limiter so
// monitoring never consumes public API quota.
app.get("/metrics", metricsHandler);
app.use(metricsMiddleware);

app.use(express.json({ limit: "10kb" }));

function healthHandler(req, res) {
  res.status(200).json({
    status: "OK",
    message: "Server running"
  });
}

// Kubernetes, Jenkins, Blackbox Exporter, and viva demos can use either path.
app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP. Try again later."
});

app.use(globalLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/accommodation", accommodationRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/nearby", nearbyRoutes);
app.use("/api/language-helper", languageHelperRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

app.use(errorMiddleware);

module.exports = app;
