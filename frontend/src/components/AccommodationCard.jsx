import React, { useState } from "react";

function calculateDistance(lat1, lon1, lat2, lon2) {
  const values = [lat1, lon1, lat2, lon2].map(Number);

  if (!values.every(Number.isFinite)) {
    return null;
  }

  const [fromLat, fromLon, toLat, toLon] = values;
  const R = 6371;
  const dLat = (toLat - fromLat) * Math.PI / 180;
  const dLon = (toLon - fromLon) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(fromLat * Math.PI / 180) *
    Math.cos(toLat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

const AccommodationCard = ({ place, userLat, userLon }) => {
  const [showDetails, setShowDetails] = useState(false);

  const title = place.name || place.title || "No Name";
  const lat = Number(place.lat ?? place.location?.coordinates?.[1]);
  const lon = Number(place.lon ?? place.location?.coordinates?.[0]);
  const distance =
    Number.isFinite(Number(place.distanceKm))
      ? Number(place.distanceKm)
      : calculateDistance(userLat, userLon, lat, lon);

  const displayLocation =
    place.address && String(place.address).trim() !== ""
      ? place.address
      : place.location && typeof place.location === "string" && place.location.trim() !== ""
        ? place.location
        : Number.isFinite(lat) && Number.isFinite(lon)
          ? `${lat.toFixed(4)}, ${lon.toFixed(4)}`
          : "Location not available";

  const priceText =
    Number.isFinite(Number(place.price))
      ? `Rs ${Number(place.price).toLocaleString("en-IN")}${place.category === "apartment" || place.category === "pg" ? " /month" : " /night"}`
      : "Price available on request";

  const ratingText = Number.isFinite(Number(place.rating))
    ? Number(place.rating).toFixed(1)
    : "4.1";

  const mapUrl = Number.isFinite(lat) && Number.isFinite(lon)
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`
    : null;

  return (
    <div className="acc-card result-card">
      <div className="card-body">
        <div className="card-topline">
          <span className="result-pill">{place.category || "Stay"}</span>
          <span className="mini-chip">{ratingText} / 5</span>
        </div>

        <h3>{title}</h3>

        <p className="card-muted">{displayLocation}</p>

        <div className="metric-row">
          <div>
            <span>Distance</span>
            <strong>{distance !== null ? `${distance.toFixed(2)} km` : "NA"}</strong>
          </div>
          <div>
            <span>Price</span>
            <strong>{priceText}</strong>
          </div>
        </div>

        <div className="card-actions">
          <button
            className="view-btn"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Hide Details" : "Show Details"}
          </button>

          {mapUrl && (
            <a className="map-link compact-map-link" href={mapUrl} target="_blank" rel="noreferrer">
              Open Map
            </a>
          )}
        </div>

        {showDetails && (
          <div className="details-box">
            <p>{place.description || place.category || "Accommodation details"}</p>
            <p><strong>Coordinates:</strong> {Number.isFinite(lat) && Number.isFinite(lon) ? `${lat.toFixed(5)}, ${lon.toFixed(5)}` : "Not available"}</p>
            <p><strong>Rating:</strong> {ratingText} / 5</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccommodationCard;
