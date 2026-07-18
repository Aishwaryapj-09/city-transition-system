import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../utils/api";

function Register() {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("visitor");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleRegister = async () => {

    if (!name || !email || !password) {
      setMessage("All fields are required.");
      return;
    }

    try {

      const response = await registerUser(name, email, password, role);

      console.log("REGISTER RESPONSE:", response);

      if (response.status === 201) {
        setMessage("Registration successful! Redirecting...");
        setTimeout(() => navigate("/login"), 1500);

      } } else if (response.status === 400) {
  if (response.data.message) {
    setMessage(response.data.message);
  } else if (response.data.errors && response.data.errors.length > 0) {
    setMessage(response.data.errors[0].msg);
  } else {
    setMessage("Registration failed. Please check your details.");
  }
}else {
        setMessage("Something went wrong.");
      }

    } catch (error) {

      console.error(error);
      setMessage("Server error. Try again.");

    }
  };

  return (
    <div className="container">

      <div className="card">

        <h2>Create Account</h2>

        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ marginTop: "10px" }}
        >
          <option value="visitor">Visitor</option>
          <option value="owner">Property Owner</option>
        </select>

        <button onClick={handleRegister}>
          Register
        </button>

        <p style={{ marginTop: "15px" }}>
          {message}
        </p>

        <p style={{ marginTop: "20px" }}>
          Already registered?{" "}
          <Link to="/login" style={{ color: "#00c6ff" }}>
            Sign In
          </Link>
        </p>

      </div>

    </div>
  );
}

export default Register;