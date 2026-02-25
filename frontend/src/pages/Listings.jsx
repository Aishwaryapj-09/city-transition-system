import React, { useState, useEffect } from "react";
import API from "../utils/api";
import ListingCard from "../components/ListingCard";

const Listings = () => {
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({
    location: "",
    minPrice: "",
    maxPrice: "",
    type: ""
  });

  const fetchListings = async () => {
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await API.get(`/listings?${query}`);
      setListings(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div>
      <h2>Search Listings</h2>

      <input name="location" placeholder="Location" onChange={handleChange} />
      <input name="minPrice" type="number" placeholder="Min Price" onChange={handleChange} />
      <input name="maxPrice" type="number" placeholder="Max Price" onChange={handleChange} />

      <select name="type" onChange={handleChange}>
        <option value="">All</option>
        <option value="PG">PG</option>
        <option value="House">House</option>
        <option value="Hostel">Hostel</option>
      </select>

      <button onClick={fetchListings}>Search</button>

      <div>
        {listings.map((listing) => (
          <ListingCard key={listing._id} listing={listing} />
        ))}
      </div>
    </div>
  );
};

export default Listings;