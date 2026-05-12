const express = require("express");

const router = express.Router();

const {
searchAccommodation
} = require("../controllers/accommodation.controller");

router.get("/",searchAccommodation);
router.get("/search",searchAccommodation);

module.exports = router;
