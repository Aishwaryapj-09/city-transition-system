const Listing = require("../models/listing.model");
const { calculateDistanceKm } = require("../services/distance.service");
const { fetchOverpass } = require("../services/overpass.service");
const { resolveLocation } = require("../services/geo.service");

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

  if (tags.tourism === "hotel" || tags.tourism === "motel") {
    return "hotel";
  }

  return "apartment";
}

function hashText(value) {
  return String(value || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

function createDisplayRating(seed) {
  return Number((3.6 + (hashText(seed) % 14) / 10).toFixed(1));
}

function createEstimatedPrice(category, seed) {
  const basePrice = {
    hotel: 1800,
    hostel: 650,
    apartment: 9000,
    pg: 5500
  }[category] || 1200;

  return basePrice + (hashText(seed) % 9) * 350;
}

function formatAddress(tags = {}, fallback = "") {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"] || tags["addr:neighbourhood"],
    tags["addr:city"]
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return fallback.split(",").slice(0, 3).join(", ");
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
    price: createEstimatedPrice(category, `${element.type}-${element.id}-${element.tags.name}`),
    rating: createDisplayRating(`${element.type}-${element.id}-${element.tags.name}`),
    address: formatAddress(element.tags, origin.displayName),
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
    rating: Number.isFinite(Number(item.rating)) ? Number(item.rating) : createDisplayRating(item._id || item.title),
    address: item.address || item.area || "",
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

    let ownerListings = [];

    try {
      ownerListings = await Listing.find({
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
    } catch {
      ownerListings = [];
    }

    const query = `
      [out:json][timeout:25];
      (
        node["tourism"="hotel"](around:${radiusMeters},${origin.lat},${origin.lng});
        way["tourism"="hotel"](around:${radiusMeters},${origin.lat},${origin.lng});
        relation["tourism"="hotel"](around:${radiusMeters},${origin.lat},${origin.lng});
        node["tourism"="motel"](around:${radiusMeters},${origin.lat},${origin.lng});
        way["tourism"="motel"](around:${radiusMeters},${origin.lat},${origin.lng});
        node["tourism"="hostel"](around:${radiusMeters},${origin.lat},${origin.lng});
        way["tourism"="hostel"](around:${radiusMeters},${origin.lat},${origin.lng});
        relation["tourism"="hostel"](around:${radiusMeters},${origin.lat},${origin.lng});
        node["tourism"="guest_house"](around:${radiusMeters},${origin.lat},${origin.lng});
        way["tourism"="guest_house"](around:${radiusMeters},${origin.lat},${origin.lng});
        node["building"="apartments"](around:${radiusMeters},${origin.lat},${origin.lng});
        way["building"="apartments"](around:${radiusMeters},${origin.lat},${origin.lng});
      );
      out center tags;
    `;

    const apiResponse = await fetchOverpass(query, 20000);

    const apiListings = (apiResponse.elements || [])
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
      message: statusCode === 500 ? `Live accommodation fetch failed: ${error.message}` : error.message
    });
  }
};
