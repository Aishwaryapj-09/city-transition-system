import React, { useEffect, useState } from "react";
import API from "../services/api";

const Accommodation = () => {

  const [hotels, setHotels] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [area, setArea] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");

  const fetchAccommodation = async (lat, lng) => {
    try {
      const response = await API.get("/accommodation/search", {
        params: { lat, lng, area, minRent, maxRent }
      });

      setHotels(response.data.nearbyHotels || []);
      setRentals(response.data.internalRentals || []);

    } catch (error) {
      console.error("Error fetching accommodation", error);
    }
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchAccommodation(
          position.coords.latitude,
          position.coords.longitude
        );
      },
      (error) => {
        console.error("Location error", error);
      }
    );
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Accommodation Finder</h2>

      <div>
        <input
          placeholder="Area"
          value={area}
          onChange={(e) => setArea(e.target.value)}
        />
        <input
          placeholder="Min Rent"
          value={minRent}
          onChange={(e) => setMinRent(e.target.value)}
        />
        <input
          placeholder="Max Rent"
          value={maxRent}
          onChange={(e) => setMaxRent(e.target.value)}
        />
        <button onClick={() => navigator.geolocation.getCurrentPosition(
          (position) => fetchAccommodation(
            position.coords.latitude,
            position.coords.longitude
          )
        )}>
          Search
        </button>
      </div>

      <h3>Nearby Hotels (Real-Time OSM)</h3>
      {hotels.map((hotel, index) => (
        <div key={index} style={{ border: "1px solid gray", margin: "5px", padding: "5px" }}>
          <p><strong>{hotel.tags?.name || "Unnamed Hotel"}</strong></p>
          <p>Lat: {hotel.lat}</p>
          <p>Lng: {hotel.lon}</p>
        </div>
      ))}

      <h3>Verified Rentals</h3>
      {rentals.map((rental) => (
        <div key={rental._id} style={{ border: "1px solid green", margin: "5px", padding: "5px" }}>
          <p><strong>{rental.title}</strong></p>
          <p>Area: {rental.area}</p>
          <p>Rent: ₹{rental.rent}</p>
          <p>Type: {rental.type}</p>
        </div>
      ))}

    </div>
  );
};

export default Accommodation;