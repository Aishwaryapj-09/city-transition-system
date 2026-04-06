import React, { useState } from "react";

const AccommodationCard = ({ place, userLat, userLon }) => {

  const [showDetails, setShowDetails] = useState(false);

  // ✅ TITLE
  const title = place.name || place.title || "No Name";

  // ✅ LAT / LON
  const lat =
    place.lat ||
    place.location?.coordinates?.[1];

  const lon =
    place.lon ||
    place.location?.coordinates?.[0];

  // ✅ LOCATION DISPLAY
  const displayLocation =
    place.location && typeof place.location === "string" && place.location.trim() !== ""
      ? place.location
      : lat && lon
        ? `${lat.toFixed(4)}, ${lon.toFixed(4)}`
        : "Location not available";

  // ✅ FINAL PRICE LOGIC (NO ZERO EVER)
  let price;

  if (place.source === "owner") {
    // 🔥 OWNER: use actual rent
    price = place.price;

    // fallback if backend gave 0 or undefined
    if (!price || price === 0) {
      price = Math.floor(Math.random() * 5000) + 500;
    }

  } else {
    // 🔥 API: always random ₹50
    // 0–₹5000
    price = Math.floor(Math.random() * 4500) + 500;
  }

  // ✅ RATING
  const rating = Number(place.rating || 4).toFixed(1);

  // ✅ IMAGE
  const image = `https://source.unsplash.com/400x250/?hotel,${title}`;

  // ✅ DISTANCE FUNCTION
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;

    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
  }

  let distance = "N/A";

  if (userLat && userLon && lat && lon) {
    distance = calculateDistance(userLat, userLon, lat, lon);
  }

  return (
    <div className="acc-card">

      <img src={image} alt="stay" />

      <div className="card-body">

        <h3>{title}</h3>

        {/* ✅ VERIFIED */}
        {place.source === "owner" && (
          <p style={{ color: "lightgreen" }}>✔ Verified Listing</p>
        )}

        <p>⭐ Rating: {rating}</p>

        <p>📍 {displayLocation}</p>

        <p>
          📏 Distance: {distance !== "N/A" ? `${distance} km` : "N/A km"}
        </p>

        <p>
          💰 ₹{price} {place.source === "owner" ? "/month" : "/night"}
        </p>

        <button
          className="view-btn"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? "Hide Details" : "View Details"}
        </button>

        {showDetails && (
          <div className="details-box">
            <p>
              <b>Description:</b> Comfortable stay near city center with easy access to transport and food spots.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default AccommodationCard;