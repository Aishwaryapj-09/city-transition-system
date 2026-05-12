function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const fromLat = Number(lat1);
  const fromLng = Number(lng1);
  const toLat = Number(lat2);
  const toLng = Number(lng2);

  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
    return null;
  }

  const radiusKm = 6371;
  const dLat = (toLat - fromLat) * Math.PI / 180;
  const dLng = (toLng - fromLng) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(fromLat * Math.PI / 180) *
    Math.cos(toLat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;

  return Number((radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

module.exports = { calculateDistanceKm };
