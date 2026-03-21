import React, { useState } from "react";
import axios from "axios";
import AccommodationCard from "../components/AccommodationCard";

function Accommodation() {

  const [location, setLocation] = useState("");

  const [hotels, setHotels] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [apartments, setApartments] = useState([]);

  const [allHotels, setAllHotels] = useState([]);
  const [allHostels, setAllHostels] = useState([]);
  const [allApartments, setAllApartments] = useState([]);

  const [priceFilter, setPriceFilter] = useState("");
  const [distanceFilter, setDistanceFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");

  const [userLat, setUserLat] = useState(null);
  const [userLon, setUserLon] = useState(null);


  /* 🔥 SEARCH ACCOMMODATION (FIXED MERGE) */

  const searchPlaces = async () => {

    try {

      // 🔹 1. Existing API (hotels/hostels/apartments)
      const res1 = await axios.get(
        `http://localhost:5000/api/accommodation?location=${encodeURIComponent(location)}`
      );

      const data = res1.data;

      // 🔹 2. YOUR LOCAL LISTINGS
      const res2 = await axios.get(
        `http://localhost:5000/api/listings/search?location=${encodeURIComponent(location)}`
      );

      const localListings = res2.data;

      // 🔹 3. MERGE LOCAL + HOTELS
      const mergedHotels = [...localListings, ...(data.hotels || [])];
      console.log("LOCAL LISTINGS:", localListings);
      console.log("LOCAL LISTINGS:", localListings);
      console.log("MERGED HOTELS:", mergedHotels);

      // 🔹 4. SET STATE
      setHotels(mergedHotels);
      setHostels(data.hostels || []);
      setApartments(data.apartments || []);

      setAllHotels(mergedHotels);
      setAllHostels(data.hostels || []);
      setAllApartments(data.apartments || []);

      setUserLat(data.searchLocation?.lat);
      setUserLon(data.searchLocation?.lng);

    } catch (err) {
      console.error(err);
    }

  };


  /* USE CURRENT LOCATION */

  const useLocation = () => {

    navigator.geolocation.getCurrentPosition((pos) => {

      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      setLocation(`${lat},${lon}`);

    });

  };

  function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

  /* 🔥 FILTER LOGIC (FIXED) */

 const applyFilters = (places) => {
  return places.filter((place) => {

    const price = place.price || place.avgPrice || 0;
    const rating = Number(place.rating || 0);
    let distance = null;

const lat = place.lat || place.location?.coordinates?.[1];
const lon = place.lon || place.location?.coordinates?.[0];

if (userLat && userLon && lat && lon) {
  distance = calculateDistance(userLat, userLon, lat, lon);
}

    // 🔥 PRICE FILTER
    if (priceFilter) {
      if (priceFilter.includes("-")) {
        const [min, max] = priceFilter.split("-").map(Number);
        if (price < min || price > max) return false;
      }
      if (priceFilter === "30000+") {
        if (price <= 30000) return false;
      }
    }

    // 🔥 RATING FILTER
    if (ratingFilter) {
      if (rating < Number(ratingFilter)) return false;
    }

    // 🔥 DISTANCE FILTER
    if (distanceFilter && distance !== null) {
      if (distanceFilter === "20+") {
        if (distance <= 20) return false;
      } else {
        if (distance > Number(distanceFilter)) return false;
      }
    }

    // ✅ ALL CONDITIONS PASSED
    return true;
  });
};


  /* APPLY FILTER BUTTON */

 const applyFiltersButton = () => {
  setHotels(applyFilters(allHotels));
  setHostels(applyFilters(allHostels));
  setApartments(applyFilters(allApartments));
};


  return (

    <div className="acc-container">

      <h1>Accommodation Finder</h1>

      <p>Discover places to stay when you arrive in a city</p>

      <div className="search-area">

        <button className="loc-btn" onClick={useLocation}>
          📍 Use My Location
        </button>

        <input
          placeholder="Enter area"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <button className="search-btn" onClick={searchPlaces}>
          Search
        </button>

      </div>


      {/* FILTER BAR */}

      <div className="filter-bar">

        <select onChange={(e) => setPriceFilter(e.target.value)}>
          <option value="">Price</option>
          <option value="2000-6000">₹2000 - ₹6000</option>
          <option value="6000-12000">₹6000 - ₹12000</option>
          <option value="12000-18000">₹12000 - ₹18000</option>
          <option value="18000-24000">₹18000 - ₹24000</option>
          <option value="24000-30000">₹24000 - ₹30000</option>
          <option value="30000+">Above ₹30000</option>
        </select>


        <select onChange={(e) => setRatingFilter(e.target.value)}>
          <option value="">Rating</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
        </select>


        <select onChange={(e) => setDistanceFilter(e.target.value)}>
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


      {/* Hotels */}

      <h2 className="section-title">Hotels Nearby</h2>

      <div className="acc-grid">

        {hotels.map((p, i) => (

          <AccommodationCard
            key={i}
            place={p}
            userLat={userLat}
            userLon={userLon}
          />

        ))}

      </div>


      {/* Hostels */}

      <h2 className="section-title">Hostels / Guest Houses</h2>

      <div className="acc-grid">

        {hostels.map((p, i) => (

          <AccommodationCard
            key={i}
            place={p}
            userLat={userLat}
            userLon={userLon}
          />

        ))}

      </div>


      {/* Apartments */}

      <h2 className="section-title">Apartments / PG</h2>

      <div className="acc-grid">

        {apartments.map((p, i) => (

          <AccommodationCard
            key={i}
            place={p}
            userLat={userLat}
            userLon={userLon}
          />

        ))}

      </div>

    </div>

  );

}

export default Accommodation;