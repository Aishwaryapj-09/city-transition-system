const express = require("express");

const router = express.Router();
const nearbyController = require("../controllers/nearby.controller");

router.get("/", nearbyController.getNearbyEssentials);

module.exports = router;
