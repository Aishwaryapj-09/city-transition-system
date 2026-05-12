const Listing = require("../models/listing.model");

const mongoose = require("mongoose");
/* ================= CREATE LISTING ================= */
exports.createListing = async (req, res) => {
  try {

    console.log("USER:", req.user);

    const listing = new Listing({
      ...req.body,
      ownerId: req.user._id || req.user.id   // 🔥 handles both id/_id
    });

    await listing.save();

    res.json({ message: "Listing created successfully" });

  } catch (err) {
    console.error("FULL ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};


/* ================= GET VERIFIED (FOR USERS) ================= */
exports.getListings = async (req, res) => {
  try {
    const listings = await Listing.find({ isVerified: true });
    res.json(listings);
  } catch {
    res.status(500).json({ message: "Error" });
  }
};


/* ================= OWNER LISTINGS ================= */
exports.getMyListings = async (req, res) => {
  try {

    const listings = await Listing.find({
      ownerId: req.user._id || req.user.id   // 🔥 FIXED
    });

    res.json(listings);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error" });
  }
};


/* ================= UPDATE (OWNER ONLY) ================= */
exports.updateListing = async (req, res) => {
  try {
if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({ message: "Invalid ID" });
}
    const listing = await Listing.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerId: req.user._id || req.user.id   // 🔐 secure
      },
      req.body,
      { new: true }
    );

    if (!listing) {
      return res.status(403).json({ message: "Not allowed" });
    }

    res.json(listing);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
};


/* ================= DELETE (OWNER ONLY) ================= */
exports.deleteListing = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({ message: "Invalid ID" });
}
    const listing = await Listing.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user._id || req.user.id   // 🔐 secure
    });

    if (!listing) {
      return res.status(403).json({ message: "Not allowed" });
    }

    res.json({ message: "Deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error" });
  }
};


/* ================= ADMIN VERIFY ================= */
exports.verifyListing = async (req, res) => {
 
  try {
 if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({ message: "Invalid ID" });
}
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.isVerified) {
      return res.status(400).json({ message: "Already verified" });
    }

    listing.isVerified = true;
    await listing.save();

    res.json({
      message: "Listing verified successfully",
      listing
    });

  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ message: "Verification failed" });
  }
};


/* ================= ADMIN PENDING ================= */
exports.getPendingListings = async (req, res) => {
  try {

    const listings = await Listing.find({
      isVerified: false   // 🔥 only pending
    });

    res.json(listings);

  } catch (err) {
    console.error("Pending error:", err);
    res.status(500).json({ message: "Error fetching pending listings" });
  }
};


/* ================= SEARCH ================= */
exports.searchListings = async (req, res) => {
  try {

    const { location = "" } = req.query;
    let listings = [];

    if (location && location.includes(",")) {

      const [lat, lon] = location.split(",").map(Number);

     listings = await Listing.find({
  isVerified: true,
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [lon, lat]
      },
      $maxDistance: 20000
    }
  }
}).limit(50);

    }  else {

  listings = await Listing.find({
    isVerified: true,
    ...(location && {
      area: { $regex: location, $options: "i" }
    })
  });

}

    const results = listings.map(item => ({
      name: item.title,
      rating: 4,
      location: item.area,
      price: item.rent,
      lat: item.location.coordinates?.[1],
      lon: item.location.coordinates?.[0],
      source: "owner"
    }));

    res.json(results);

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Search failed" });
  }
};
