import { useEffect, useState } from "react";
import { getAdminFlights, deleteAdminFlight, updateAdminFlight, addAdminFlight } from "../../../services/admin";
import Modal from "../../../components/Modal";
import '../../../styles/common-theme.css';
import '../../../styles/AdminPages.css';
import './flights.css';

export default function FlightsPage({ flights: propFlights, deleteFlight: propDeleteFlight }) {
  const [flights, setFlights] = useState(propFlights || []);
  const [isLoading, setIsLoading] = useState(!propFlights);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [editingFlight, setEditingFlight] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    airline: "",
    flight_no: "",
    source: "",
    destination: "",
    departure_time: "",
    arrival_time: "",
    price: "",
    seats_available: ""
  });

  const getFlights = async () => {
    setIsLoading(true);
    try {
      const data = await getAdminFlights();
      // Handle both array and object responses
      const flightsData = Array.isArray(data) ? data : (data.data || data.flights || []);
      console.log("Fetched flights data:", flightsData);
      if (flightsData.length > 0) {
        console.log("Sample flight:", flightsData[0]);
        console.log("Flight keys:", Object.keys(flightsData[0]));
      }
      setFlights(flightsData);
      setError(null);
    } catch (err) {
      console.error("Error fetching flights:", err);
      setError("Failed to fetch flights: " + (err.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!propFlights) {
    getFlights();
    } else {
      setFlights(propFlights);
    }
  }, [propFlights]);

  const handleDelete = async (flightId) => {
    if (!window.confirm("Are you sure you want to delete this flight?")) return;
    try {
      if (propDeleteFlight) {
        await propDeleteFlight(flightId);
      } else {
      await deleteAdminFlight(flightId);
        getFlights();
      }
      setMessage(`Flight ID ${flightId} deleted successfully.`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to delete flight.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleEdit = (flight) => {
    setEditingFlight(flight);
    setEditFormData({
      airline: flight.airline || flight.airline_name || "",
      flight_no: flight.flight_no || flight.flight_number || "",
      source: flight.source || flight.origin || "",
      destination: flight.destination || "",
      departure_time: flight.departure_time ? new Date(flight.departure_time).toISOString().slice(0, 16) : "",
      arrival_time: flight.arrival_time ? new Date(flight.arrival_time).toISOString().slice(0, 16) : "",
      price: flight.price || flight.ticket_price || flight.cost || "",
      seats_available: flight.seats_available || flight.seats || ""
    });
  };

  const handleSaveEdit = async () => {
    try {
      await updateAdminFlight(editingFlight.flight_id, editFormData);
      setMessage("Flight updated successfully!");
      setEditingFlight(null);
      if (!propFlights) {
        getFlights();
      } else {
        // Update local state
        setFlights(flights.map(f => 
          f.flight_id === editingFlight.flight_id 
            ? { ...f, ...editFormData } 
            : f
        ));
      }
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to update flight.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleAdd = async () => {
    try {
      // Validate form data
      if (!addFormData.airline || !addFormData.flight_no || !addFormData.source || 
          !addFormData.destination || !addFormData.departure_time || 
          !addFormData.arrival_time || !addFormData.price || !addFormData.seats_available) {
        setMessage("Please fill in all required fields.");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      // Validate dates
      const departureDate = new Date(addFormData.departure_time);
      const arrivalDate = new Date(addFormData.arrival_time);
      
      if (arrivalDate <= departureDate) {
        setMessage("Arrival time must be after departure time.");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      // Validate year (no 2025 flights)
      if (departureDate.getFullYear() === 2025) {
        setMessage("Cannot add flights from 2025. Please select a different year.");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      await addAdminFlight(addFormData);
      setMessage("Flight added successfully!");
      setIsAddModalOpen(false);
      setAddFormData({
        airline: "",
        flight_no: "",
        source: "",
        destination: "",
        departure_time: "",
        arrival_time: "",
        price: "",
        seats_available: ""
      });
      if (!propFlights) {
        getFlights();
      }
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to add flight: " + (err.message || "Unknown error"));
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (isLoading) return <p>Loading flights...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  // Calculate statistics
  const stats = {
    total: flights.length,
    totalSeats: flights.reduce((sum, f) => sum + (f.seats_available || f.seats || 0), 0),
    avgPrice: flights.length > 0 
      ? (flights.reduce((sum, f) => sum + parseFloat(f.price || f.ticket_price || f.cost || 0), 0) / flights.length).toFixed(2)
      : 0,
    lowSeats: flights.filter(f => (f.seats_available || f.seats || 0) < 10).length
  };

  const handleRefresh = async () => {
    await getFlights();
    setMessage("Flights refreshed successfully!");
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "12px" }}>
        <h1 className="main-title" style={{ margin: 0 }}>Flights Management</h1>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="primary-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <svg 
              className="plus-icon" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add New Flight
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="refresh-btn"
            title="Refresh flights"
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
        </div>
      </div>

      {message && (
        <div className="popup-message success" 
             style={{ position: "relative", top: 0, left: 0, transform: "none", marginBottom: "20px" }}>
          {message}
        </div>
      )}

      {/* Statistics Cards */}
      {flights.length > 0 && (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "16px", 
          marginBottom: "32px" 
        }}>
          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "20px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "4px" }}>{stats.total}</div>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Flights</div>
          </div>
          <div style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            padding: "20px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "4px" }}>{stats.totalSeats}</div>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Seats</div>
          </div>
          <div style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            padding: "20px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "4px" }}>${stats.avgPrice}</div>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Avg Price</div>
          </div>
          <div style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
            padding: "20px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "4px" }}>{stats.lowSeats}</div>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Low Seats (&lt;10)</div>
          </div>
        </div>
      )}

      <h2 className="section-title" style={{ marginBottom: "20px" }}>Flights List</h2>

      {flights.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✈️</div>
          <p style={{ fontSize: "18px", color: "#64748b", margin: 0 }}>No flights available.</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: "20px"
        }}>
          {flights.map((f) => (
            <div 
              key={f.flight_id}
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                border: "1px solid #e2e8f0",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
              }}
            >
              {/* Seats Badge */}
              <div style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "600",
                background: (f.seats_available || f.seats || 0) < 10 ? "#fef3c7" : "#d1fae5",
                color: (f.seats_available || f.seats || 0) < 10 ? "#92400e" : "#065f46",
                border: `1px solid ${(f.seats_available || f.seats || 0) < 10 ? "#fbbf24" : "#10b981"}`
              }}>
                {f.seats_available || f.seats || 0} seats
              </div>

              {/* Header */}
              <div style={{ marginBottom: "16px", paddingRight: "100px" }}>
                <div style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#1e293b",
                  marginBottom: "4px"
                }}>
                  {f.airline || f.airline_name || 'Unknown Airline'}
                </div>
                <div style={{
                  fontSize: "14px",
                  color: "#64748b",
                  fontWeight: "500"
                }}>
                  {f.flight_no || f.flight_number || `Flight #${f.flight_id}`}
                </div>
              </div>

              {/* Divider */}
              <div style={{
                height: "1px",
                background: "#e2e8f0",
                margin: "16px 0"
              }}></div>

              {/* Details Grid */}
              <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "16px" }}>📍</span>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                      {f.source} → {f.destination}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ fontSize: "14px", color: "#64748b", minWidth: "90px" }}>Departure:</span>
                  <span style={{ fontSize: "14px", color: "#1e293b" }}>
                    {new Date(f.departure_time).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ fontSize: "14px", color: "#64748b", minWidth: "90px" }}>Arrival:</span>
                  <span style={{ fontSize: "14px", color: "#1e293b" }}>
                    {new Date(f.arrival_time).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <span style={{ fontSize: "20px" }}>💰</span>
                  <span style={{ fontSize: "18px", fontWeight: "700", color: "#059669" }}>
                    ${parseFloat(f.price || f.ticket_price || f.cost || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{
                display: "flex",
                gap: "8px",
                paddingTop: "12px",
                borderTop: "1px solid #f1f5f9"
              }}>
                <button 
                  className="primary-btn"
                  onClick={() => handleEdit(f)}
                  style={{ flex: 1, padding: "8px 16px", fontSize: "14px" }}
                >
                  Edit
                </button>
                <button 
                  className="delete" 
                  onClick={() => handleDelete(f.flight_id)}
                  style={{ flex: 1, padding: "8px 16px", fontSize: "14px" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!editingFlight}
        onClose={() => setEditingFlight(null)}
        title="Edit Flight"
        size="large"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
          <div className="form-group">
            <label>Airline</label>
            <input
              type="text"
              value={editFormData.airline}
              onChange={(e) => setEditFormData({ ...editFormData, airline: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Flight Number</label>
            <input
              type="text"
              value={editFormData.flight_no}
              onChange={(e) => setEditFormData({ ...editFormData, flight_no: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Source</label>
            <input
              type="text"
              value={editFormData.source}
              onChange={(e) => setEditFormData({ ...editFormData, source: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Destination</label>
            <input
              type="text"
              value={editFormData.destination}
              onChange={(e) => setEditFormData({ ...editFormData, destination: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Departure Time</label>
            <input
              type="datetime-local"
              value={editFormData.departure_time}
              onChange={(e) => setEditFormData({ ...editFormData, departure_time: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Arrival Time</label>
            <input
              type="datetime-local"
              value={editFormData.arrival_time}
              onChange={(e) => setEditFormData({ ...editFormData, arrival_time: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Price</label>
            <input
              type="number"
              step="0.01"
              value={editFormData.price}
              onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Seats Available</label>
            <input
              type="number"
              value={editFormData.seats_available}
              onChange={(e) => setEditFormData({ ...editFormData, seats_available: e.target.value })}
              required
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="primary-btn" onClick={() => setEditingFlight(null)} style={{ background: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)" }}>
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setAddFormData({
            airline: "",
            flight_no: "",
            source: "",
            destination: "",
            departure_time: "",
            arrival_time: "",
            price: "",
            seats_available: ""
          });
        }}
        title="Add New Flight"
        size="large"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
          <div className="form-group">
            <label>Airline *</label>
            <input
              type="text"
              value={addFormData.airline}
              onChange={(e) => setAddFormData({ ...addFormData, airline: e.target.value })}
              placeholder="e.g., Pakistan International Airlines"
              required
            />
          </div>
          <div className="form-group">
            <label>Flight Number *</label>
            <input
              type="text"
              value={addFormData.flight_no}
              onChange={(e) => setAddFormData({ ...addFormData, flight_no: e.target.value })}
              placeholder="e.g., PK-123"
              required
            />
          </div>
          <div className="form-group">
            <label>Source *</label>
            <input
              type="text"
              value={addFormData.source}
              onChange={(e) => setAddFormData({ ...addFormData, source: e.target.value })}
              placeholder="e.g., Karachi"
              required
            />
          </div>
          <div className="form-group">
            <label>Destination *</label>
            <input
              type="text"
              value={addFormData.destination}
              onChange={(e) => setAddFormData({ ...addFormData, destination: e.target.value })}
              placeholder="e.g., Lahore"
              required
            />
          </div>
          <div className="form-group">
            <label>Departure Time *</label>
            <input
              type="datetime-local"
              value={addFormData.departure_time}
              onChange={(e) => setAddFormData({ ...addFormData, departure_time: e.target.value })}
              required
            />
            <small style={{ color: "#64748b", fontSize: "12px", marginTop: "4px", display: "block" }}>
              Note: Flights from 2025 are not allowed
            </small>
          </div>
          <div className="form-group">
            <label>Arrival Time *</label>
            <input
              type="datetime-local"
              value={addFormData.arrival_time}
              onChange={(e) => setAddFormData({ ...addFormData, arrival_time: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Price *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={addFormData.price}
              onChange={(e) => setAddFormData({ ...addFormData, price: e.target.value })}
              placeholder="e.g., 500.00"
              required
            />
          </div>
          <div className="form-group">
            <label>Seats Available *</label>
            <input
              type="number"
              min="0"
              value={addFormData.seats_available}
              onChange={(e) => setAddFormData({ ...addFormData, seats_available: e.target.value })}
              placeholder="e.g., 150"
              required
            />
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="primary-btn" 
              onClick={() => {
                setIsAddModalOpen(false);
                setAddFormData({
                  airline: "",
                  flight_no: "",
                  source: "",
                  destination: "",
                  departure_time: "",
                  arrival_time: "",
                  price: "",
                  seats_available: ""
                });
              }} 
              style={{ background: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)" }}
            >
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Add Flight
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
