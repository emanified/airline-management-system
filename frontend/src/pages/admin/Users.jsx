import React, { useState, useEffect, useCallback } from "react";
import { updateAdminUser, addAdminUser, getAdminUsers } from "../../services/admin";
import { authFetch } from "../../services/api";
import Modal from "../../components/Modal";
import "../../styles/AdminPages.css";

export default function UsersPage({ users: propUsers, deleteUser }) {
  const [users, setUsers] = useState(propUsers || []);
  const [isLoading, setIsLoading] = useState(!propUsers);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    username: "",
    email: "",
    password: "",
    phone: ""
  });
  const [message, setMessage] = useState("");

  // Fetch users if not provided as props
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setMessage("Failed to fetch users.");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!propUsers) {
      fetchUsers();
    } else {
      setUsers(propUsers);
    }
  }, [propUsers, fetchUsers]);

  if (isLoading && !propUsers) return <p>Loading users...</p>;

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username || "",
      email: user.email || "",
      phone: user.phone || ""
    });
  };

  const handleSaveEdit = async () => {
    try {
      await updateAdminUser(editingUser.user_id, editFormData);
      setMessage("User updated successfully!");
      setEditingUser(null);
      if (!propUsers) {
        fetchUsers();
      } else {
        // Update local state
        setUsers(users.map(u => 
          u.user_id === editingUser.user_id 
            ? { ...u, ...editFormData } 
            : u
        ));
      }
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to update user.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleAdd = async () => {
    try {
      // Validate form data
      if (!addFormData.username || !addFormData.email || !addFormData.password) {
        setMessage("Please fill in all required fields (Username, Email, Password).");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      if (addFormData.password.length < 6) {
        setMessage("Password must be at least 6 characters.");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      await addAdminUser(addFormData);
      setMessage("User added successfully!");
      setIsAddModalOpen(false);
      setAddFormData({
        username: "",
        email: "",
        password: "",
        phone: ""
      });
      if (!propUsers) {
        fetchUsers();
      }
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to add user: " + (err.message || "Unknown error"));
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "12px" }}>
        <h1 className="main-title" style={{ margin: 0 }}>Users Management</h1>
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
            Add New User
          </button>
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="refresh-btn"
            title="Refresh users"
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

      {/* Statistics Card */}
      {users.length > 0 && (
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
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "4px" }}>{users.length}</div>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Users</div>
          </div>
        </div>
      )}

      <h2 className="section-title" style={{ marginBottom: "20px" }}>Users List</h2>
      
      {users.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>👤</div>
          <p style={{ fontSize: "18px", color: "#64748b", margin: 0 }}>No users found.</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "20px"
        }}>
          {users.map(u => (
            <div 
              key={u.user_id}
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
              {/* User ID Badge */}
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
                ID: {u.user_id}
              </div>

              {/* Header */}
              <div style={{ marginBottom: "16px", paddingRight: "80px" }}>
                <div style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#1e293b",
                  marginBottom: "4px"
                }}>
                  {u.username}
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
                  <span style={{ fontSize: "14px", color: "#64748b", minWidth: "70px" }}>Email:</span>
                  <span style={{ fontSize: "14px", color: "#1e293b" }}>{u.email}</span>
                </div>
                {u.phone && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#64748b", minWidth: "70px" }}>Phone:</span>
                    <span style={{ fontSize: "14px", color: "#1e293b" }}>{u.phone}</span>
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
                  onClick={() => handleEdit(u)}
                  style={{ flex: 1, padding: "8px 16px", fontSize: "14px" }}
                >
                  Edit
                </button>
                <button 
                  className="delete" 
                  onClick={() => deleteUser(u.user_id)}
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
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit User"
        size="medium"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={editFormData.username}
              onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="text"
              value={editFormData.phone || ""}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="primary-btn" onClick={() => setEditingUser(null)} style={{ background: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)" }}>
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
            username: "",
            email: "",
            password: "",
            phone: ""
          });
        }}
        title="Add New User"
        size="medium"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
          <div className="form-group">
            <label>Username *</label>
            <input
              type="text"
              value={addFormData.username}
              onChange={(e) => setAddFormData({ ...addFormData, username: e.target.value })}
              placeholder="e.g., john_doe"
              required
            />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={addFormData.email}
              onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
              placeholder="e.g., john@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              value={addFormData.password}
              onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
              placeholder="Minimum 6 characters"
              minLength="6"
              required
            />
            <small style={{ color: "#64748b", fontSize: "12px", marginTop: "4px", display: "block" }}>
              Password must be at least 6 characters
            </small>
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="text"
              value={addFormData.phone}
              onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
              placeholder="e.g., +1234567890"
            />
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="primary-btn" 
              onClick={() => {
                setIsAddModalOpen(false);
                setAddFormData({
                  username: "",
                  email: "",
                  password: "",
                  phone: ""
                });
              }} 
              style={{ background: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)" }}
            >
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Add User
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
