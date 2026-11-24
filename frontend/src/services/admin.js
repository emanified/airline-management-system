// services/admin.js
import { BASE_URL, authFetch } from "./api";

// =======================
// ADMIN AUTH
// =======================
export async function adminLogin(username, password) {
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    let errorBody;
    try { errorBody = await res.json(); } 
    catch { errorBody = { message: res.statusText }; }
    throw new Error(errorBody.message || `Admin login failed: ${res.status}`);
  }

  return res.json();
}

// =======================
// DASHBOARD DATA
// =======================
export async function getAdminStats() {
  return authFetch("/api/admin/stats");
}

export async function getAdminBookings(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const endpoint = `/api/admin/bookings${params ? `?${params}` : ""}`;
  return authFetch(endpoint);
}

// =======================
// USERS CRUD
// =======================
export async function getAdminUsers() {
  return authFetch("/api/admin/users");
}

export async function addAdminUser(data) {
  return authFetch("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAdminUser(id, data) {
  return authFetch(`/api/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAdminUser(id) {
  return authFetch(`/api/admin/users/${id}`, { method: "DELETE" });
}

// =======================
// FLIGHTS CRUD
// =======================
export async function getAdminFlights() {
  return authFetch("/api/admin/flights");
}

export async function addAdminFlight(data) {
  return authFetch("/api/admin/flights", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAdminFlight(id, data) {
  return authFetch(`/api/admin/flights/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAdminFlight(id) {
  return authFetch(`/api/admin/flights/${id}`, { method: "DELETE" });
}

// Update flight data (delete 2025 flights, add new flights)
export async function updateFlightData() {
  return authFetch("/api/admin/flights/update", {
    method: "POST",
  });
}

// =======================
// CREW CRUD
// =======================
export async function getAdminCrew() {
  return authFetch("/api/crew");
}

export async function addCrewMember(data) {
  return authFetch("/api/crew", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCrewMember(id, data) {
  return authFetch(`/api/crew/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCrewMember(id) {
  return authFetch(`/api/crew/${id}`, { method: "DELETE" });
}

// =======================
// SCHEDULES CRUD
// =======================
export async function getAdminSchedules() {
  return authFetch("/api/schedules");
}

export async function addSchedule(data) {
  return authFetch("/api/schedules", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSchedule(id, data) {
  return authFetch(`/api/schedules/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteSchedule(id) {
  return authFetch(`/api/schedules/${id}`, { method: "DELETE" });
}

// Sync schedules with flights (create schedules for flights without schedules)
export async function syncSchedules() {
  return authFetch("/api/admin/schedules/sync", {
    method: "POST",
  });
}

// =======================
// OPERATIONS CRUD
// =======================
export async function getAdminOperations() {
  return authFetch("/api/operations");
}

export async function addOperation(data) {
  return authFetch("/api/operations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateOperation(id, data) {
  return authFetch(`/api/operations/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteOperation(id) {
  return authFetch(`/api/operations/${id}`, { method: "DELETE" });
}


// =======================
// REPORTS CRUD
// =======================
export async function getAdminReports() {
  return authFetch("/api/reports");
}

export async function addReport(data) {
  return authFetch("/api/reports", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateReport(id, data) {
  return authFetch(`/api/reports/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteReport(id) {
  return authFetch(`/api/reports/${id}`, { method: "DELETE" });
}

// Add sample crew data
export async function addCrewData() {
  return authFetch("/api/admin/crew/add-data", {
    method: "POST",
  });
}

// Add sample reports data
export async function addReportsData() {
  return authFetch("/api/admin/reports/add-data", {
    method: "POST",
  });
}

// Cleanup old data (delete 2024 and 2025, keep only 2026)
export async function cleanupOldData() {
  return authFetch("/api/admin/cleanup-old-data", {
    method: "POST",
  });
}
