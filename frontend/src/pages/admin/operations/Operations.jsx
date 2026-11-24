import { useEffect, useState, useCallback } from "react";
import '../../../styles/common-theme.css';
import '../../../styles/AdminPages.css';
import './operations.css';
import { authFetch } from "../../../services/api";
import { addOperation } from "../../../services/admin";
import Modal from "../../../components/Modal";

export default function OperationsPage() {
  const [operations, setOperations] = useState([]);
  const [flights, setFlights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    flight_id: "",
    operation_type: "",
    scheduled_at: "",
    status: "Pending",
    completed_at: ""
  });

  // Fetch flights for dropdown
  const fetchFlights = useCallback(async () => {
    try {
      const response = await authFetch("/api/admin/flights");
      setFlights(Array.isArray(response) ? response : (response.data || []));
    } catch (err) {
      console.error("Flights Fetch Error:", err);
    }
  }, []);

  // Fetch operations data
  const fetchOperations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authFetch("/api/operations/");
      setOperations(response.data || response);
    } catch (err) {
      setError(err.message || "Failed to fetch operations.");
      console.error("Operations Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlights();
    fetchOperations();
  }, [fetchFlights, fetchOperations]);


  const handleAdd = async () => {
    try {
      // Validate required fields before sending
      if (!addFormData.flight_id || !addFormData.operation_type || !addFormData.scheduled_at) {
        setMessage("Please fill in all required fields (Flight, Operation Type, Scheduled At)");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      // Prepare data according to schema
      const operationData = {
        flight_id: parseInt(addFormData.flight_id),
        operation_type: addFormData.operation_type.trim(),
        scheduled_at: addFormData.scheduled_at ? new Date(addFormData.scheduled_at).toISOString().slice(0, 19).replace('T', ' ') : null
      };
      
      // Validate scheduled_at was properly converted
      if (!operationData.scheduled_at) {
        setMessage("Invalid scheduled date/time format");
        setTimeout(() => setMessage(""), 3000);
        return;
      }
      
      // Add optional fields if provided
      if (addFormData.status && addFormData.status !== 'Pending') {
        operationData.status = addFormData.status;
      }
      
      if (addFormData.completed_at) {
        operationData.completed_at = new Date(addFormData.completed_at).toISOString().slice(0, 19).replace('T', ' ');
      }
      
      console.log("Sending operation data:", operationData);
      await addOperation(operationData);
      setMessage("Operation added successfully!");
      setIsAddModalOpen(false);
      setAddFormData({ flight_id: "", operation_type: "", scheduled_at: "", status: "Pending", completed_at: "" });
      fetchOperations();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Add operation error:", err);
      setMessage("Failed to add operation: " + (err.message || err.details || "Unknown error"));
      setTimeout(() => setMessage(""), 5000);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="main-title">Operations Management</h1>
        <p>Loading operations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="main-title">Operations Management</h1>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  // Calculate statistics
  const stats = {
    total: operations.length,
    pending: operations.filter(op => op.status === 'Pending').length,
    inProgress: operations.filter(op => op.status === 'In Progress').length,
    completed: operations.filter(op => op.status === 'Completed').length
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "12px" }}>
        <h1 className="main-title" style={{ margin: 0 }}>Operations Management</h1>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
          <button 
            className="primary-btn" 
            onClick={() => setIsAddModalOpen(true)}
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
            Add New Operation
          </button>
          <button
            onClick={fetchOperations}
            disabled={isLoading}
            className="refresh-btn"
            title="Refresh operations"
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
        <div className={`popup-message ${message.includes('success') ? 'success' : 'error'}`} 
             style={{ position: "relative", top: 0, left: 0, transform: "none", marginBottom: "20px" }}>
          {message}
        </div>
      )}

      {/* Statistics Cards */}
      {operations.length > 0 && (
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
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Operations</div>
          </div>
          <div style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
            padding: "20px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "4px" }}>{stats.pending}</div>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Pending</div>
          </div>
          <div style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            padding: "20px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "4px" }}>{stats.inProgress}</div>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>In Progress</div>
          </div>
          <div style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            padding: "20px",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "4px" }}>{stats.completed}</div>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Completed</div>
          </div>
        </div>
      )}

      <h2 className="section-title" style={{ marginBottom: "20px" }}>Operations List</h2>
      
      {operations.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✈️</div>
          <p style={{ fontSize: "18px", color: "#64748b", margin: 0 }}>No operations found.</p>
          <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "8px" }}>Click "Add New Operation" to get started.</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "20px"
        }}>
          {operations.map((op, index) => {
            const statusColors = {
              'Pending': { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' },
              'In Progress': { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
              'Completed': { bg: '#d1fae5', text: '#065f46', border: '#10b981' }
            };
            const statusColor = statusColors[op.status] || statusColors['Pending'];
            
            return (
              <div 
                key={op.operation_id || op.id || index}
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  border: `1px solid #e2e8f0`,
                  transition: "all 0.3s ease",
                  cursor: "pointer",
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
                {/* Status Badge */}
                <div style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  background: statusColor.bg,
                  color: statusColor.text,
                  border: `1px solid ${statusColor.border}`
                }}>
                  {op.status || "Pending"}
                </div>

                {/* Header */}
                <div style={{ marginBottom: "16px", paddingRight: "100px" }}>
                  <div style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#1e293b",
                    marginBottom: "4px"
                  }}>
                    #{op.operation_id || op.id || index}
                  </div>
                  <div style={{
                    fontSize: "14px",
                    color: "#64748b",
                    fontWeight: "500"
                  }}>
                    {op.operation_type || 'N/A'}
                  </div>
                </div>

                {/* Divider */}
                <div style={{
                  height: "1px",
                  background: "#e2e8f0",
                  margin: "16px 0"
                }}></div>

                {/* Details Grid */}
                <div style={{ display: "grid", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#64748b", minWidth: "100px" }}>Flight ID:</span>
                    <span style={{ fontSize: "14px", color: "#1e293b", fontWeight: "600" }}>{op.flight_id || "N/A"}</span>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#64748b", minWidth: "100px" }}>Scheduled:</span>
                    <span style={{ fontSize: "14px", color: "#1e293b" }}>
                      {op.scheduled_at ? new Date(op.scheduled_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : "N/A"}
                    </span>
                  </div>
                  
                  {op.completed_at && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <span style={{ fontSize: "14px", color: "#64748b", minWidth: "100px" }}>Completed:</span>
                      <span style={{ fontSize: "14px", color: "#1e293b" }}>
                        {new Date(op.completed_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {op.created_at && (
                  <div style={{
                    marginTop: "16px",
                    paddingTop: "12px",
                    borderTop: "1px solid #f1f5f9",
                    fontSize: "12px",
                    color: "#94a3b8"
                  }}>
                    Created {new Date(op.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setAddFormData({ flight_id: "", operation_type: "", scheduled_at: "", status: "Pending", completed_at: "" });
        }}
        title="Add New Operation"
        size="medium"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
          <div className="form-group">
            <label>Flight ID *</label>
            <select
              value={addFormData.flight_id || ""}
              onChange={(e) => setAddFormData({ ...addFormData, flight_id: e.target.value })}
              required
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #c8d1db", fontFamily: "inherit" }}
            >
              <option value="">Select Flight ID</option>
              {flights.map((flight) => (
                <option key={flight.flight_id} value={flight.flight_id}>
                  Flight ID: {flight.flight_id} {flight.flight_no ? `(${flight.flight_no})` : ''}
                </option>
              ))}
            </select>
            {addFormData.flight_id && flights.find(f => f.flight_id == addFormData.flight_id) && (
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>
                Route: {flights.find(f => f.flight_id == addFormData.flight_id).source} → {flights.find(f => f.flight_id == addFormData.flight_id).destination}
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Operation Type *</label>
            <input
              type="text"
              value={addFormData.operation_type}
              onChange={(e) => setAddFormData({ ...addFormData, operation_type: e.target.value })}
              placeholder="e.g., Maintenance, Cleaning, Catering"
              required
              maxLength={50}
            />
          </div>
          <div className="form-group">
            <label>Scheduled At *</label>
            <input
              type="datetime-local"
              value={addFormData.scheduled_at}
              onChange={(e) => setAddFormData({ ...addFormData, scheduled_at: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              value={addFormData.status || "Pending"}
              onChange={(e) => setAddFormData({ ...addFormData, status: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #c8d1db", fontFamily: "inherit" }}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div className="form-group">
            <label>Completed At (optional)</label>
            <input
              type="datetime-local"
              value={addFormData.completed_at}
              onChange={(e) => setAddFormData({ ...addFormData, completed_at: e.target.value })}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="primary-btn" onClick={() => {
              setIsAddModalOpen(false);
              setAddFormData({ flight_id: "", operation_type: "", scheduled_at: "", status: "Pending", completed_at: "" });
            }} style={{ background: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)" }}>
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Add Operation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
