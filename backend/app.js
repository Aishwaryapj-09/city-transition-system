require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const listingRoutes = require("./routes/listing.routes");
const accommodationRoutes = require("./routes/accommodation.routes");
const nearbyRoutes = require("./routes/nearby.routes");

const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();


// ---------------- SECURITY ----------------

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Security headers
app.use(helmet());

// Parse JSON body
app.use(express.json({ limit: "10kb" }));


// ---------------- RATE LIMIT ----------------

const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 15 minutes
  max: 100,                   // max requests
  message: "Too many requests from this IP. Try again later."
});

app.use(globalLimiter);


// ---------------- ROUTES ----------------

// Auth routes
app.use("/api/auth", authRoutes);

// All accommodation + listing features

// KEEP accommodation
app.use("/api/accommodation", accommodationRoutes);

// ADD this line 👇
app.use("/api/listings", listingRoutes);

// Nearby essentials finder
app.use("/api/nearby", nearbyRoutes);

// ---------------- HEALTH CHECK ----------------

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server running"
  });
});


// ---------------- 404 HANDLER ----------------

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});


// ---------------- GLOBAL ERROR HANDLER ----------------

app.use(errorMiddleware);


module.exports = app;
