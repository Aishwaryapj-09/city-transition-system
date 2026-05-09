const { calculateDistanceKm } = require("./distance.service");
const { parseCoordinatePair, resolveLocation, validateCoordinates } = require("./geo.service");
const { fetchOverpass } = require("./overpass.service");

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

async function resolveNearbyLocation(input) {
  if (input.location) {
    return resolveLocation(input.location);
  }

  const coordinates = parseCoordinatePair(`${input.lat},${input.lng}`);

  if (!coordinates) {
    throw createValidationError("Enter a place name or allow current location");
  }

  validateCoordinates(coordinates.lat, coordinates.lng);

  return {
    ...coordinates,
    displayName: `${coordinates.lat},${coordinates.lng}`
  };
}

async function validateNearbyInput(input) {
  const { type, radius = 3000 } = input;
  const normalizedType = String(type || "").trim().toLowerCase();

  if (!ESSENTIAL_TYPES[normalizedType]) {
    throw createValidationError("type must be one of hospital, school, bank, supermarket, bus_stop");
  }

  const resolvedLocation = await resolveNearbyLocation(input);
  const parsedLat = parseCoordinate(resolvedLocation.lat, "lat");
  const parsedLng = parseCoordinate(resolvedLocation.lng, "lng");
  const parsedRadius = Number(radius);
  validateCoordinates(parsedLat, parsedLng);

  if (!Number.isFinite(parsedRadius) || parsedRadius < 100 || parsedRadius > 10000) {
    throw createValidationError("radius must be between 100 and 10000 meters");
  }

  return {
    lat: parsedLat,
    lng: parsedLng,
    radius: parsedRadius,
    type: normalizedType,
    displayName: resolvedLocation.displayName
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
  const options = await validateNearbyInput(input);
  const query = buildNearbyQuery(options);

  const response = await fetchOverpass(query, 20000);

  const places = (response.elements || [])
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
