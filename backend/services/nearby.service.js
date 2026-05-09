const axios = require("axios");
const { calculateDistanceKm } = require("./distance.service");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const ESSENTIAL_TYPES = {
  hospital: {
    label: "Hospital",
    selector: '["amenity"="hospital"]'
  },
  school: {
    label: "School",
    selector: '["amenity"="school"]'
  },
  bank: {
    label: "Bank",
    selector: '["amenity"="bank"]'
  },
  supermarket: {
    label: "Supermarket",
    selector: '["shop"="supermarket"]'
  },
  bus_stop: {
    label: "Bus Stop",
    selector: '["highway"="bus_stop"]'
  }
};

function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function parseCoordinate(value, name) {
  const coordinate = Number(value);

  if (!Number.isFinite(coordinate)) {
    throw createValidationError(`${name} must be a valid number`);
  }

  return coordinate;
}

function validateNearbyInput({ lat, lng, type, radius = 3000 }) {
  const normalizedType = String(type || "").trim().toLowerCase();

  if (!ESSENTIAL_TYPES[normalizedType]) {
    throw createValidationError("type must be one of hospital, school, bank, supermarket, bus_stop");
  }

  const parsedLat = parseCoordinate(lat, "lat");
  const parsedLng = parseCoordinate(lng, "lng");
  const parsedRadius = Number(radius);

  if (parsedLat < -90 || parsedLat > 90) {
    throw createValidationError("lat must be between -90 and 90");
  }

  if (parsedLng < -180 || parsedLng > 180) {
    throw createValidationError("lng must be between -180 and 180");
  }

  if (!Number.isFinite(parsedRadius) || parsedRadius < 100 || parsedRadius > 10000) {
    throw createValidationError("radius must be between 100 and 10000 meters");
  }

  return {
    lat: parsedLat,
    lng: parsedLng,
    radius: parsedRadius,
    type: normalizedType
  };
}

function buildNearbyQuery({ lat, lng, radius, type }) {
  const config = ESSENTIAL_TYPES[type];

  return `
    [out:json][timeout:25];
    (
      node${config.selector}(around:${radius},${lat},${lng});
      way${config.selector}(around:${radius},${lat},${lng});
      relation${config.selector}(around:${radius},${lat},${lng});
    );
    out center tags;
  `;
}

function getElementCoordinates(element) {
  return {
    lat: element.lat || element.center?.lat,
    lng: element.lon || element.center?.lon
  };
}

function toNearbyPlace(element, type, origin) {
  const coordinates = getElementCoordinates(element);

  if (!Number.isFinite(Number(coordinates.lat)) || !Number.isFinite(Number(coordinates.lng))) {
    return null;
  }

  return {
    id: `${element.type}-${element.id}`,
    name: element.tags?.name || ESSENTIAL_TYPES[type].label,
    type,
    category: ESSENTIAL_TYPES[type].label,
    lat: Number(coordinates.lat),
    lng: Number(coordinates.lng),
    distanceKm: calculateDistanceKm(origin.lat, origin.lng, coordinates.lat, coordinates.lng),
    address: element.tags?.["addr:full"] || element.tags?.["addr:street"] || "",
    source: "openstreetmap"
  };
}

async function findNearbyEssentials(input) {
  const options = validateNearbyInput(input);
  const query = buildNearbyQuery(options);

  const response = await axios.post(OVERPASS_URL, query, {
    headers: {
      "Content-Type": "text/plain",
      "User-Agent": "city-transition-system-app"
    },
    timeout: 10000
  });

  const places = (response.data.elements || [])
    .map((element) => toNearbyPlace(element, options.type, options))
    .filter(Boolean)
    .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
    .slice(0, 20);

  return {
    search: options,
    count: places.length,
    places
  };
}

module.exports = {
  ESSENTIAL_TYPES,
  buildNearbyQuery,
  findNearbyEssentials,
  validateNearbyInput
};
