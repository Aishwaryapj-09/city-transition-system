import { useNavigate } from "react-router-dom";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <div className="card">
        <h1>🌆 City Transition System</h1>
        <p>Secure your urban journey.</p>

        <button onClick={() => navigate("/login")}>Login</button>
        <button className="link-btn" onClick={() => navigate("/register")}>
          Register
        </button>
      </div>
    </div>
  );
}

export default Landing;