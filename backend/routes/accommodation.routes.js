const express = require("express");
const router = express.Router();
const validateAccommodationQuery = require("../middleware/validate.middleware");
const { searchAccommodation } = require("../controllers/accommodation.controller");

router.get("/search", validateAccommodationQuery, searchAccommodation);

module.exports = router;