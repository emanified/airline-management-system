import React, { useState } from "react";
import { useBooking } from "./BookingContext";
import { startStripePayment } from "../../services/paymentApi";
import "./PaymentPage.css";

const PaymentPage = ({ bookingDetails = {}, onBack, onPaymentSuccess, onPay }) => {
  const { booking } = useBooking();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  // Merge booking context with bookingDetails prop
  const completeBooking = {
    ...booking,
    ...bookingDetails,
    // Ensure we have all required fields
    user_id: booking?.user_id || bookingDetails?.user_id || localStorage.getItem("userId") || 1,
    amount: booking?.amount || bookingDetails?.amount,
    bookingId: booking?.bookingId || bookingDetails?.bookingId,
    flight: booking?.flight || bookingDetails?.flight,
    flightCode: booking?.flightCode || bookingDetails?.flightCode || bookingDetails?.flight?.flight_no || booking?.flight?.flight_no,
    flightRoute: booking?.flightRoute || bookingDetails?.flightRoute || 
                 (bookingDetails?.flight ? `${bookingDetails.flight.source} → ${bookingDetails.flight.destination}` : "") ||
                 (booking?.flight ? `${booking.flight.source} → ${booking.flight.destination}` : ""),
    flightClass: booking?.flightClass || bookingDetails?.classType,
    passengerDetails: booking?.passengerDetails || bookingDetails?.passenger,
    selectedSeat: booking?.selectedSeat || bookingDetails?.selectedSeat,
    seats_booked: booking?.seats_booked || bookingDetails?.seats_booked || 1
  };

  const handlePay = async () => {
    // Validate all required fields
    if (!completeBooking.amount) {
      setError("Please select a booking option first.");
      return;
    }

    if (!completeBooking.user_id) {
      setError("User information is missing. Please log in again.");
      return;
    }

    // Get flight from booking context or bookingDetails
    const flight = completeBooking.flight || bookingDetails?.flight || booking?.flight;
    
    if (!flight || !flight.flight_id) {
      setError("Flight information is missing. Please go back and select a flight.");
      setIsProcessing(false);
      return;
    }

    if (!completeBooking.passengerDetails || !completeBooking.passengerDetails.fullName) {
      setError("Please complete passenger details first.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      // First, create the booking in the database
      const { bookFlight } = await import("../../services/user");
      
      // Debug: Log what we're sending
      console.log("Creating booking with:", {
        userId: completeBooking.user_id,
        flightId: completeBooking.flight?.flight_id,
        classType: completeBooking.flightClass || "Economy",
        passenger: completeBooking.passengerDetails,
        seats: completeBooking.seats_booked || 1
      });
      
      const bookingResult = await bookFlight(
        completeBooking.user_id,
        flight.flight_id,
        completeBooking.flightClass || "Economy",
        completeBooking.passengerDetails,
        completeBooking.seats_booked || 1,
        null, // No payment yet - will be processed via Stripe
        completeBooking.selectedSeat // Include seat number
      );

      console.log("Booking result:", bookingResult);

      if (!bookingResult || !bookingResult.success) {
        const errorMsg = bookingResult?.message || bookingResult?.error || "Failed to create booking. Please try again.";
        setError(errorMsg);
        setIsProcessing(false);
        return;
      }

      const bookingId = bookingResult.booking_id;

      // Now create Stripe payment session with the real booking_id
      const payload = {
        user_id: parseInt(completeBooking.user_id),
        booking_id: bookingId,
        amount: parseFloat(completeBooking.amount),
        flight: completeBooking.flightCode || completeBooking.flightRoute || "Flight Ticket"
      };

      const result = await startStripePayment(payload);
      
      if (result && !result.success) {
        // Show detailed error message
        const errorMsg = result.error || result.message || result.details || "Payment failed. Please try again.";
        setError(errorMsg);
        setIsProcessing(false);
        return;
      }
      // If successful, Stripe will redirect automatically
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.message || "An error occurred while processing payment. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-section payment-page-container">
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: "transparent",
              border: "1px solid #8b5cf6",
              color: "#8b5cf6",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)";
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(139, 92, 246, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#8b5cf6";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            ← Back
          </button>
        )}
        <h2>Payment</h2>
      </div>
      
      {/* Booking Summary */}
      <div className="booking-summary">
        <h3>Booking Summary</h3>
        <div className="summary-item">
          <span className="summary-label">Flight:</span>
          <span className="summary-value">{completeBooking.flightRoute || "N/A"}</span>
        </div>
        {completeBooking.flightClass && (
          <div className="summary-item">
            <span className="summary-label">Class:</span>
            <span className="summary-value">{completeBooking.flightClass}</span>
          </div>
        )}
        {completeBooking.passengerDetails?.fullName && (
          <div className="summary-item">
            <span className="summary-label">Passenger:</span>
            <span className="summary-value">{completeBooking.passengerDetails.fullName}</span>
          </div>
        )}
        {completeBooking.selectedSeat && (
          <div className="summary-item">
            <span className="summary-label">Seat:</span>
            <span className="summary-value">{completeBooking.selectedSeat}</span>
          </div>
        )}
        <div className="summary-item total">
          <span className="summary-label">Total Amount:</span>
          <span className="summary-value">${completeBooking.amount?.toFixed(2) || "0.00"}</span>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ marginTop: "15px", marginBottom: "15px" }}>
          {error}
        </div>
      )}

      <p style={{ marginTop: "20px", marginBottom: "20px" }}>
        Please click the button below to pay securely via Stripe.
      </p>

      <div className="payment-buttons">
        <button
          onClick={handlePay}
          disabled={isProcessing}
          className="primary-btn payment-btn"
        >
          {isProcessing ? "Processing..." : "Pay with Stripe"}
        </button>
      </div>
    </div>
  );
};

export default PaymentPage;
