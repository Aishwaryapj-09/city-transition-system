import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../utils/api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    const data = await loginUser(email, password);

    if (data.token) {
      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } else if (data.message === "Invalid credentials") {
      setMessage("Invalid email or password.");
    } else {
      setMessage("User not found. Please create an account.");
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Sign In</h2>

        <input
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleLogin}>Login</button>

        <p style={{ marginTop: "15px" }}>{message}</p>

        <p style={{ marginTop: "20px" }}>
          New user?{" "}
          <Link to="/register" style={{ color: "#00c6ff" }}>
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;