require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

// Only connect to the real database outside Jest tests.
if (process.env.NODE_ENV !== "test") {
  if (!MONGO_URI) {
    console.error("Missing MONGO_URI");
    process.exit(1);
  }

  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log("MongoDB Connected");

      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Database connection failed:", err.message);
      process.exit(1);
    });
}
