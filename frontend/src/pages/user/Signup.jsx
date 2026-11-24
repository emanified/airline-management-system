import { useState } from "react";
import { registerUser } from "../../services/api.js"; // <-- FIX: Added .js extension
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      // The API function (registerUser) already handles the network request and returns the parsed JSON body.
      const res = await registerUser(username, password);

      if (res.success) {
        setMessage("Registration successful! Redirecting to login...");
        // Redirect upon success
        setTimeout(() => navigate("/login"), 1500); 
      } else {
        // This handles explicit server errors (e.g., 400 Bad Request, 409 Conflict, 503 DB error)
        setError(res.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      // This catch block executes ONLY if the network request fails entirely 
      // (e.g., server down, DNS error, CORS failure)
      console.error("Network or parsing error:", err);
      setError("An unexpected error occurred. Please check your server status and connection.");
    }
  };

  return (
    <div className="login-page"> 
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>New User Sign Up</h2>
        
        <input
          placeholder="New Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        <button type="submit">Sign Up</button>
        
        {message && <p className="message">{message}</p>}
        {error && <p className="error">{error}</p>}

        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login">Login Here</Link>
        </p>
      </form>
    </div>
  );
}