// BookTicket.jsx
import { useEffect, useState } from "react";
import { fetchFlights } from "../../services/user"; // your service
import { useBooking } from "./BookingContext";

const BookTicket = ({ flights: propFlights, selectedAirline, onBack, onProceed }) => {
  const { setBooking } = useBooking();
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  // Function to fetch flights
  const getFlights = async () => {
    setIsLoading(true);
    try {
      const res = await fetchFlights();
      if (!res.success) throw new Error(res.message || "Failed to fetch flights");

      // Map seats_available → seats for frontend logic
      const flightsWithId = res.flights.map(f => ({
        ...f,
        tempId: `${f.source}-${f.destination}-${f.departure_time}`,
        seats: f.seats_available || 0
      }));

      setFlights(flightsWithId);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch flights.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fetch flights dynamically if not provided as prop ---
  useEffect(() => {
    if (propFlights && propFlights.length > 0) {
      // Use flights passed as prop (filtered by airline)
      const flightsWithId = propFlights.map(f => ({
        ...f,
        tempId: `${f.source}-${f.destination}-${f.departure_time}`,
        seats: f.seats_available || f.seats || 0
      }));
      setFlights(flightsWithId);
      setIsLoading(false);
    } else {
      // Fetch all flights if no prop provided
      getFlights();
    }
  }, [propFlights]);

  // Refresh flights when page becomes visible (after booking)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !propFlights) {
        // Refresh flights to get updated seat availability
        setTimeout(() => {
          getFlights();
        }, 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [propFlights]);

  // --- Handle flight selection ---
  const handleSelect = (flight) => {
    const flightId = flight.tempId;

    setBooking(prev => ({
      ...prev,
      flight: flight,                      // Store full flight object
      flightCode: flight.tempId,          // frontend selection tracking
      flightNumber: flight.flight_no,     // for status checking
      flightRoute: `${flight.source} → ${flight.destination}`,
      flightTime: flight.departure_time,
      seatsAvailable: flight.seats,
      flight_id: flight.flight_id          // backend expects this
    }));

    setSelectedFlight(flightId);
    setShowPopup(true);

    setTimeout(() => {
      setShowPopup(false);
      if (onProceed) onProceed(flight);
    }, 1200);
  };

  // --- Render ---
  if (isLoading) return <p>Loading flights...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="page-section">
      <div className="top-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          {onBack && selectedAirline && (
            <button
              onClick={onBack}
              style={{
                background: "transparent",
                border: "1px solid #8b5cf6",
                color: "#8b5cf6",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)";
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(139, 92, 246, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#8b5cf6";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              ← Back to Airlines
            </button>
          )}
          <h3>Book Your Ticket</h3>
        </div>
        {selectedAirline && (
          <p style={{ color: "#666", marginTop: "8px" }}>Flights for {selectedAirline}</p>
        )}
      </div>

      {flights.length === 0 ? (
        <p>No flights available at the moment.</p>
      ) : (
        <div className="airlines-card">
          {flights.map(f => {
            const flightId = f.tempId;
            const isSelected = selectedFlight === flightId;

            return (
              <div
                key={flightId}
                className="airline-item"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px",
                  borderRadius: "10px",
                  backgroundColor: isSelected ? "#8b5cf6" : "#f1f3f6",
                  color: isSelected ? "#fff" : "#222",
                  cursor: f.seats > 0 ? "pointer" : "not-allowed",
                  transition: "all 0.2s ease",
                  marginBottom: "10px",
                  opacity: f.seats > 0 ? 1 : 0.6
                }}
                onClick={() => f.seats > 0 && handleSelect(f)}
              >
                <div>
                  <strong>{f.source} → {f.destination}</strong>
                  <p style={{ margin: 0, fontSize: "14px" }}>
                    Departure: {new Date(f.departure_time).toLocaleString()}
                  </p>
                  <p style={{ margin: 0, fontSize: "12px" }}>
                    Seats available: {f.seats}
                  </p>
                </div>

                <div>
                  <button
                    className="flight-select-btn"
                    style={{
                      padding: "0.5rem 1.25rem",
                      borderRadius: "8px",
                      background: isSelected 
                        ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" 
                        : f.seats > 0 
                          ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
                          : "linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)",
                      color: "#fff",
                      border: "none",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      cursor: f.seats > 0 ? "pointer" : "not-allowed",
                      transition: "all 0.2s ease",
                      boxShadow: isSelected 
                        ? "0 4px 12px rgba(16, 185, 129, 0.3)" 
                        : f.seats > 0 
                          ? "0 2px 8px rgba(102, 126, 234, 0.2)" 
                          : "none",
                      opacity: f.seats > 0 ? 1 : 0.6
                    }}
                    disabled={f.seats <= 0}
                    onMouseEnter={(e) => {
                      if (f.seats > 0 && !isSelected) {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (f.seats > 0 && !isSelected) {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.2)";
                      }
                    }}
                  >
                    {isSelected ? "✓ Selected" : f.seats > 0 ? "Select Flight" : "Full"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showPopup && (
        <div
          className="popup-message"
          style={{
            marginTop: "20px",
            padding: "10px 15px",
            borderRadius: "8px",
            backgroundColor: "#8b5cf6",
            color: "#fff",
            width: "fit-content",
            transition: "all 0.3s ease"
          }}
        >
          Flight Selected! Redirecting…
        </div>
      )}
    </div>
  );
};

export default BookTicket;
