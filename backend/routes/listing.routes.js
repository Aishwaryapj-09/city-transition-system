const express = require("express");
const router = express.Router();

const listingController = require("../controllers/listing.controller");

const { verifyToken } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");


// 🔥 SEARCH (MUST BE ABOVE "/")
router.get("/search", listingController.searchListings);


// GET ALL VERIFIED
router.get("/", listingController.getListings);


// CREATE
router.post(
  "/",
  verifyToken,
  authorize("owner"),
  listingController.createListing
);


// OWNER LISTINGS
router.get(
  "/my",
  verifyToken,
  authorize("owner"),
  listingController.getMyListings
);
// 🔥 ADMIN - GET PENDING LISTINGS
router.get(
  "/pending",
  verifyToken,
  authorize("admin"),
  listingController.getPendingListings
);

// VERIFY
router.patch(
  "/verify/:id",
  verifyToken,
  authorize("admin"),
  listingController.verifyListing
);
// 🔥 UPDATE (OWNER ONLY)
router.put(
  "/:id",
  verifyToken,
  authorize("owner"),
  listingController.updateListing
);

// DELETE
router.delete(
  "/:id",
  verifyToken,
  authorize("owner"),
  listingController.deleteListing
);


module.exports = router;