import { useEffect, useState, useCallback } from "react";
import '../../../styles/common-theme.css';
import '../../../styles/AdminPages.css';
import './crew.css';
import { authFetch } from "../../../services/api";
import { updateCrewMember, addCrewMember } from "../../../services/admin";
import Modal from "../../../components/Modal";

export default function CrewMembersPage() {
    const [crew, setCrew] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState("");
    const [editingCrew, setEditingCrew] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addFormData, setAddFormData] = useState({
        name: "",
        role: "",
        phone: "",
        email: "",
        flight_id: ""
    });

    // Fetch Crew Data
    const fetchCrew = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await authFetch("/api/crew/");
            setCrew(response.data || response);
        } catch (err) {
            setError(err.message || "Failed to fetch crew data.");
            console.error("Crew Fetch Error:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCrew();
    }, [fetchCrew]);

    // Delete Handler
    const handleDelete = async (crewId) => {
        if (!window.confirm("Are you sure you want to delete this crew member?")) return;
        try {
            await authFetch(`/api/crew/${crewId}`, { method: "DELETE" });
            setMessage(`Crew member ID ${crewId} deleted successfully.`);
            setTimeout(() => setMessage(""), 3000);
            fetchCrew();
        } catch (err) {
            setMessage(`Failed to delete crew member: ${err.message}`);
            setTimeout(() => setMessage(""), 3000);
        }
    };

    const handleEdit = (member) => {
        setEditingCrew(member);
        setEditFormData({
            name: member.name || "",
            role: member.role || "",
            flight_id: member.flight_id || "",
            email: member.email || "",
            phone: member.phone || ""
        });
    };

    const handleSaveEdit = async () => {
        try {
            const crewId = editingCrew.crew_id || editingCrew.id;
            await updateCrewMember(crewId, editFormData);
            setMessage("Crew member updated successfully!");
            setEditingCrew(null);
            fetchCrew();
            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            setMessage("Failed to update crew member.");
            setTimeout(() => setMessage(""), 3000);
        }
    };

    const handleAdd = async () => {
        try {
            await addCrewMember(addFormData);
            setMessage("Crew member added successfully!");
            setIsAddModalOpen(false);
            setAddFormData({ name: "", role: "", phone: "", email: "", flight_id: "" });
            fetchCrew();
            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            setMessage("Failed to add crew member: " + (err.message || "Unknown error"));
            setTimeout(() => setMessage(""), 3000);
        }
    };

    if (isLoading) {
        return (
            <div>
                <h1 className="main-title">Crew Members Management</h1>
                <p>Loading crew list...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <h1 className="main-title">Crew Members Management</h1>
                <p style={{ color: 'red' }}>Error: {error}</p>
            </div>
        );
    }

    // Calculate statistics by role
    const roleStats = crew.reduce((acc, member) => {
      const role = member.role || 'Unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    return (
        <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "12px" }}>
                <h1 className="main-title" style={{ margin: 0 }}>Crew Members Management</h1>
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
                        Add New Crew Member
                    </button>
                    <button
                        onClick={fetchCrew}
                        disabled={isLoading}
                        className="refresh-btn"
                        title="Refresh crew members"
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
            {crew.length > 0 && (
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
                        <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "4px" }}>{crew.length}</div>
                        <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Crew</div>
                    </div>
                    {Object.entries(roleStats).slice(0, 3).map(([role, count]) => (
                        <div key={role} style={{
                            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                            padding: "20px",
                            borderRadius: "12px",
                            color: "white",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                        }}>
                            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "4px" }}>{count}</div>
                            <div style={{ fontSize: "14px", opacity: 0.9 }}>{role}</div>
                        </div>
                    ))}
                </div>
            )}

            <h2 className="section-title" style={{ marginBottom: "20px" }}>Crew Members List</h2>
            
            {crew.length === 0 ? (
                <div style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    background: "white",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>👥</div>
                    <p style={{ fontSize: "18px", color: "#64748b", margin: 0 }}>No crew members found.</p>
                    <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "8px" }}>Click "Add New Crew Member" to get started.</p>
                </div>
            ) : (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                    gap: "20px"
                }}>
                    {crew.map((member, index) => (
                        <div 
                            key={member.crew_id || index}
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
                            {/* Role Badge */}
                            {member.role && (
                                <div style={{
                                    position: "absolute",
                                    top: "16px",
                                    right: "16px",
                                    padding: "6px 12px",
                                    borderRadius: "20px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    background: "#e0e7ff",
                                    color: "#4338ca",
                                    border: "1px solid #818cf8"
                                }}>
                                    {member.role}
                                </div>
                            )}

                            {/* Header */}
                            <div style={{ marginBottom: "16px", paddingRight: member.role ? "100px" : "0" }}>
                                <div style={{
                                    fontSize: "18px",
                                    fontWeight: "700",
                                    color: "#1e293b",
                                    marginBottom: "4px"
                                }}>
                                    {member.name || `Crew Member #${member.crew_id || index}`}
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
                                {member.flight_id && (
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                        <span style={{ fontSize: "14px", color: "#64748b", minWidth: "90px" }}>Flight ID:</span>
                                        <span style={{ fontSize: "14px", color: "#1e293b", fontWeight: "600" }}>{member.flight_id}</span>
                                    </div>
                                )}
                                {member.email && (
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                        <span style={{ fontSize: "14px", color: "#64748b", minWidth: "90px" }}>Email:</span>
                                        <span style={{ fontSize: "14px", color: "#1e293b" }}>{member.email}</span>
                                    </div>
                                )}
                                {member.phone && (
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                        <span style={{ fontSize: "14px", color: "#64748b", minWidth: "90px" }}>Phone:</span>
                                        <span style={{ fontSize: "14px", color: "#1e293b" }}>{member.phone}</span>
                                    </div>
                                )}
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
                                    onClick={() => handleEdit(member)} 
                                    style={{ flex: 1, padding: "8px 16px", fontSize: "14px" }}
                                >
                                    Edit
                                </button>
                                <button 
                                    className="delete" 
                                    onClick={() => handleDelete(member.crew_id || index)}
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
                isOpen={!!editingCrew}
                onClose={() => setEditingCrew(null)}
                title="Edit Crew Member"
                size="medium"
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
                    <div className="form-group">
                        <label>Name</label>
                        <input
                            type="text"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Role</label>
                        <input
                            type="text"
                            value={editFormData.role}
                            onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Flight ID</label>
                        <input
                            type="number"
                            value={editFormData.flight_id}
                            onChange={(e) => setEditFormData({ ...editFormData, flight_id: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Phone</label>
                        <input
                            type="text"
                            value={editFormData.phone}
                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="primary-btn" onClick={() => setEditingCrew(null)} style={{ background: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)" }}>
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
                    setAddFormData({ name: "", role: "", phone: "", email: "", flight_id: "" });
                }}
                title="Add New Crew Member"
                size="medium"
            >
                <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
                    <div className="form-group">
                        <label>Name *</label>
                        <input
                            type="text"
                            value={addFormData.name}
                            onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Role *</label>
                        <input
                            type="text"
                            value={addFormData.role}
                            onChange={(e) => setAddFormData({ ...addFormData, role: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Phone</label>
                        <input
                            type="text"
                            value={addFormData.phone}
                            onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={addFormData.email}
                            onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Flight ID</label>
                        <input
                            type="number"
                            value={addFormData.flight_id}
                            onChange={(e) => setAddFormData({ ...addFormData, flight_id: e.target.value })}
                        />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="primary-btn" onClick={() => {
                            setIsAddModalOpen(false);
                            setAddFormData({ name: "", role: "", phone: "", email: "", flight_id: "" });
                        }} style={{ background: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)" }}>
                            Cancel
                        </button>
                        <button type="submit" className="primary-btn">
                            Add Crew Member
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
