import { useEffect, useState, useCallback } from "react";
import '../../../styles/common-theme.css';
import '../../../styles/AdminPages.css';
import './schedules.css';
import { authFetch } from "../../../services/api";
import { updateSchedule, addSchedule } from "../../../services/admin";
import Modal from "../../../components/Modal";

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    flight_id: "",
    departure_time: "",
    arrival_time: "",
    status: "Scheduled"
  });

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authFetch("/api/schedules/");
      setSchedules(response.data || response);
    } catch (err) {
      setError(err.message || "Failed to fetch schedules.");
      console.error("Schedules Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Delete handler
  const handleDelete = async (scheduleId) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) return;
    try {
      await authFetch(`/api/schedules/${scheduleId}`, { method: "DELETE" });
      setMessage(`Schedule ID ${scheduleId} deleted successfully.`);
      setTimeout(() => setMessage(""), 3000);
      fetchSchedules();
    } catch (err) {
      setMessage(`Failed to delete schedule: ${err.message}`);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    const scheduleId = schedule.schedule_id || schedule.id;
    setEditFormData({
      flight_id: schedule.flight_id || "",
      departure_time: schedule.departure_time ? new Date(schedule.departure_time).toISOString().slice(0, 16) : "",
      arrival_time: schedule.arrival_time ? new Date(schedule.arrival_time).toISOString().slice(0, 16) : "",
      status: schedule.status || "Scheduled"
    });
  };

  const handleSaveEdit = async () => {
    try {
      const scheduleId = editingSchedule.schedule_id || editingSchedule.id;
      await updateSchedule(scheduleId, editFormData);
      setMessage("Schedule updated successfully!");
      setEditingSchedule(null);
      fetchSchedules();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to update schedule.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleAdd = async () => {
    try {
      await addSchedule(addFormData);
      setMessage("Schedule added successfully!");
      setIsAddModalOpen(false);
      setAddFormData({ flight_id: "", departure_time: "", arrival_time: "", status: "Scheduled" });
      fetchSchedules();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to add schedule: " + (err.message || "Unknown error"));
      setTimeout(() => setMessage(""), 3000);
    }
  };


  if (isLoading) {
    return (
      <div>
        <h1 className="main-title">Schedules Management</h1>
        <p>Loading schedules...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="main-title">Schedules Management</h1>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  // Calculate statistics by status
  const statusStats = schedules.reduce((acc, schedule) => {
    const status = schedule.status || 'Scheduled';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "12px" }}>
        <h1 className="main-title" style={{ margin: 0 }}>Schedules Management</h1>
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
            Add New Schedule
          </button>
          <button
            onClick={fetchSchedules}
            disabled={isLoading}
            className="refresh-btn"
            title="Refresh schedules"
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
      {schedules.length > 0 && (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
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
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "4px" }}>{schedules.length}</div>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Schedules</div>
          </div>
          {Object.entries(statusStats).slice(0, 3).map(([status, count]) => {
            const statusColors = {
              'Scheduled': { bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
              'On Time': { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
              'Delayed': { bg: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)' },
              'Cancelled': { bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }
            };
            return (
              <div key={status} style={{
                background: statusColors[status]?.bg || 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                padding: "20px",
                borderRadius: "12px",
                color: "white",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
              }}>
                <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "4px" }}>{count}</div>
                <div style={{ fontSize: "14px", opacity: 0.9 }}>{status}</div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="section-title" style={{ marginBottom: "20px" }}>Schedules List</h2>
      
      {schedules.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📅</div>
          <p style={{ fontSize: "18px", color: "#64748b", margin: 0 }}>No schedules found.</p>
          <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "8px" }}>Click "Add New Schedule" to get started.</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: "20px"
        }}>
          {schedules.map((sch, index) => {
            const statusColors = {
              'Scheduled': { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
              'On Time': { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
              'Delayed': { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' },
              'Cancelled': { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' }
            };
            const statusColor = statusColors[sch.status] || statusColors['Scheduled'];
            
            return (
              <div 
                key={sch.schedule_id || sch.id || index}
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
                  {sch.status || "Scheduled"}
                </div>

                {/* Header */}
                <div style={{ marginBottom: "16px", paddingRight: "100px" }}>
                  <div style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#1e293b",
                    marginBottom: "4px"
                  }}>
                    Schedule #{sch.schedule_id || sch.id || index}
                  </div>
                  <div style={{
                    fontSize: "14px",
                    color: "#64748b",
                    fontWeight: "500"
                  }}>
                    Flight ID: {sch.flight_id || "N/A"}
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
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#64748b", minWidth: "90px" }}>Departure:</span>
                    <span style={{ fontSize: "14px", color: "#1e293b" }}>
                      {sch.departure_time ? new Date(sch.departure_time).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : "N/A"}
                    </span>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#64748b", minWidth: "90px" }}>Arrival:</span>
                    <span style={{ fontSize: "14px", color: "#1e293b" }}>
                      {sch.arrival_time ? new Date(sch.arrival_time).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : "N/A"}
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
                    onClick={() => handleEdit(sch)} 
                    style={{ flex: 1, padding: "8px 16px", fontSize: "14px" }}
                  >
                    Edit
                  </button>
                  <button 
                    className="delete" 
                    onClick={() => handleDelete(sch.schedule_id || sch.id || index)}
                    style={{ flex: 1, padding: "8px 16px", fontSize: "14px" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={!!editingSchedule}
        onClose={() => setEditingSchedule(null)}
        title="Edit Schedule"
        size="medium"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
          <div className="form-group">
            <label>Flight ID</label>
            <input
              type="number"
              value={editFormData.flight_id}
              onChange={(e) => setEditFormData({ ...editFormData, flight_id: e.target.value })}
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
            <label>Status</label>
            <select
              value={editFormData.status}
              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              required
            >
              <option value="Scheduled">Scheduled</option>
              <option value="On Time">On Time</option>
              <option value="Delayed">Delayed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="primary-btn" onClick={() => setEditingSchedule(null)} style={{ background: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)" }}>
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
          setAddFormData({ flight_id: "", departure_time: "", arrival_time: "", status: "Scheduled" });
        }}
        title="Add New Schedule"
        size="medium"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
          <div className="form-group">
            <label>Flight ID *</label>
            <input
              type="number"
              value={addFormData.flight_id}
              onChange={(e) => setAddFormData({ ...addFormData, flight_id: e.target.value })}
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
            <label>Status</label>
            <select
              value={addFormData.status}
              onChange={(e) => setAddFormData({ ...addFormData, status: e.target.value })}
            >
              <option value="Scheduled">Scheduled</option>
              <option value="On Time">On Time</option>
              <option value="Delayed">Delayed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="primary-btn" onClick={() => {
              setIsAddModalOpen(false);
              setAddFormData({ flight_id: "", departure_time: "", arrival_time: "", status: "Scheduled" });
            }} style={{ background: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)" }}>
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Add Schedule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
