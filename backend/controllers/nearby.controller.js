const nearbyService = require("../services/nearby.service");

exports.getNearbyEssentials = async (req, res) => {
  try {
    const results = await nearbyService.findNearbyEssentials(req.query);

    return res.status(200).json(results);
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      message: statusCode === 500 ? "Server error while fetching nearby essentials" : error.message
    });
  }
};
