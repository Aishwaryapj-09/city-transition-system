const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {

  if (!req.headers || !req.headers.authorization) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();

  } catch (error) {
    return res.status(401).json({ message: "Token invalid" });
  }
};

module.exports = protect;
