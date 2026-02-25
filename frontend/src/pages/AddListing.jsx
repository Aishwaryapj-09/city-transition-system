import React, { useState } from "react";
import API from "../utils/api";

const AddListing = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    price: "",
    type: "PG"
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/listings", formData);
      alert("Listing submitted for admin approval");
    } catch (err) {
      alert("Error submitting listing");
    }
  };

  return (
    <div>
      <h2>Add Listing</h2>
      <form onSubmit={handleSubmit}>
        <input name="title" placeholder="Title" onChange={handleChange} required />
        <br />
        <textarea name="description" placeholder="Description" onChange={handleChange} required />
        <br />
        <input name="location" placeholder="Location" onChange={handleChange} required />
        <br />
        <input name="price" type="number" placeholder="Price" onChange={handleChange} required />
        <br />
        <select name="type" onChange={handleChange}>
          <option value="PG">PG</option>
          <option value="House">House</option>
          <option value="Hostel">Hostel</option>
        </select>
        <br />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default AddListing;