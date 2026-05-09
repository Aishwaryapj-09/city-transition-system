import { useNavigate } from "react-router-dom";

function Dashboard() {

  const navigate = useNavigate();

  const role = localStorage.getItem("role") || "";

  return (

    <div className="container">

      <div className="card">

        <h2>Welcome 👋</h2>

        <p>You are successfully logged in.</p>

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}
        >

          {/* VISITOR FEATURES */}

          {role === "visitor" && (

            <>
              <button onClick={() => navigate("/accommodation")}>
                Find Accommodation
              </button>

              <button className="feature-btn" onClick={() => navigate("/nearby-essentials")}>
                Nearby Essentials
              </button>

              <p style={{ marginTop: "10px" }}>
                Search accommodation and nearby essentials around your selected city area.
              </p>
            </>

          )}


          {/* OWNER FEATURES */}

          {role === "owner" && (

            <>
              <button onClick={() => navigate("/add-listing")}>
                Add Rental Listing
              </button>

              <button onClick={() => navigate("/my-listings")}>
                My Listings
              </button>
            </>

          )}


          {/* ADMIN FEATURES */}

          {role === "admin" && (

            <>
              <button onClick={() => navigate("/verify-listings")}>
                Verify Listings
              </button>
            </>

          )}


          {/* FALLBACK IF ROLE MISSING */}

          {!role && (

            <p style={{ color: "red" }}>
              Session expired. Please login again.
            </p>

          )}

        </div>

      </div>

    </div>

  );

}

export default Dashboard;
