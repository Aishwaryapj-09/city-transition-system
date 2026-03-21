const express = require("express");

const router = express.Router();

const {
searchAccommodation
} = require("../controllers/accommodation.controller");

router.get("/",searchAccommodation);

module.exports = router;