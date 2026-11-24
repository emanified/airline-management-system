import { useEffect, useState } from "react";
import { fetchFlights } from "../../services/user";
import "../../styles/common-theme.css";
import "./SelectAirline.css";

const SelectAirline = ({ onSelectAirline }) => {
  const [airlines, setAirlines] = useState([]);
  const [selectedAirline, setSelectedAirline] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getAirlines = async () => {
      setIsLoading(true);
      try {
        const res = await fetchFlights();
        if (!res.success) throw new Error(res.message || "Failed to fetch flights");

        // Extract unique airlines from flights
        const flights = res.flights || [];
        const uniqueAirlines = {};
        
        flights.forEach(flight => {
          const airlineName = flight.airline || "Unknown Airline";
          if (!uniqueAirlines[airlineName]) {
            uniqueAirlines[airlineName] = {
              name: airlineName,
              flightCount: 0,
              logo: "✈️" // Default emoji, can be replaced with actual logos
            };
          }
          uniqueAirlines[airlineName].flightCount++;
        });

        setAirlines(Object.values(uniqueAirlines));
      } catch (err) {
        console.error(err);
        setError("Failed to fetch airlines.");
      } finally {
        setIsLoading(false);
      }
    };

    getAirlines();
  }, []);

  const handleSelect = (airline) => {
    setSelectedAirline(airline.name);
  };

  const handleContinue = () => {
    if (selectedAirline && onSelectAirline) {
      onSelectAirline(selectedAirline);
    }
  };

  if (isLoading) return <p>Loading airlines...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="page-section select-airline-container">
      <div className="top-header">
        <h2>Select Airline</h2>
        <p>Choose your preferred airline to view available flights</p>
      </div>

      {airlines.length === 0 ? (
        <div className="empty-state">
          <p>No airlines available at the moment.</p>
        </div>
      ) : (
        <div className="airlines-grid">
          {airlines.map((airline, index) => {
            const isSelected = selectedAirline === airline.name;
            return (
              <div
                key={index}
                className={`airline-card ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelect(airline)}
              >
                <div className="airline-logo">{airline.logo}</div>
                <div className="airline-info">
                  <h3>{airline.name}</h3>
                  <p>{airline.flightCount} {airline.flightCount === 1 ? "flight" : "flights"} available</p>
                </div>
                {isSelected && (
                  <div className="selected-badge">✓ Selected</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedAirline && (
        <div className="selection-actions">
          <button 
            className="primary-btn"
            onClick={handleContinue}
          >
            Continue with {selectedAirline} →
          </button>
        </div>
      )}
    </div>
  );
};

export default SelectAirline;

