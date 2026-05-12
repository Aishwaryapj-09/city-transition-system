const axios = require("axios");

async function fetchNearbyStay(lat, lng, radius = 3000) {

  const query = `
    [out:json];
    (
      node["tourism"="hotel"](around:${radius},${lat},${lng});
      node["tourism"="guest_house"](around:${radius},${lat},${lng});
      node["tourism"="hostel"](around:${radius},${lat},${lng});
    );
    out;
  `;

  const response = await axios.post(
    "https://overpass-api.de/api/interpreter",
    query,
    {
      headers: { "Content-Type": "text/plain" },
      timeout: 10000
    }
  );

  return response.data.elements;
}

module.exports = { fetchNearbyStay };