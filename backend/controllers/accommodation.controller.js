const axios = require("axios");
const Listing = require("../models/listing.model");
const { calculateDistanceKm } = require("../services/distance.service");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

function getElementCoordinates(element) {
  return {
    lat: element.lat || element.center?.lat,
    lng: element.lon || element.center?.lon
  };
}

function getAccommodationCategory(tags = {}) {
  if (tags.tourism === "hostel" || tags.tourism === "guest_house") {
    return "hostel";
  }

  if (tags.tourism === "hotel") {
    return "hotel";
  }

  return "apartment";
}

function normalizeApiListing(element, origin) {
  const coordinates = getElementCoordinates(element);

  if (!element.tags?.name || !Number.isFinite(Number(coordinates.lat)) || !Number.isFinite(Number(coordinates.lng))) {
    return null;
  }

  const category = getAccommodationCategory(element.tags);

  return {
    id: `${element.type}-${element.id}`,
    title: element.tags.name,
    name: element.tags.name,
    description: element.tags.tourism || element.tags.building || "Accommodation",
    category,
    source: "openstreetmap",
    lat: Number(coordinates.lat),
    lon: Number(coordinates.lng),
    distanceKm: calculateDistanceKm(origin.lat, origin.lng, coordinates.lat, coordinates.lng),
    location: {
      type: "Point",
      coordinates: [Number(coordinates.lng), Number(coordinates.lat)]
    }
  };
}

function normalizeOwnerListing(listing, origin) {
  const item = typeof listing.toObject === "function" ? listing.toObject() : listing;
  const lon = item.location?.coordinates?.[0];
  const lat = item.location?.coordinates?.[1];

  return {
    ...item,
    id: String(item._id || item.id || item.title),
    name: item.title,
    price: item.rent,
    source: "owner",
    lat,
    lon,
    distanceKm: calculateDistanceKm(origin.lat, origin.lng, lat, lon),
    category: String(item.type || "").toLowerCase()
  };
}

function groupAccommodation(results) {
  return {
    hotels: results.filter((place) => place.category === "hotel"),
    hostels: results.filter((place) => place.category === "hostel"),
    apartments: results.filter((place) => place.category === "apartment" || place.category === "pg")
  };
}

async function resolveLocation(location) {
  if (location.includes(",")) {
    const [lat, lng] = location.split(",").map(Number);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const error = new Error("Location coordinates must be valid latitude,longitude");
      error.statusCode = 400;
      throw error;
    }

    return { lat, lng };
  }

  const geo = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: {
      q: location,
      format: "json",
      limit: 1
    },
    headers: {
      "User-Agent": "city-transition-system-app"
    },
    timeout: 10000
  });

  if (!geo.data || geo.data.length === 0) {
    const error = new Error("Location not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    lat: Number(geo.data[0].lat),
    lng: Number(geo.data[0].lon)
  };
}

exports.searchAccommodation = async (req, res) => {
  try {
    const { location } = req.query;

    if (!location) {
      return res.status(400).json({
        message: "Location is required"
      });
    }

    const origin = await resolveLocation(location);
    const radiusMeters = 5000;

    const ownerListings = await Listing.find({
      isVerified: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [origin.lng, origin.lat]
          },
          $maxDistance: radiusMeters
        }
      }
    });

    const query = `
      [out:json][timeout:25];
      (
        node["tourism"="hotel"](around:${radiusMeters},${origin.lat},${origin.lng});
        way["tourism"="hotel"](around:${radiusMeters},${origin.lat},${origin.lng});
        node["tourism"="hostel"](around:${radiusMeters},${origin.lat},${origin.lng});
        way["tourism"="hostel"](around:${radiusMeters},${origin.lat},${origin.lng});
        node["tourism"="guest_house"](around:${radiusMeters},${origin.lat},${origin.lng});
        way["tourism"="guest_house"](around:${radiusMeters},${origin.lat},${origin.lng});
        node["building"="apartments"](around:${radiusMeters},${origin.lat},${origin.lng});
        way["building"="apartments"](around:${radiusMeters},${origin.lat},${origin.lng});
      );
      out center tags;
    `;

    const apiResponse = await axios.post(OVERPASS_URL, query, {
      headers: {
        "Content-Type": "text/plain",
        "User-Agent": "city-transition-system-app"
      },
      timeout: 15000
    });

    const apiListings = (apiResponse.data.elements || [])
      .map((element) => normalizeApiListing(element, origin))
      .filter(Boolean);

    const verifiedOwnerListings = ownerListings.map((listing) => normalizeOwnerListing(listing, origin));
    const unique = new Map();

    [...verifiedOwnerListings, ...apiListings]
      .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
      .forEach((item) => {
        const key = `${item.source}-${String(item.title || item.name).toLowerCase()}-${item.lat}-${item.lon}`;

        if (!unique.has(key)) {
          unique.set(key, item);
        }
      });

    const grouped = groupAccommodation(Array.from(unique.values()));

    return res.status(200).json({
      hotels: grouped.hotels.slice(0, 12),
      hostels: grouped.hostels.slice(0, 12),
      apartments: grouped.apartments.slice(0, 12),
      searchLocation: origin
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      message: statusCode === 500 ? "Server error while searching accommodation" : error.message
    });
  }
};
