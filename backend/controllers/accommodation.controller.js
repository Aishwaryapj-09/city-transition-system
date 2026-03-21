const Listing = require("../models/listing.model");
const axios = require("axios");

exports.searchAccommodation = async (req, res) => {

  try {

    const { location } = req.query;

    if (!location) {
      return res.status(400).json({
        message: "Location is required"
      });
    }

    let lat;
    let lng;

    // Convert place name → coordinates
    if (!location.includes(",")) {

      const geo = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: location,
            format: "json",
            limit: 1
          },
          headers: {
            "User-Agent": "city-transition-system-app"
          }
        }
      );

      if (!geo.data || geo.data.length === 0) {
        return res.status(404).json({
          message: "Location not found"
        });
      }

      lat = parseFloat(geo.data[0].lat);
      lng = parseFloat(geo.data[0].lon);

    } else {

      const coords = location.split(",");
      lat = parseFloat(coords[0]);
      lng = parseFloat(coords[1]);

    }


    // Haversine distance function
    function getDistance(lat1, lon1, lat2, lon2) {

      const R = 6371;

      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    }


    // Fetch approved owner listings
    const ownerListings = await Listing.find({

      isVerified: true,

      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          $maxDistance: 4000
        }
      }

    });


    // Fetch API listings
    const query = `
    [out:json];
    (
      node["tourism"="hotel"](around:4000,${lat},${lng});
      node["tourism"="hostel"](around:4000,${lat},${lng});
      node["tourism"="guest_house"](around:4000,${lat},${lng});
      node["building"="apartments"](around:4000,${lat},${lng});
    );
    out;
    `;

    const apiResponse = await axios.post(
      "https://overpass-api.de/api/interpreter",
      query,
      {
        headers: {
          "Content-Type": "text/plain"
        }
      }
    );

    const places = apiResponse.data.elements || [];


    const apiListings = places
.filter(place => place.tags && place.tags.name)
.filter(place => place.lat && place.lon)   // 🔹 prevent undefined coords
.filter(place => {

const dist = getDistance(lat, lng, place.lat, place.lon);

return dist <= 4;

})
     .map(place => ({
title: place.tags.name,
description: place.tags.tourism || "Accommodation",
price: Math.floor(Math.random() * 2000) + 500,
rating: (Math.random() * 2 + 3).toFixed(1),
location: {
type: "Point",
coordinates: [Number(place.lon), Number(place.lat)]
}
}));

    // Merge API + owner listings
    const combined = [...apiListings, ...ownerListings];


    // Remove duplicates
    const unique = new Map();

combined.forEach(item => {

const key = item.title.toLowerCase();

if(!unique.has(key)){
unique.set(key,item);
}

});

const results = Array.from(unique.values());

   


    // Categorize
    const hotels = results.filter(p =>
      p.title?.toLowerCase().includes("hotel")
    );

    const hostels = results.filter(p =>
      p.title?.toLowerCase().includes("hostel") ||
      p.title?.toLowerCase().includes("guest")
    );

    const apartments = results.filter(p =>
      p.title?.toLowerCase().includes("apartment") ||
      p.title?.toLowerCase().includes("pg")
    );


    return res.status(200).json({

      hotels: hotels.slice(0, 6),
      hostels: hostels.slice(0, 6),
      apartments: apartments.slice(0, 6),

      searchLocation: {
        lat,
        lng
      }

    });

  } catch (error) {

    console.error("Accommodation Search Error:", error);

    return res.status(500).json({
      message: "Server error while searching accommodation"
    });

  }

};