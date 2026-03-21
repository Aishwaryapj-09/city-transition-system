const express = require("express");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");

const { registerUser, loginUser } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Try again later."
});

// REGISTER
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Min 6 chars password")
  ],
  async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    registerUser(req, res, next);
  }
);

// LOGIN
router.post(
  "/login",
  loginLimiter,
  [
    body("email").isEmail(),
    body("password").notEmpty()
  ],
  async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    loginUser(req, res, next);
  }
);

// PROTECTED
router.get("/protected", verifyToken, (req, res) => {
  res.json({ message: "Protected data", user: req.user });
});

// ADMIN
router.get(
  "/admin",
  verifyToken,
  authorize("admin"),
  (req, res) => {
    res.json({ message: "Admin panel" });
  }
);

module.exports = router;