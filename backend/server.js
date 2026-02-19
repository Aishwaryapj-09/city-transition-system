require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("API Running");
});

const PORT = process.env.PORT || 5000;
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);
const protect = require("./middleware/authMiddleware");
const authorize = require("./middleware/roleMiddleware");

app.get("/api/protected", protect, authorize("admin"), (req, res) => {
    res.json({ message: "Protected Route Accessed" });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
