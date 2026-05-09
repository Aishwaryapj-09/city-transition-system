import React, { useState } from "react";
import API from "../services/api";

const ESSENTIAL_TYPES = [
  { value: "hospital", label: "Hospital" },
  { value: "school", label: "School" },
  { value: "bank", label: "Bank" },
  { value: "supermarket", label: "Supermarket" },
  { value: "bus_stop", label: "Bus Stop" }
];

function NearbyEssentials() {
  const [location, setLocation] = useState("12.9716,77.5946");
  const [type, setType] = useState("hospital");
  const [radius, setRadius] = useState("3000");
  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState("");

  const useCurrentLocation = () => {
    setStatus("Getting your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);

        setLocation(`${lat},${lng}`);
        setStatus("Location ready");
      },
      () => {
        setStatus("Location permission was not available");
      }
    );
  };

  const searchEssentials = async () => {
    const [lat, lng] = location.split(",").map((item) => item.trim());

    if (!lat || !lng) {
      setStatus("Enter location as latitude,longitude");
      return;
    }

    try {
      setStatus("Searching nearby essentials...");

      const response = await API.get("/nearby", {
        params: {
          lat,
          lng,
          type,
          radius
        }
      });

      setPlaces(response.data.places || []);
      setStatus(`${response.data.count || 0} places found`);
    } catch (error) {
      setPlaces([]);
      setStatus(error.response?.data?.message || "Unable to fetch nearby essentials");
    }
  };

  return (
    <div className="acc-container essentials-page">
      <h1>Nearby Essentials Finder</h1>
      <p>Find hospitals, schools, banks, supermarkets and bus stops around your new city area.</p>

      <div className="search-area essentials-search">
        <button className="loc-btn" onClick={useCurrentLocation}>
          Use My Location
        </button>

        <input
          placeholder="12.9716,77.5946"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />

        <select value={type} onChange={(event) => setType(event.target.value)}>
          {ESSENTIAL_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select value={radius} onChange={(event) => setRadius(event.target.value)}>
          <option value="1000">1 km</option>
          <option value="3000">3 km</option>
          <option value="5000">5 km</option>
          <option value="10000">10 km</option>
        </select>

        <button className="search-btn" onClick={searchEssentials}>
          Search
        </button>
      </div>

      {status && <p className="status-text">{status}</p>}

      <div className="acc-grid">
        {places.map((place) => (
          <div className="acc-card essentials-card" key={place.id}>
            <div className="card-body">
              <span className="type-pill">{place.category}</span>
              <h3>{place.name}</h3>
              <p>{place.address || "Address details not listed in OpenStreetMap"}</p>
              <p>
                Location: {Number(place.lat).toFixed(4)}, {Number(place.lng).toFixed(4)}
              </p>
              <a
                className="view-btn map-link"
                href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=17/${place.lat}/${place.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Open Map
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NearbyEssentials;
