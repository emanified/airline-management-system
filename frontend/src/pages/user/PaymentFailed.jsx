import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/common-theme.css";
import "./PaymentSuccess.css";

const PaymentFailed = () => {
  const navigate = useNavigate();

  return (
    <div className="payment-success-container">
      <div className="payment-status-card">
        <div className="error-icon">✗</div>
        <h2>Payment Cancelled</h2>
        <p>Your payment was cancelled. No charges were made.</p>
        <div className="payment-actions">
          <button 
            className="primary-btn" 
            onClick={() => navigate("/user/book-ticket")}
          >
            Try Again
          </button>
          <button 
            className="secondary-btn" 
            onClick={() => navigate("/user")}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;

