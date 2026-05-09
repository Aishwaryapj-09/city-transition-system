import React, { useState } from "react";

const NearbyEssentialCard = ({ place }) => {
  const [showDetails, setShowDetails] = useState(false);

  const lat = Number(place.lat);
  const lng = Number(place.lng);
  const distance = Number(place.distanceKm);
  const mapUrl = Number.isFinite(lat) && Number.isFinite(lng)
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
    : null;

  return (
    <div className="acc-card result-card essentials-card">
      <div className="card-body">
        <div className="card-topline">
          <span className="result-pill">{place.category || place.type || "Essential"}</span>
          <span className="mini-chip">
            {Number.isFinite(distance) ? `${distance.toFixed(2)} km` : "Distance NA"}
          </span>
        </div>

        <h3>{place.name}</h3>

        {place.address && <p className="card-muted">{place.address}</p>}

        <div className="metric-row">
          <div>
            <span>Latitude</span>
            <strong>{Number.isFinite(lat) ? lat.toFixed(4) : "NA"}</strong>
          </div>
          <div>
            <span>Longitude</span>
            <strong>{Number.isFinite(lng) ? lng.toFixed(4) : "NA"}</strong>
          </div>
        </div>

        <div className="card-actions">
          <button className="view-btn" onClick={() => setShowDetails(!showDetails)}>
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
            <p><strong>Category:</strong> {place.category || "Essential service"}</p>
            <p><strong>Coordinates:</strong> {Number.isFinite(lat) && Number.isFinite(lng) ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Not available"}</p>
            <p><strong>Distance:</strong> {Number.isFinite(distance) ? `${distance.toFixed(2)} km from selected place` : "Not available"}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyEssentialCard;
