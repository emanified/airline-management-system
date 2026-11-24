// =======================
// BASE URL
// =======================
export const BASE_URL = "http://127.0.0.1:5001";

// Re-export all admin and user service functions
export * from './admin';
export * from './user';

// =======================
// UNIVERSAL AUTH FETCH
// =======================
export async function authFetch(endpoint, options = {}) {
    const isAdminRoute = endpoint.startsWith("/api/admin") || 
                         endpoint.startsWith("/api/crew") ||
                         endpoint.startsWith("/api/schedules") || 
                         endpoint.startsWith("/api/operations") ||
                         endpoint.startsWith("/api/reports") ||
                         endpoint.startsWith("/api/admin/flights");

    const token = isAdminRoute
        ? localStorage.getItem("adminToken")
        : localStorage.getItem("userToken");

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorBody;
        try {
            errorBody = await response.json();
        } catch {
            errorBody = { message: response.statusText };
        }
        // Include error details if available
        const errorMessage = errorBody.error || errorBody.message || errorBody.details || `HTTP error! Status: ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.details = errorBody.details || errorBody;
        throw error;
    }

    return response.json();
}

// =======================
// USER API
// =======================

// 1. User Authentication
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

// 2. Flights
export async function fetchFlights() {
    return authFetch("/api/flights"); // GET all flights
}

export async function fetchFlightById(flightId) {
    return authFetch(`/api/flights/${flightId}`);
}

// 3. Bookings
export async function fetchUserBookings(userId) {
    return authFetch(`/api/users/${userId}/bookings`);
}

export async function bookFlight(flightId, userId, seatsBooked = 1, classType = "Economy") {
    return authFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
            flight_id: flightId,
            user_id: userId,
            seats_booked: seatsBooked,
            class_type: classType
        }),
    });
}

export async function fetchBookingDetails(bookingId) {
    return authFetch(`/api/bookings/${bookingId}`);
}

export async function deleteBooking(bookingId) {
    return authFetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
}

export async function editBooking(bookingId, data) {
    return authFetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

// 4. Payments
export async function processPayment(payload) {
    return authFetch("/api/payment/charge", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function verifyPayment({ payment_id, transaction_id }) {
    return authFetch("/api/payment/verify", {
        method: "POST",
        body: JSON.stringify({ payment_id, transaction_id }),
    });
}

export async function fetchPaymentHistory(userId) {
    return authFetch(`/api/payment/history/${userId}`);
}

// 5. Tickets
export async function fetchTicket(bookingId) {
    return authFetch(`/api/bookings/${bookingId}/ticket`);
}