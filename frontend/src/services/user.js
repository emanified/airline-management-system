// src/services/user.js
import { authFetch } from "./api";

// =======================
// USER AUTH
// =======================
export async function userLogin(username, password) {
  return authFetch("/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function registerUser({ username, email, password }) {
  return authFetch("/api/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

// =======================
// FLIGHTS & BOOKINGS
// =======================

// Get all available flights
export async function fetchFlights() {
  return authFetch("/api/flights");
}

// Get a single flight by ID
export async function fetchFlightById(flightId) {
  return authFetch(`/api/flights/${flightId}`);
}

// Book a flight
export async function bookFlight(userId, flightId, classType, passengerDetails, seatsBooked = 1, payment = null, seatNumber = null) {
  const payload = {
    user_id: userId ? parseInt(userId) : null,  // Include user_id for logged-in users
    flight_id: flightId,
    class_type: classType,
    seats_booked: seatsBooked,
    passenger: passengerDetails,
  };
  
  // Add seat number if provided
  if (seatNumber) {
    payload.seat_number = seatNumber;
    payload.selectedSeat = seatNumber; // Also include for backward compatibility
  }
  
  // Add payment info if provided (for booking creation endpoint)
  if (payment) {
    payload.payment = {
      amount: payment.amount,
      card_type: payment.payment_method || "Card",
      card_last4: "****"
    };
  }
  
  return authFetch("/api/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Get booked seats for a flight
export async function getBookedSeats(flightId) {
  return authFetch(`/api/flights/${flightId}/booked-seats`);
}

// Edit booking
export async function editBooking(bookingId, data) {
  return authFetch(`/api/bookings/${bookingId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Delete booking
export async function deleteBooking(bookingId) {
  return authFetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
}

// Get ticket info
export async function getTicket(bookingId) {
  return authFetch(`/api/bookings/${bookingId}/ticket`);
}

// Fetch flight status
export async function fetchFlightStatus(flightNo) {
  return authFetch(`/api/flights/status?flight_no=${flightNo}`, { method: "GET" });
}

// =======================
// USER PROFILE (new)
// =======================

// Fetch the logged-in user's profile (including flights)
export async function fetchUserProfile() {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    throw new Error("User not logged in");
  }
  return authFetch(`/api/user/profile/${userId}`, { method: "GET" });
}

// Update user profile
export async function updateUserProfile(data) {
  return authFetch("/user/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Upload avatar
export async function uploadUserAvatar(file) {
  const formData = new FormData();
  formData.append("avatar", file);
  return authFetch("/user/profile/avatar", {
    method: "PUT",
    body: formData,
  });
}
