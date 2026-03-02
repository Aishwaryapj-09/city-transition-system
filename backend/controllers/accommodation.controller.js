const Listing = require("../models/listing.model");
const { fetchNearbyStay } = require("./osm.service");

exports.searchAccommodation = async (req, res, next) => {
  try {
    const { lat, lng, area, minRent, maxRent } = req.query;

    let filter = { isVerified: true };

    if (area) filter.area = area;

    if (minRent && maxRent) {
      filter.rent = {
        $gte: Number(minRent),
        $lte: Number(maxRent)
      };
    }

    const dbListings = await Listing.find(filter);

    let osmListings = [];
    if (lat && lng) {
      osmListings = await fetchNearbyStay(lat, lng);
    }

    res.status(200).json({
      internalRentals: dbListings,
      nearbyHotels: osmListings
    });

  } catch (error) {
    next(error);
  }
};