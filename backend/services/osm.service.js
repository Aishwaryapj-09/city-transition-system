const axios = require("axios");

exports.fetchNearbyStay = async (lat, lng) => {

  const query = `
  [out:json];
  (
    node["tourism"="hotel"](around:3000,${lat},${lng});
    node["tourism"="hostel"](around:3000,${lat},${lng});
    node["tourism"="guest_house"](around:3000,${lat},${lng});
    node["tourism"="apartment"](around:3000,${lat},${lng});
  );
  out;
  `;

  const response = await axios.post(
    "https://overpass-api.de/api/interpreter",
    query
  );

  const places = response.data.elements;

  const hotels = [];
  const hostels = [];
  const apartments = [];

  places.forEach((p) => {

    const type = p.tags?.tourism;

    const place = {
      name: p.tags?.name || "Accommodation",
      lat: p.lat,
      lon: p.lon,
      category: type
    };

    if (type === "hotel") hotels.push(place);
    else if (type === "hostel" || type === "guest_house") hostels.push(place);
    else apartments.push(place);

  });

  return {
    hotels,
    hostels,
    apartments
  };

};