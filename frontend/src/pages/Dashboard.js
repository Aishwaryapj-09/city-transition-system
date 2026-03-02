import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Welcome 👋</h2>
        <p>You are successfully logged in.</p>
        <p>More features will be added here soon.</p>

        <button onClick={logout}>Logout</button>
      </div>
    </div>
  );
}

export default Dashboard;