import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { adminLogin, userLogin, registerUser } from "../services/api";
import LoadingAnimation from "../components/LoadingAnimation";
import "../styles/Auth.css";

export default function Auth({ setUserToken, setAdminToken }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("login");
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if admin login was requested from homepage
  useEffect(() => {
    if (location.state?.role === "admin") {
      setIsAdmin(true);
      setActiveTab("login");
    } else {
      setIsAdmin(false);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (activeTab === "login") {
        if (isAdmin) {
          const data = await adminLogin(username, password);
          localStorage.setItem("adminToken", data.token);
          localStorage.setItem("adminId", data.admin_id);
          localStorage.setItem("username", username);
          setAdminToken(data.token);
          // Set flag to indicate dashboard should show loading
          localStorage.setItem("dashboardLoading", "true");
          navigate("/admin");
          // Keep loading visible during navigation - it will be hidden when component unmounts
        } else {
          const data = await userLogin(username, password);
          localStorage.setItem("userToken", data.token);
          localStorage.setItem("userId", data.user_id);
          localStorage.setItem("username", username);
          setUserToken(data.token);
          // Set flag to indicate dashboard should show loading
          localStorage.setItem("dashboardLoading", "true");
          navigate("/user");
          // Keep loading visible during navigation - it will be hidden when component unmounts
        }
      } else {
        // Signup is only for users
        await registerUser({ username, email, password });
        setIsLoading(false);
        alert("Signup successful! Please login.");
        setActiveTab("login");
        setUsername("");
        setPassword("");
        setEmail("");
      }
    } catch (err) {
      setIsLoading(false);
      setError(err.response?.data?.message || err.message || "Authentication failed");
    }
  };

  return (
    <div className="auth-container">
      {isLoading && <LoadingAnimation />}
      <div className="auth-card">
        {isAdmin ? (
          <div className="admin-login-header">
            <h2>Admin Login</h2>
            <button 
              className="switch-to-user-btn" 
              onClick={() => {
                setIsAdmin(false);
                setError("");
              }}
            >
              Switch to User Login
            </button>
          </div>
        ) : (
          <div className="auth-tabs">
            <button
              className={activeTab === "login" ? "tab active" : "tab"}
              onClick={() => setActiveTab("login")}
            >
              Login
            </button>
            <button
              className={activeTab === "signup" ? "tab active" : "tab"}
              onClick={() => setActiveTab("signup")}
            >
              Sign Up
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {activeTab === "signup" && !isAdmin && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">
            {isAdmin ? "Admin Login" : activeTab === "login" ? "Login" : "Sign Up"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
