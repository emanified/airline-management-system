import { useEffect, useState, useCallback } from "react";
import '../../../styles/common-theme.css';
import '../../../styles/AdminPages.css';
import './reports.css';
import { authFetch } from "../../../services/api";
import { addReport, deleteReport } from "../../../services/admin";
import Modal from "../../../components/Modal";

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);
  const [addFormData, setAddFormData] = useState({
    title: "",
    content: "",
    report_type: "",
    status: "",
    date: ""
  });

  // Fetch reports from API
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authFetch("/api/reports/");
      // API returns array directly from database
      const reportsData = Array.isArray(response) ? response : (response.data || []);
      console.log("Fetched reports from database:", reportsData);
      console.log("Number of reports:", reportsData.length);
      if (reportsData.length > 0) {
        console.log("First report sample:", reportsData[0]);
        console.log("First report keys:", Object.keys(reportsData[0]));
        console.log("First report content value:", reportsData[0].content);
        console.log("First report content type:", typeof reportsData[0].content);
      }
      // Ensure all reports have content field, even if empty
      // Check for content in multiple possible field names
      const normalizedReports = reportsData.map(report => {
        // Try to find content in various possible field names
        let contentValue = '';
        if (report.content !== undefined && report.content !== null) {
          contentValue = String(report.content);
        } else if (report.report_content !== undefined && report.report_content !== null) {
          contentValue = String(report.report_content);
        } else if (report.body !== undefined && report.body !== null) {
          contentValue = String(report.body);
        } else if (report.text !== undefined && report.text !== null) {
          contentValue = String(report.text);
        } else if (report.description !== undefined && report.description !== null) {
          contentValue = String(report.description);
        }
        
        // Try to find title in various possible field names
        let titleValue = '';
        if (report.title !== undefined && report.title !== null) {
          titleValue = String(report.title);
        } else if (report.report_title !== undefined && report.report_title !== null) {
          titleValue = String(report.report_title);
        } else if (report.name !== undefined && report.name !== null) {
          titleValue = String(report.name);
        }
        
        console.log(`Report ${report.report_id || report.id}:`, {
          original: report,
          content: contentValue,
          title: titleValue,
          allKeys: Object.keys(report)
        });
        
        return {
          report_id: report.report_id || report.id,
          title: titleValue,
          content: contentValue,
          created_at: report.created_at || report.createdAt || report.created_date || report.date_created
        };
      });
      setReports(normalizedReports);
    } catch (err) {
      console.error("Reports Fetch Error:", err);
      setError(err.message || "Failed to fetch reports.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);


  const handleAdd = async () => {
    try {
      // Prepare data for backend - send required fields: title and report_type
      const reportData = {
        title: addFormData.title,
        report_type: addFormData.report_type || 'General', // Required field, default to 'General' if not selected
        content: addFormData.content
      };
      
      // Optionally add status and date if provided
      if (addFormData.status) {
        reportData.status = addFormData.status;
      }
      if (addFormData.date) {
        reportData.date = addFormData.date;
      }
      
      await addReport(reportData);
      setMessage("Report added successfully!");
      setIsAddModalOpen(false);
      setAddFormData({ title: "", content: "", report_type: "", status: "", date: "" });
      fetchReports();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to add report: " + (err.message || "Unknown error"));
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteReport(reportId);
      setMessage("Report deleted successfully!");
      fetchReports();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to delete report: " + (err.message || "Unknown error"));
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="main-title">Reports</h1>
        <p>Loading reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="main-title">Reports</h1>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  // Calculate statistics by report type
  const reportTypes = reports.reduce((acc, report) => {
    const type = report.report_type || 'General';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "12px" }}>
        <h1 className="main-title" style={{ margin: 0 }}>Reports</h1>
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
            Add New Report
          </button>
          <button
            onClick={fetchReports}
            disabled={isLoading}
            className="refresh-btn"
            title="Refresh reports"
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
      {reports.length > 0 && (
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
            <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "4px" }}>{reports.length}</div>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Reports</div>
          </div>
          {Object.entries(reportTypes).slice(0, 3).map(([type, count]) => (
            <div key={type} style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              padding: "20px",
              borderRadius: "12px",
              color: "white",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "4px" }}>{count}</div>
              <div style={{ fontSize: "14px", opacity: 0.9 }}>{type}</div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title" style={{ marginBottom: "20px" }}>Reports List</h2>
      
      {reports.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
          <p style={{ fontSize: "18px", color: "#64748b", margin: 0 }}>No reports found.</p>
          <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "8px" }}>Click "Add New Report" to get started.</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "20px"
        }}>
          {reports.map((report, index) => (
            <div 
              key={report.report_id || report.id || index}
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
              {/* Report Type Badge */}
              {report.report_type && (
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
                  {report.report_type}
                </div>
              )}

              {/* Header */}
              <div style={{ marginBottom: "16px", paddingRight: report.report_type ? "100px" : "0" }}>
                <div style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#1e293b",
                  marginBottom: "4px"
                }}>
                  {report.title || `Report #${report.report_id || report.id || index}`}
                </div>
              </div>

              {/* Divider */}
              <div style={{
                height: "1px",
                background: "#e2e8f0",
                margin: "16px 0"
              }}></div>

              {/* Content Preview */}
              {report.content && report.content.trim() ? (
                <div style={{
                  marginBottom: "16px",
                  color: "#475569",
                  lineHeight: "1.6",
                  fontSize: "14px",
                  maxHeight: "100px",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {typeof report.content === 'string' && report.content.length > 150 
                    ? `${report.content.substring(0, 150)}...` 
                    : report.content}
                </div>
              ) : (
                <div style={{
                  marginBottom: "16px",
                  color: "#94a3b8",
                  fontStyle: "italic",
                  fontSize: "14px"
                }}>
                  No content available
                </div>
              )}

              {/* Footer */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "12px",
                borderTop: "1px solid #f1f5f9"
              }}>
                {report.created_at && (
                  <div style={{
                    fontSize: "12px",
                    color: "#94a3b8"
                  }}>
                    {new Date(report.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    className="primary-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingReport(report);
                    }}
                    style={{ flex: 1, padding: "8px 16px", fontSize: "14px" }}
                  >
                    View
                  </button>
                  <button 
                    className="delete" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(report.report_id || report.id);
                    }}
                    style={{ flex: 1, padding: "8px 16px", fontSize: "14px" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setAddFormData({ title: "", content: "", report_type: "", status: "", date: "" });
        }}
        title="Add New Report"
        size="medium"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
          <div className="form-group">
            <label>Report Title *</label>
            <input
              type="text"
              value={addFormData.title}
              onChange={(e) => setAddFormData({ ...addFormData, title: e.target.value })}
              placeholder="Enter report title"
              required
            />
          </div>
          <div className="form-group">
            <label>Report Type *</label>
            <select
              value={addFormData.report_type || ""}
              onChange={(e) => setAddFormData({ ...addFormData, report_type: e.target.value })}
              required
            >
              <option value="">Select Report Type</option>
              <option value="Financial">Financial</option>
              <option value="Operational">Operational</option>
              <option value="Safety">Safety</option>
              <option value="Performance">Performance</option>
              <option value="Monthly">Monthly</option>
              <option value="Annual">Annual</option>
              <option value="General">General</option>
            </select>
          </div>
          <div className="form-group">
            <label>Report Content *</label>
            <textarea
              value={addFormData.content}
              onChange={(e) => setAddFormData({ ...addFormData, content: e.target.value })}
              placeholder="Enter detailed report content..."
              required
              rows="8"
              style={{ 
                width: "100%", 
                padding: "12px", 
                borderRadius: "8px", 
                border: "1px solid var(--border-color, #e2e8f0)", 
                fontFamily: "inherit",
                fontSize: "14px",
                resize: "vertical",
                minHeight: "120px"
              }}
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              value={addFormData.status || ""}
              onChange={(e) => setAddFormData({ ...addFormData, status: e.target.value })}
            >
              <option value="">Select Status</option>
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Published">Published</option>
            </select>
          </div>
          <div className="form-group">
            <label>Report Date</label>
            <input
              type="date"
              value={addFormData.date || ""}
              onChange={(e) => setAddFormData({ ...addFormData, date: e.target.value })}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="primary-btn" onClick={() => {
              setIsAddModalOpen(false);
              setAddFormData({ title: "", content: "", report_type: "", status: "", date: "" });
            }} style={{ background: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)" }}>
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Add Report
            </button>
          </div>
        </form>
      </Modal>

      {/* View Report Modal */}
      <Modal
        isOpen={!!viewingReport}
        onClose={() => setViewingReport(null)}
        title={viewingReport?.title || 'Report Details'}
        size="large"
      >
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {viewingReport?.created_at && (
            <div style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
              Created: {new Date(viewingReport.created_at).toLocaleString()}
            </div>
          )}
          <div style={{ 
            whiteSpace: 'pre-wrap', 
            lineHeight: '1.8', 
            color: '#1f2937',
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '8px',
            minHeight: 0,
            maxHeight: 'calc(100vh - 280px)'
          }}>
            {viewingReport?.content && viewingReport.content.trim() ? viewingReport.content : 'No content available.'}
          </div>
        </div>
      </Modal>
    </div>
  );
}