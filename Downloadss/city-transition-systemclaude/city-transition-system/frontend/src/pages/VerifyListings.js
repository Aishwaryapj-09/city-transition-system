import { useEffect, useState } from "react";
import axios from "axios";

function VerifyListings() {

  const [listings, setListings] = useState([]);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {

    try {

      const token = localStorage.getItem("token");

      const res = await axios.get(
        "http://localhost:30008/api/listings/pending",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setListings(res.data);

    } catch (err) {

      console.error("Error loading listings:", err);

    }

  };


  const approve = async (id) => {

    try {

      const token = localStorage.getItem("token");

      await axios.patch(
        `http://localhost:30008/api/listings/verify/${id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      loadListings();

    } catch (err) {

      console.error("Approval failed:", err);

    }

  };


  return (

    <div className="container">

      <h2>Verify Listings</h2>

      {listings.length === 0 && <p>No pending listings</p>}

      {listings.map((l) => (

        <div className="card" key={l._id}>

          <h3>{l.title}</h3>

          <p>{l.area}</p>

          <p>₹{l.rent}</p>

          <button onClick={() => approve(l._id)}>
            Approve
          </button>

        </div>

      ))}

    </div>

  );

}

export default VerifyListings;