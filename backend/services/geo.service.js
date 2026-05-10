const axios = require("axios");

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "city-transition-system-app/1.0";

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseCoordinatePair(value) {
  const text = String(value || "").trim();
  const match = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);

  if (!match) {
    return null;
  }

  const lat = Number(match[1]);
  const lng = Number(match[2]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function validateCoordinates(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw createHttpError("Location coordinates must be valid latitude and longitude");
  }

  if (lat < -90 || lat > 90) {
    throw createHttpError("lat must be between -90 and 90");
  }

  if (lng < -180 || lng > 180) {
    throw createHttpError("lng must be between -180 and 180");
  }
}

async function reverseGeocode(lat, lng) {
  try {
    const response = await axios.get(NOMINATIM_REVERSE_URL, {
      params: {
        lat,
        lon: lng,
        format: "json"
      },
      headers: {
        "User-Agent": USER_AGENT
      },
      timeout: 10000
    });

    return response.data?.display_name || `${lat},${lng}`;
  } catch {
    return `${lat},${lng}`;
  }
}

async function reverseGeocodeCoordinates(lat, lng) {
  validateCoordinates(Number(lat), Number(lng));

  const response = await axios.get(NOMINATIM_REVERSE_URL, {
    params: {
      lat,
      lon: lng,
      format: "json",
      addressdetails: 1
    },
    headers: {
      "User-Agent": USER_AGENT
    },
    timeout: 10000
  });

  return {
    lat: Number(lat),
    lng: Number(lng),
    displayName: response.data?.display_name || `${lat},${lng}`,
    address: response.data?.address || {}
  };
}

async function geocodePlace(location) {
  const response = await axios.get(NOMINATIM_SEARCH_URL, {
    params: {
      q: location,
      format: "json",
      addressdetails: 1,
      limit: 1,
      countrycodes: "in"
    },
    headers: {
      "User-Agent": USER_AGENT
    },
    timeout: 10000
  });

  if (!response.data || response.data.length === 0) {
    throw createHttpError("Location not found", 404);
  }

  const lat = Number(response.data[0].lat);
  const lng = Number(response.data[0].lon);
  validateCoordinates(lat, lng);

  return {
    lat,
    lng,
    displayName: response.data[0].display_name || location,
    address: response.data[0].address || {}
  };
}

async function resolveLocation(input) {
  const location = String(input || "").trim();

  if (!location) {
    throw createHttpError("Location is required");
  }

  const coordinates = parseCoordinatePair(location);

  if (coordinates) {
    validateCoordinates(coordinates.lat, coordinates.lng);

    return {
      ...coordinates,
      displayName: await reverseGeocode(coordinates.lat, coordinates.lng)
    };
  }

  return geocodePlace(location);
}

module.exports = {
  createHttpError,
  geocodePlace,
  parseCoordinatePair,
  resolveLocation,
  reverseGeocode,
  reverseGeocodeCoordinates,
  validateCoordinates
};
