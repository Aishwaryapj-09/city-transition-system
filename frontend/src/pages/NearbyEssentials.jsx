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
  const [area, setArea] = useState("Yeshwanthpur, Bengaluru");
  const [coordinates, setCoordinates] = useState("");
  const [type, setType] = useState("hospital");
  const [radius, setRadius] = useState("3000");
  const [sortBy, setSortBy] = useState("distance");
  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState("");

  const useCurrentLocation = () => {
    setStatus("Getting your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);

        setCoordinates(`${lat},${lng}`);
        setArea("");
        setStatus("Current location selected");
      },
      () => {
        setStatus("Location permission was not available. Enter an area name instead.");
      }
    );
  };

  const useAreaSearch = (event) => {
    setArea(event.target.value);
    setCoordinates("");
  };

  const sortResults = (results) => {
    return [...results].sort((a, b) => {
      if (sortBy === "name") {
        return String(a.name).localeCompare(String(b.name));
      }

      return Number(a.distanceKm || 9999) - Number(b.distanceKm || 9999);
    });
  };

  const searchEssentials = async () => {
    const params = {
      type,
      radius
    };

    if (coordinates) {
      const [lat, lng] = coordinates.split(",").map((item) => item.trim());
      params.lat = lat;
      params.lng = lng;
    } else if (area.trim()) {
      params.location = area.trim();
    } else {
      setStatus("Enter a place name or use your current location");
      return;
    }

    try {
      setStatus("Searching real nearby essentials...");

      const response = await API.get("/nearby", { params });
      const results = response.data.places || [];

      setPlaces(sortResults(results));
      setStatus(`${response.data.count || 0} places found`);
    } catch (error) {
      setPlaces([]);
      setStatus(error.response?.data?.message || error.message || "Unable to fetch nearby essentials");
    }
  };

  return (
    <div className="acc-container essentials-page">
      <h1>Nearby Essentials Finder</h1>
      <p>Find hospitals, schools, banks, supermarkets and bus stops near a place.</p>

      <div className="search-area essentials-search">
        <input
          aria-label="Area name"
          placeholder="Enter place name"
          value={area}
          onChange={useAreaSearch}
        />

        <button className="loc-btn" onClick={useCurrentLocation}>
          Use My Location
        </button>

        {coordinates && (
          <p className="status-text">Using current location: {coordinates}</p>
        )}

        <button className="search-btn" onClick={searchEssentials}>
          Find Essentials
        </button>
      </div>

      <div className="filter-bar">
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

        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="distance">Nearest first</option>
          <option value="name">Name A-Z</option>
        </select>

        <button onClick={searchEssentials}>
          Apply Filter
        </button>
      </div>

      {status && <p className="status-text">{status}</p>}

      <div className="acc-grid">
        {places.map((place) => (
          <div className="acc-card essentials-card" key={place.id}>
            <div className="card-body">
              <h3>{place.name}</h3>
              {place.address && <p>{place.address}</p>}
              <p>
                Location: {Number(place.lat).toFixed(4)}, {Number(place.lng).toFixed(4)}
              </p>
              <p>
                Distance: {Number.isFinite(Number(place.distanceKm)) ? `${Number(place.distanceKm).toFixed(2)} km` : "Not available"}
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
