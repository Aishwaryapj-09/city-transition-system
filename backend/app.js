const express = require("express");
const helmet = require("helmet");

const app = express();

// Security middleware
app.use(helmet());

// Body parser
app.use(express.json());

// Health route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "City Transition System Backend Running"
  });
});

// Export app (IMPORTANT for testing)
module.exports = app;