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
  const [places, setPlaces] = useState([]);
  const [allPlaces, setAllPlaces] = useState([]);
  const [distanceFilter, setDistanceFilter] = useState("");
  const [status, setStatus] = useState("");
  const [searchMode, setSearchMode] = useState("place");

  const useCurrentLocation = () => {
    setStatus("Getting your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);

        setCoordinates(`${lat},${lng}`);
        setSearchMode("current");
        setStatus("Current location selected");
      },
      () => {
        setStatus("Location permission was not available. Enter an area name instead.");
      }
    );
  };

  const useAreaSearch = (event) => {
    setArea(event.target.value);
    setSearchMode("place");
  };

  const searchEssentials = async () => {
    const params = {
      type,
      radius
    };

    if (searchMode === "current" && coordinates) {
      const [lat, lng] = coordinates.split(",").map((item) => item.trim());
      params.lat = lat;
      params.lng = lng;
    } else if (searchMode === "place" && area.trim()) {
      params.location = area.trim();
    } else {
      setStatus(searchMode === "current" ? "Click Use My Location first" : "Enter a place name");
      return;
    }

    try {
      setStatus("Searching real nearby essentials...");

      const response = await API.get("/nearby", { params });
      const results = response.data.places || [];

      setPlaces(results);
      setAllPlaces(results);
      setStatus(`${response.data.count || 0} places found near ${response.data.search?.displayName || "selected location"}`);
    } catch (error) {
      setPlaces([]);
      setAllPlaces([]);
      setStatus(error.response?.data?.message || error.message || "Unable to fetch nearby essentials");
    }
  };

  const applyDistanceFilter = () => {
    if (!distanceFilter) {
      setPlaces(allPlaces);
      return;
    }

    setPlaces(allPlaces.filter((place) => {
      const distance = Number(place.distanceKm);

      if (!Number.isFinite(distance)) {
        return false;
      }

      return distanceFilter === "10+"
        ? distance > 10
        : distance <= Number(distanceFilter);
    }));
  };

  return (
    <div className="acc-container essentials-page">
      <h1>Nearby Essentials Finder</h1>
      <p>Find real hospitals, schools, banks, supermarkets and bus stops using live OpenStreetMap data.</p>

      <div className="search-area essentials-search">
        <div className="mode-toggle" aria-label="Search mode">
          <button
            type="button"
            className={searchMode === "place" ? "active" : ""}
            onClick={() => setSearchMode("place")}
          >
            Place Name
          </button>
          <button
            type="button"
            className={searchMode === "current" ? "active" : ""}
            onClick={() => setSearchMode("current")}
          >
            My Location
          </button>
        </div>

        <input
          aria-label="Area name"
          placeholder="Enter area name, e.g. Yeshwanthpur, Bengaluru"
          value={area}
          onChange={useAreaSearch}
          disabled={searchMode === "current"}
        />

        <button className="loc-btn" onClick={useCurrentLocation} disabled={searchMode !== "current"}>
          Use My Location
        </button>

        {searchMode === "current" && coordinates && (
          <p className="status-text">Using current location: {coordinates}</p>
        )}

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

        <select value={distanceFilter} onChange={(event) => setDistanceFilter(event.target.value)}>
          <option value="">Distance Filter</option>
          <option value="1">Within 1 km</option>
          <option value="3">Within 3 km</option>
          <option value="5">Within 5 km</option>
          <option value="10">Within 10 km</option>
          <option value="10+">Greater than 10 km</option>
        </select>

        <button className="search-btn" onClick={searchEssentials}>
          Search
        </button>

        <button className="search-btn secondary-btn" onClick={applyDistanceFilter}>
          Apply Filter
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
