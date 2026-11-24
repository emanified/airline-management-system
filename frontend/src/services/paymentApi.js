// src/services/paymentApi.js
import { authFetch } from "./api";
import { loadStripe } from "@stripe/stripe-js";

let stripePromise = null;

export const getStripe = () => {
  if (!stripePromise) {
    // Use environment variable or default to test publishable key
    // In production, set REACT_APP_STRIPE_PUBLISHABLE_KEY in your .env file
    // Get your publishable key from: https://dashboard.stripe.com/test/apikeys
    let publishableKey;
    try {
      if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY) {
        publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
      }
    } catch (e) {
      // process.env not available, use fallback
    }
    
    // Fallback: set VITE_STRIPE_PUBLISHABLE_KEY in frontend/.env (Stripe TEST publishable key)
    // This should start with "pk_test_" for test mode
    publishableKey = publishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

// 1) Create Stripe checkout session → Redirect to Stripe
export const startStripePayment = async (payload) => {
  try {
    console.log("Creating Stripe session with payload:", payload);
    
    // Use the correct endpoint with /api/payment prefix
    const session = await authFetch("/api/payment/create-checkout-session", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    console.log("Stripe session response:", session);

    if (!session || (!session.id && !session.url)) {
      console.error("Invalid session response:", session);
      // Check if there's an error message in the response
      const errorMsg = session?.error || session?.message || session?.details || "Failed to create payment session";
      return { success: false, error: errorMsg };
    }

    // New Stripe.js approach: Use the checkout URL directly instead of redirectToCheckout
    // The backend should return a 'url' property in the session response
    if (session.url) {
      console.log("Redirecting to Stripe checkout URL:", session.url);
      // Redirect to the checkout URL directly
      window.location.href = session.url;
      return { success: true };
    }

    // Fallback: If URL is not provided, try to construct it
    console.warn("Session URL not found in response, attempting fallback redirect");
    if (session.id) {
      // For newer Stripe Checkout, the URL format might be different
      // Try the standard checkout URL format
      const checkoutUrl = `https://checkout.stripe.com/c/pay/${session.id}`;
      console.log("Using constructed checkout URL:", checkoutUrl);
      window.location.href = checkoutUrl;
      return { success: true };
    }

    return { success: false, error: "No checkout URL or session ID provided" };
  } catch (err) {
    console.error("Stripe Payment API error:", err);
    console.error("Error details:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
      status: err.status,
      details: err.details
    });
    
    // Provide more specific error messages
    let errorMessage = "An error occurred while processing payment";
    if (err.details) {
      // Use detailed error from backend if available
      errorMessage = err.details.error || err.details.message || err.details.details || err.message;
    } else if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      errorMessage = "Cannot connect to payment server. Please check your internet connection and ensure the backend is running.";
    } else if (err.message.includes("CORS")) {
      errorMessage = "CORS error. Please check server configuration.";
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    return { success: false, error: errorMessage };
  }
};

// 2) Store payment after success page (session_id)
export const storePayment = async (session_id) => {
  try {
    const data = await authFetch("/api/payment/store", {
      method: "POST",
      body: JSON.stringify({ session_id }),
    });

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// 3) Mock Payment Gateway - Simple, Functional, Dynamic
export const processMockPayment = async (payload) => {
  try {
    console.log("Processing mock payment with payload:", payload);
    
    const response = await authFetch("/api/payment/process", {
      method: "POST",
      body: JSON.stringify({
        user_id: payload.user_id,
        booking_id: payload.booking_id,
        amount: payload.amount,
        payment_method: payload.payment_method || "card"
      }),
    });

    console.log("Mock payment response:", response);

    if (!response || !response.success) {
      return { 
        success: false, 
        error: response?.error || response?.message || "Payment processing failed" 
      };
    }

    return {
      success: true,
      payment_id: response.payment_id,
      transaction_id: response.transaction_id,
      message: response.message || "Payment processed successfully"
    };
  } catch (err) {
    console.error("Mock Payment API error:", err);
    let errorMessage = "An error occurred while processing payment";
    
    if (err.details) {
      errorMessage = err.details.error || err.details.message || err.message;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    return { success: false, error: errorMessage };
  }
};
