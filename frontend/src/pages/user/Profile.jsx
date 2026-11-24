import React, { useState, useEffect, useRef } from "react";
import { authFetch } from "../../services/api";
import "./Profile.css";

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const nameRef = useRef();
  const emailRef = useRef();
  const phoneRef = useRef();

  const userId = localStorage.getItem("userId") || 1; // fallback to 1 for testing

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log("Fetching profile for user ID:", userId);
        
        let profileRes;
        try {
          profileRes = await authFetch(`/api/user/profile/${userId}`);
          console.log("Profile API response:", profileRes);
        } catch (fetchError) {
          // Decode different types of errors
          let errorMessage = "Failed to load profile.";
          
          if (fetchError.message) {
            errorMessage = fetchError.message;
          } else if (fetchError instanceof TypeError && fetchError.message.includes("fetch")) {
            errorMessage = "Cannot connect to server. Please check if the backend is running.";
          } else if (fetchError.name === "NetworkError" || fetchError.message.includes("Network")) {
            errorMessage = "Network error. Please check your internet connection.";
          } else {
            errorMessage = `Error: ${fetchError.toString()}`;
          }
          
          console.error("Profile fetch error details:", {
            error: fetchError,
            message: fetchError.message,
            stack: fetchError.stack,
            name: fetchError.name
          });
          
          throw new Error(errorMessage);
        }
        
        if (!profileRes) {
          throw new Error("No response received from server");
        }
        
        if (!profileRes.success) {
          throw new Error(profileRes.message || "Failed to fetch profile");
        }

        if (!profileRes.profile) {
          throw new Error("No profile data received from server");
        }

        console.log("Profile data:", profileRes.profile);

        // Fetch bookings (don't fail if this fails)
        let flights = [];
        try {
          const bookingsRes = await authFetch(`/api/user/bookings/${userId}`);
          flights = bookingsRes.success ? (bookingsRes.bookings || []) : [];
        } catch (bookingError) {
          console.warn("Failed to fetch bookings:", bookingError);
          // Continue without bookings
        }

        const normalizedFlights = flights.map(f => ({
          bookingRef: f.booking_id,
          from: f.departure,
          to: f.arrival,
          date: f.date,
          status: f.status || "Unknown",
          seat: f.seat_number || "N/A"
        }));

        const userData = {
          ...profileRes.profile,
          flights: normalizedFlights || []
        };
        
        console.log("Setting user data:", userData);
        setUser(userData);
        setError(""); // Clear any previous errors
      } catch (err) {
        console.error("Profile fetch error:", err);
        const errorMessage = err.message || err.toString() || "Failed to load profile.";
        setError(errorMessage);
        setUser(null); // Clear user data on error
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleChange = e => setUser({ ...user, [e.target.name]: e.target.value });

  const handleSave = async () => {
    if (!user.name || !user.phone) {
      setError("Name and phone are required.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      const res = await authFetch(`/api/user/profile/update/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, phone: user.phone })
      });
      
      if (!res || !res.success) {
        throw new Error(res?.message || "Update failed - no response from server");
      }
      
      setMessage("Profile updated successfully!");
      setError(""); // Clear any errors
      setTimeout(() => setMessage(""), 3000);
      
      // Refresh profile data after update
      const profileRes = await authFetch(`/api/user/profile/${userId}`);
      if (profileRes.success && profileRes.profile) {
        setUser({ ...user, ...profileRes.profile });
      }
    } catch (err) {
      console.error("Profile update error:", err);
      const errorMessage = err.message || err.toString() || "Failed to update profile.";
      setError(errorMessage);
      setTimeout(() => setError(""), 5000);
    }
  };

  // Helper function to decode common errors
  const decodeError = (errorMsg) => {
    if (!errorMsg) return "An unknown error occurred";
    
    const lowerMsg = errorMsg.toLowerCase();
    
    // Network errors
    if (lowerMsg.includes("failed to fetch") || lowerMsg.includes("networkerror")) {
      return "Cannot connect to server. Please ensure the backend is running on http://127.0.0.1:5000";
    }
    
    // CORS errors
    if (lowerMsg.includes("cors") || lowerMsg.includes("cross-origin")) {
      return "CORS error: Backend may not be configured to allow requests from this origin";
    }
    
    // Authentication errors
    if (lowerMsg.includes("unauthorized") || lowerMsg.includes("401")) {
      return "Authentication failed. Please log in again.";
    }
    
    // Not found errors
    if (lowerMsg.includes("not found") || lowerMsg.includes("404")) {
      return "Profile not found. Please check if the user ID is correct.";
    }
    
    // Database errors
    if (lowerMsg.includes("database") || lowerMsg.includes("connection")) {
      return "Database connection error. Please check backend logs.";
    }
    
    // Return original message if no match
    return errorMsg;
  };

  if (loading) return <p>Loading profile...</p>;
  if (!user) {
    return (
      <div className="profile-page page-section">
        <p>No profile found.</p>
        {error && (
          <div className="popup-message error" style={{ 
            padding: "15px", 
            marginTop: "20px",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "5px",
            color: "#c33"
          }}>
            <strong>Error:</strong> {decodeError(error)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="profile-page page-section">
      {error && (
        <div className="popup-message error">
          <strong>Error:</strong> {decodeError(error)}
        </div>
      )}
      {message && <div className="popup-message success">{message}</div>}

      {/* Profile Header Section */}
      <div className="profile-header-section">
        <div className="profile-avatar-container">
          <div className="profile-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt="Profile" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <span>{user.name?.charAt(0)?.toUpperCase() || "U"}</span>
            )}
          </div>
          <div className="profile-header-info">
            <h2>{user.name || "User"}</h2>
            <span className="profile-membership-badge">{user.membership || "Member"}</span>
          </div>
        </div>
        <div className="profile-stats">
          <div className="profile-stat-item">
            <span className="profile-stat-value">{user.flights?.length || 0}</span>
            <span className="profile-stat-label">Total Bookings</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-value">{user.email ? "✓" : "—"}</span>
            <span className="profile-stat-label">Email Verified</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-value">{user.phone ? "✓" : "—"}</span>
            <span className="profile-stat-label">Phone Added</span>
          </div>
        </div>
      </div>

      {/* Profile Information Section */}
      <div className="profile-content-section">
        <h3 className="profile-section-title">Personal Information</h3>
        <div className="profile-form-grid">
          <div className="profile-form-group">
            <label>Full Name</label>
            <input
              ref={nameRef}
              name="name"
              value={user.name || ""}
              onChange={handleChange}
              placeholder="Enter your full name"
            />
          </div>
          <div className="profile-form-group">
            <label>Email Address</label>
            <input
              ref={emailRef}
              name="email"
              value={user.email || ""}
              placeholder="Email address"
              disabled
            />
          </div>
          <div className="profile-form-group">
            <label>Phone Number</label>
            <input
              ref={phoneRef}
              name="phone"
              value={user.phone || ""}
              onChange={handleChange}
              placeholder="Enter your phone number"
            />
          </div>
        </div>
        <button className="profile-save-button" onClick={handleSave}>Save Changes</button>
      </div>

      {/* Travel History Section */}
      <div className="travel-history-section">
        <h3 className="profile-section-title">Travel History</h3>
        <div className="travel-history-list">
          {user.flights && user.flights.length > 0 ? (
            user.flights.map(f => (
              <div key={f.bookingRef} className="travel-history-item">
                <div className="travel-history-info">
                  <h4>{f.from} → {f.to}</h4>
                  <p><strong>Date:</strong> {f.date || "N/A"}</p>
                  <p><strong>Booking Ref:</strong> {f.bookingRef || "N/A"}</p>
                  <p><strong>Seat:</strong> {f.seat || "N/A"}</p>
                </div>
                <div className={`travel-history-status ${f.status === "confirmed" ? "confirmed" : "pending"}`}>
                  {f.status || "Pending"}
                </div>
              </div>
            ))
          ) : (
            <p style={{ textAlign: "center", color: "var(--text-secondary, #475569)", padding: "var(--spacing-xl, 32px)" }}>
              No travel history yet. Book your first flight to get started!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
