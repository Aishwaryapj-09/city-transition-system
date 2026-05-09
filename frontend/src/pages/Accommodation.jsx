import React, { useState } from "react";
import AccommodationCard from "../components/AccommodationCard";
import API from "../services/api";

function Accommodation() {
  const [area, setArea] = useState("Yeshwanthpur, Bengaluru");
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
      setStatus("Searching live city accommodation data...");

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

      <div className="search-area">
        <input
          aria-label="Area name"
          placeholder="Enter place name"
          value={area}
          onChange={useAreaSearch}
        />

        <button className="loc-btn" onClick={useLocation}>
          Use My Location
        </button>

        {coordinates && (
          <p className="status-text">Using current location: {coordinates}</p>
        )}

        <button className="search-btn" onClick={searchPlaces}>
          Search
        </button>
      </div>

      <div className="filter-bar">
        <select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)}>
          <option value="">Price</option>
          <option value="2000-6000">Rs 2000 - Rs 6000</option>
          <option value="6000-12000">Rs 6000 - Rs 12000</option>
          <option value="12000-18000">Rs 12000 - Rs 18000</option>
          <option value="18000-24000">Rs 18000 - Rs 24000</option>
          <option value="24000-30000">Rs 24000 - Rs 30000</option>
          <option value="30000+">Above Rs 30000</option>
        </select>

        <select value={distanceFilter} onChange={(event) => setDistanceFilter(event.target.value)}>
          <option value="">Distance</option>
          <option value="2">Within 2 km</option>
          <option value="5">Within 5 km</option>
          <option value="10">Within 10 km</option>
          <option value="15">Within 15 km</option>
          <option value="20">Within 20 km</option>
          <option value="20+">Greater than 20 km</option>
        </select>

        <button onClick={applyFiltersButton}>
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
