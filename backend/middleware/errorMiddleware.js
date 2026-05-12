module.exports = (err, req, res) => {
  console.error("ERROR:", err);

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error"
  });
};