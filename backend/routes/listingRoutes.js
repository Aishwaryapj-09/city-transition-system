const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');
const verifyToken = require('../middleware/verifyToken');
const { validateListing } = require('../middleware/validateListing');

router.post(
  '/',
  verifyToken,
  validateListing,
  listingController.addListing
);

router.get('/', listingController.getListings);

module.exports = router;