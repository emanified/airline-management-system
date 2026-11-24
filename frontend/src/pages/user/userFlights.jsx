//userFlights.jsx
import { useEffect, useState } from "react";
import { fetchFlights, bookFlight } from "../../services/api";

export default function Flights() {
  // CORRECTION 1: Initialize state variables
  const [flights, setFlights] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true); // Added loading state for better UX
  const [error, setError] = useState(null); // Added error state

  // CORRECTION 2: Place useEffect inside the component
  useEffect(() => {
    const getFlights = async () => {
      try {
        const data = await fetchFlights();
        setFlights(data); // Assuming fetchFlights returns the flight data
        setIsLoading(false);
      } catch (err) {
        setError("Failed to fetch flights.");
        setIsLoading(false);
      }
    };

    getFlights();
  }, []);

  // CORRECTION 2: Place handler function inside the component
  const handleBook = async (id) => {
    setMessage(""); // Clear previous messages
    try {
      // Assuming "Guest" is the hardcoded user for this example
      const res = await bookFlight(id, "Guest"); 
      
      if (res.success) {
        setMessage(res.message || "Flight booked successfully!");
        // Optional: Refetch flights or update seats state to reflect the booking
      } else {
        setMessage(res.message || "Booking failed. Try again.");
      }
    } catch (err) {
      setMessage("An error occurred during booking.");
    }
  };

  // --- Render Logic ---

  if (isLoading) {
    return (
      <div>
        <h2>Available Flights</h2>
        <p>Loading flights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2>Available Flights</h2>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  // CORRECTION 3: The single, final return statement with the list view
  return (
    <div>
      <h2>Available Flights</h2>

      {message && <p className="message">{message}</p>}
      
      {flights.length === 0 ? (
        <p>No flights are currently available.</p>
      ) : (
        <div className="flights-grid">
          {flights.map((f) => (
            <div key={f.id} className="flight-card">
              <h3>{f.name}</h3>
              <p>From: **{f.source}**</p>
              <p>To: **{f.destination}**</p>
              <p>Seats: {f.seats}</p>
              <button 
                onClick={() => handleBook(f.id)}
                // Optionally disable the button if no seats are left
                disabled={f.seats <= 0} 
              >
                Book Flight
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}