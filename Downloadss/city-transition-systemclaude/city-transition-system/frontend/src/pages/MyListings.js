import { useEffect, useState } from "react";
import axios from "axios";

function MyListings() {

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, []);


  const fetchListings = async () => {

    try {

      const token = localStorage.getItem("token");

      if (!token) {
        console.log("Owner not logged in");
        setLoading(false);
        return;
      }

      const res = await axios.get(
        "http://localhost:30008/api/listings/my",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setListings(res.data);
      setLoading(false);

    } catch (err) {

      console.error("Error fetching listings:", err);
      setLoading(false);

    }

  };


  const deleteListing = async (id) => {

    try {

      const token = localStorage.getItem("token");

      await axios.delete(
        `http://localhost:30008/api/listings/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert("Listing deleted");

      fetchListings();

    } catch (err) {

      console.error("Delete failed:", err);

    }

  };


  return (

    <div className="container">

      <h2>My Listings</h2>

      {loading && <p>Loading listings...</p>}

      {!loading && listings.length === 0 && (
        <p>You have not added any listings yet.</p>
      )}

      <div className="acc-grid">

        {listings.map((l) => (

          <div className="card" key={l._id}>

            <h3>{l.title}</h3>

            <p><b>Area:</b> {l.area}</p>

            <p><b>Rent:</b> ₹{l.rent}</p>

            <p>
              <b>Status:</b>{" "}
              {l.isVerified ? "Approved" : "Pending"}
            </p>

            <div style={{ marginTop: "10px" }}>

              <button
                onClick={() => deleteListing(l._id)}
              >
                Delete
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>

  );

}

export default MyListings;