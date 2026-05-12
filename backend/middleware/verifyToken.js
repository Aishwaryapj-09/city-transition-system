const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ message: "Access Denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");

    req.user = decoded;  // attach user data to request
    next();

  } catch (err) {
    return res.status(400).json({ message: "Invalid Token" });
  }
};

module.exports = verifyToken;