const axios = require("axios");

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter"
];

async function fetchOverpass(query, timeout = 20000) {
  const errors = [];

  for (const url of OVERPASS_URLS) {
    try {
      const response = await axios.post(url, query, {
        headers: {
          "Content-Type": "text/plain",
          "User-Agent": "city-transition-system-app/1.0"
        },
        timeout
      });

      return response.data;
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
    }
  }

  const failure = new Error(`OpenStreetMap live data is temporarily unavailable. Tried ${OVERPASS_URLS.length} Overpass servers.`);
  failure.cause = errors;
  throw failure;
}

module.exports = {
  OVERPASS_URLS,
  fetchOverpass
};
