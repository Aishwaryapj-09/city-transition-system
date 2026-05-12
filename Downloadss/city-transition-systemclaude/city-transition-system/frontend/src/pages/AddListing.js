import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function AddListing() {

  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [rent, setRent] = useState("");
  const [type, setType] = useState("");

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locationUsed, setLocationUsed] = useState(false);

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
      setLocationUsed(true);
      setArea("");
    });
  };

  const fetchCoordinates = async (value) => {
    if (!value) return;

    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${value}`
      );

      if (res.data.length > 0) {
        setLat(res.data[0].lat);
        setLng(res.data[0].lon);
        setLocationUsed(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitListing = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Login first");
        return;
      }

      await axios.post(
        "http://localhost:30008/api/listings",
        {
          title,
          description,
          area,
          rent: Number(rent),
          type,
          location: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)]
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert("Listing submitted");
      navigate("/my-listings");

    } catch (err) {
      console.error(err.response?.data || err);
      alert(err.response?.data?.message || "Server error");
    }
  };

  return (
    <div className="container">
      <div className="card">

        <h2>Add Rental Listing</h2>

        <input placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} />

        <input
          placeholder="Area"
          value={area}
          disabled={locationUsed}
          onChange={(e)=>{
            setArea(e.target.value);
            fetchCoordinates(e.target.value);
          }}
        />

        <button onClick={getLocation}>Use My Location</button>

        <input placeholder="Rent" value={rent} onChange={(e)=>setRent(e.target.value)} />

        <select value={type} onChange={(e)=>setType(e.target.value)}>
          <option value="">Select Type</option>
          <option value="PG">PG</option>
          <option value="Hostel">Hostel</option>
          <option value="Apartment">Apartment</option>
          <option value="Hotel">Hotel</option> {/* ✅ ADDED */}
        </select>

        <textarea placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} />

        <input placeholder="Latitude" value={lat} readOnly />
        <input placeholder="Longitude" value={lng} readOnly />

        <button onClick={submitListing}>Submit Listing</button>

      </div>
    </div>
  );
}

export default AddListing;