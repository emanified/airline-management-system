import { useState, useEffect } from "react";
import { useBooking } from "./BookingContext";
import { fetchFlightStatus } from "../../services/user";
import "./FlightStatus.css";

function FlightStatus() {
  const { booking } = useBooking(); // selected flight from context
  const [flightNumber, setFlightNumber] = useState("");
  const [statusInfo, setStatusInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill flight number when a flight is selected
  useEffect(() => {
    if (booking?.flightNumber) {
      setFlightNumber(booking.flightNumber);
      checkStatus(booking.flightNumber);
    }
  }, [booking]);

  // Refresh flight status when page becomes visible (after booking)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && statusInfo?.flightNumber) {
        // Refresh status to get updated seat availability
        setTimeout(() => {
          checkStatus(statusInfo.flightNumber);
        }, 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [statusInfo?.flightNumber]);

  const checkStatus = async (flightNum) => {
    const numberToCheck = flightNum || flightNumber;
    if (!numberToCheck.trim()) return;

    setLoading(true);
    setError("");
    setStatusInfo(null);

    try {
      const res = await fetchFlightStatus(numberToCheck);

      if (res.success && res.flight) {
        const f = res.flight;
        setStatusInfo({
          flightNumber: f.flight_no,
          airline: f.airline,
          from: f.source,
          to: f.destination,
          departure: f.departure_time,
          arrival: f.arrival_time,
          status: f.status || "Unknown",
          price: f.price,
          seats: f.seats_available,
        });
      } else {
        setError(res.message || "Flight not found.");
      }
    } catch (err) {
      console.error("Flight status error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to fetch flight status.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    checkStatus();
  };

  const formatPrice = (price) => {
    if (!price) return "$0.00";
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(numPrice);
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "N/A";
    try {
      const date = new Date(dateTimeStr);
      return date.toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateTimeStr;
    }
  };

  return (
    <div className="page-section flight-status-page">
      <div className="flight-status-header">
        <h2>Flight Status</h2>
        <p className="subtitle">Check real-time flight information</p>
      </div>

      {error && <div className="popup-message error">{error}</div>}

      <form className="form-card flight-status-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="flight-number">Flight Number</label>
        <input
            id="flight-number"
          type="text"
            placeholder="e.g., DC121"
          value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
          required
            disabled={loading}
        />
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button type="submit" className="primary-btn" disabled={loading} style={{ flex: 1 }}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Checking...
              </>
            ) : (
              "Check Status"
            )}
          </button>
          {statusInfo && (
            <button 
              type="button" 
              onClick={() => checkStatus(statusInfo.flightNumber)}
              disabled={loading}
              className="refresh-btn"
              title="Refresh flight status"
            >
              <svg 
                className="refresh-icon" 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M3 21v-5h5"></path>
              </svg>
            </button>
          )}
        </div>
      </form>

      {statusInfo && (
        <div className={`flight-status-card ${statusInfo.status === "On Time" ? "on-time" : statusInfo.status === "Departed" ? "departed" : "delayed"}`}>
          <div className="flight-status-header-card">
            <div className="flight-number-section">
              <span className="flight-label">Flight</span>
              <h3 className="flight-number">{statusInfo.flightNumber}</h3>
              <span className="airline-name">{statusInfo.airline}</span>
            </div>
            <div className={`status-badge ${statusInfo.status.toLowerCase().replace(" ", "-")}`}>
              {statusInfo.status}
            </div>
          </div>

          <div className="route-section">
            <div className="route-item">
              <div className="route-label">From</div>
              <div className="route-city">{statusInfo.from}</div>
            </div>
            <div className="route-arrow">→</div>
            <div className="route-item">
              <div className="route-label">To</div>
              <div className="route-city">{statusInfo.to}</div>
            </div>
          </div>

          <div className="flight-details-grid">
            <div className="detail-item">
              <div className="detail-icon">🛫</div>
              <div className="detail-content">
                <div className="detail-label">Departure</div>
                <div className="detail-value">{formatDateTime(statusInfo.departure)}</div>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">🛬</div>
              <div className="detail-content">
                <div className="detail-label">Arrival</div>
                <div className="detail-value">{formatDateTime(statusInfo.arrival)}</div>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">💺</div>
              <div className="detail-content">
                <div className="detail-label">Seats Available</div>
                <div className="detail-value">{statusInfo.seats}</div>
              </div>
            </div>
            <div className="detail-item price-item">
              <div className="detail-icon">💰</div>
              <div className="detail-content">
                <div className="detail-label">Price</div>
                <div className="detail-value price-value">{formatPrice(statusInfo.price)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FlightStatus;
