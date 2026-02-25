const Listing = require('../models/Listing');
const { validationResult } = require('express-validator');

// Add Listing
exports.addListing = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const listing = new Listing({
      title: req.body.title,
      description: req.body.description,
      location: req.body.location,
      price: req.body.price,
      type: req.body.type,
      owner: req.user.id, // From JWT
      approved: false
    });

    await listing.save();
    res.status(201).json({ message: "Listing submitted for approval" });

  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};


// Search Listings
exports.getListings = async (req, res) => {
  try {

    let filter = { approved: true };

    if (req.query.location) {
      filter.location = req.query.location;
    }

    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice)
        filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice)
        filter.price.$lte = Number(req.query.maxPrice);
    }

    const listings = await Listing.find(filter)
      .limit(20)  // Prevent DoS
      .sort({ createdAt: -1 });

    res.json(listings);

  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};