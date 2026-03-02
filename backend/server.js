require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

if (!PORT || !MONGO_URI) {
  console.error("Missing environment variables");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");

    if (process.env.NODE_ENV !== "test") {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    }
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  });