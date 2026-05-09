import React, { useState } from "react";
import AccommodationCard from "../components/AccommodationCard";
import API from "../services/api";

function Accommodation() {
  const [area, setArea] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const [hotels, setHotels] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [allHotels, setAllHotels] = useState([]);
  const [allHostels, setAllHostels] = useState([]);
  const [allApartments, setAllApartments] = useState([]);
  const [priceFilter, setPriceFilter] = useState("");
  const [distanceFilter, setDistanceFilter] = useState("");
  const [userLat, setUserLat] = useState(null);
  const [userLon, setUserLon] = useState(null);
  const [status, setStatus] = useState("");

  const updateResults = (data) => {
    setHotels(data.hotels || []);
    setHostels(data.hostels || []);
    setApartments(data.apartments || []);
    setAllHotels(data.hotels || []);
    setAllHostels(data.hostels || []);
    setAllApartments(data.apartments || []);
    setUserLat(data.searchLocation?.lat);
    setUserLon(data.searchLocation?.lng);
  };

  const searchPlaces = async () => {
    const location = coordinates || area.trim();

    if (!location) {
      setStatus("Enter a place name or use your current location");
      return;
    }

    try {
      setStatus("Searching accommodation...");

      const response = await API.get("/accommodation", {
        params: {
          location
        }
      });

      updateResults(response.data);
      const count =
        (response.data.hotels || []).length +
        (response.data.hostels || []).length +
        (response.data.apartments || []).length;

      setStatus(`${count} accommodation results found`);
    } catch (error) {
      updateResults({});
      setStatus(error.response?.data?.message || "Unable to fetch accommodation");
    }
  };

  const useLocation = () => {
    setStatus("Getting your location...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lon = pos.coords.longitude.toFixed(6);

        setCoordinates(`${lat},${lon}`);
        setArea("");
        setStatus("Current location selected. Click Find Accommodation.");
      },
      () => {
        setStatus("Location permission was blocked. Allow location access or enter a place name.");
      }
    );
  };

  const useAreaSearch = (event) => {
    setArea(event.target.value);
    setCoordinates("");
  };

  const clearLocation = () => {
    setCoordinates("");
    setStatus("");
  };

  const applyFilters = (places) => {
    return places.filter((place) => {
      const price = Number(place.price || 0);
      const distance = Number(place.distanceKm);

      if (priceFilter) {
        if (priceFilter.includes("-")) {
          const [min, max] = priceFilter.split("-").map(Number);
          if (price < min || price > max) return false;
        }

        if (priceFilter === "30000+" && price <= 30000) {
          return false;
        }
      }

      if (distanceFilter && Number.isFinite(distance)) {
        if (distanceFilter === "20+") {
          if (distance <= 20) return false;
        } else if (distance > Number(distanceFilter)) {
          return false;
        }
      }

      return true;
    });
  };

  const applyFiltersButton = () => {
    setHotels(applyFilters(allHotels));
    setHostels(applyFilters(allHostels));
    setApartments(applyFilters(allApartments));
  };

  return (
    <div className="acc-container">
      <h1>Accommodation Finder</h1>
      <p>Find stays around a place or your current location.</p>

      <div className="finder-panel">
        <div className="field-block">
          <label htmlFor="accommodation-place">Enter place name</label>
          <input
            id="accommodation-place"
            aria-label="Area name"
            placeholder="Enter place name"
            value={area}
            onChange={useAreaSearch}
            disabled={Boolean(coordinates)}
          />
        </div>

        <div className="action-row">
          <button className="loc-btn" onClick={useLocation} disabled={Boolean(area.trim())}>
            Use My Location
          </button>

          {coordinates && (
            <button className="clear-btn" onClick={clearLocation}>
              Clear Location
            </button>
          )}
        </div>

        {coordinates && (
          <p className="status-text compact-status">Current location selected</p>
        )}

        <button className="search-btn primary-action" onClick={searchPlaces}>
          Find Accommodation
        </button>
      </div>

      <div className="filter-panel">
        <div className="field-block">
          <label htmlFor="accommodation-price">Price</label>
          <select id="accommodation-price" value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)}>
            <option value="">Any price</option>
            <option value="2000-6000">Rs 2000 - Rs 6000</option>
            <option value="6000-12000">Rs 6000 - Rs 12000</option>
            <option value="12000-18000">Rs 12000 - Rs 18000</option>
            <option value="18000-24000">Rs 18000 - Rs 24000</option>
            <option value="24000-30000">Rs 24000 - Rs 30000</option>
            <option value="30000+">Above Rs 30000</option>
          </select>
        </div>

        <div className="field-block">
          <label htmlFor="accommodation-distance">Distance</label>
          <select id="accommodation-distance" value={distanceFilter} onChange={(event) => setDistanceFilter(event.target.value)}>
            <option value="">Any distance</option>
            <option value="2">Within 2 km</option>
            <option value="5">Within 5 km</option>
            <option value="10">Within 10 km</option>
            <option value="15">Within 15 km</option>
            <option value="20">Within 20 km</option>
            <option value="20+">Greater than 20 km</option>
          </select>
        </div>

        <button className="filter-action" onClick={applyFiltersButton}>
          Apply Filters
        </button>
      </div>

      {status && <p className="status-text">{status}</p>}

      <h2 className="section-title">Hotels Nearby</h2>
      <div className="acc-grid">
        {hotels.map((place) => (
          <AccommodationCard key={place.id || place.title} place={place} userLat={userLat} userLon={userLon} />
        ))}
      </div>

      <h2 className="section-title">Hostels / Guest Houses</h2>
      <div className="acc-grid">
        {hostels.map((place) => (
          <AccommodationCard key={place.id || place.title} place={place} userLat={userLat} userLon={userLon} />
        ))}
      </div>

      <h2 className="section-title">Apartments / PG</h2>
      <div className="acc-grid">
        {apartments.map((place) => (
          <AccommodationCard key={place.id || place.title} place={place} userLat={userLat} userLon={userLon} />
        ))}
      </div>
    </div>
  );
}

export default Accommodation;
