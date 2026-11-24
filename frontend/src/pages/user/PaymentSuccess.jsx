import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { storePayment } from "../../services/paymentApi";
import { bookFlight } from "../../services/user";
import "../../styles/common-theme.css";
import "./PaymentSuccess.css";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState("processing"); // processing, success, error
  const [message, setMessage] = useState("Processing your payment...");
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setMessage("No session ID found. Please contact support if payment was processed.");
      return;
    }

    const processPayment = async () => {
      try {
        // Store payment in database
        const paymentResult = await storePayment(sessionId);
        
        if (!paymentResult.success) {
          setStatus("error");
          setMessage(paymentResult.error || "Failed to process payment. Please contact support.");
          return;
        }

        // Payment stored successfully
        setStatus("success");
        setMessage("Payment successful! Your booking is being confirmed...");
        
        // Get booking details from payment result if available
        // The backend returns: { success: True, payment_id, transaction_id, booking_id }
        const bookingId = paymentResult.data?.booking_id || paymentResult.booking_id;
        if (bookingId) {
          setBookingId(bookingId);
          // Redirect to ticket confirmation after a short delay
          // Pass a flag to refresh dashboard data
          setTimeout(() => {
            navigate(`/user/ticket-confirmation?bookingId=${bookingId}`, { state: { refreshDashboard: true } });
          }, 2000);
        } else {
          // If booking_id not in payment, redirect to dashboard with refresh flag
          setTimeout(() => {
            navigate("/user", { state: { refreshDashboard: true } });
          }, 2000);
        }
      } catch (error) {
        console.error("Payment processing error:", error);
        setStatus("error");
        setMessage("An error occurred while processing your payment. Please contact support.");
      }
    };

    processPayment();
  }, [sessionId, navigate]);

  return (
    <div className="payment-success-container">
      <div className="payment-status-card">
        {status === "processing" && (
          <>
            <div className="spinner"></div>
            <h2>Processing Payment...</h2>
            <p>{message}</p>
          </>
        )}
        
        {status === "success" && (
          <>
            <div className="success-icon">✓</div>
            <h2>Payment Successful!</h2>
            <p>{message}</p>
            {bookingId && (
              <p className="booking-id">Booking ID: {bookingId}</p>
            )}
            <p className="redirect-message">Redirecting to your ticket...</p>
          </>
        )}
        
        {status === "error" && (
          <>
            <div className="error-icon">✗</div>
            <h2>Payment Processing Error</h2>
            <p>{message}</p>
            <div className="payment-actions">
              <button 
                className="primary-btn" 
                onClick={() => navigate("/user")}
              >
                Go to Dashboard
              </button>
              <button 
                className="secondary-btn" 
                onClick={() => navigate("/user/book-ticket")}
              >
                Try Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;

