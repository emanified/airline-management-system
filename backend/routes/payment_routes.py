# routes/payment_routes.py

import datetime
import os
import re
from flask import Blueprint, request, jsonify
from connection import get_connection
import stripe

payment_bp = Blueprint("payment_bp", __name__, url_prefix="/api/payment")

# -----------------------------------
# STRIPE INITIALIZATION
# -----------------------------------
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")  # use a Stripe TEST key (sk_test_...)
# Frontend URLs - Update these if your frontend runs on a different port
# Vite typically runs on port 5173, Create React App on 3000
FRONTEND_SUCCESS_URL = "http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}"
FRONTEND_CANCEL_URL = "http://localhost:5173/payment-failed"


# ======================================================
# TEST ROUTE (for debugging)
# ======================================================
@payment_bp.route("/test", methods=["GET"])
def test_payment_route():
    return jsonify({"message": "Payment routes are working", "blueprint": "payment_bp"}), 200


# ======================================================
# MOCK PAYMENT GATEWAY (Simple, Functional, Dynamic)
# ======================================================
@payment_bp.route("/process", methods=["POST", "OPTIONS"])
def process_mock_payment():
    """
    Mock Payment Gateway - Simulates payment processing
    Accepts: { user_id, booking_id, amount, payment_method }
    Returns: { success, payment_id, transaction_id, message }
    """
    # Handle OPTIONS preflight request
    if request.method == "OPTIONS":
        return "", 200
    
    data = request.get_json() or {}
    print(f"Received payment request data: {data}")
    
    user_id = data.get("user_id")
    booking_id = data.get("booking_id")
    amount = data.get("amount")
    payment_method = data.get("payment_method", "card")  # card, wallet, bank_transfer
    
    print(f"Extracted values: user_id={user_id}, booking_id={booking_id}, amount={amount}, method={payment_method}")
    
    # Validate required fields
    if not all([user_id, booking_id, amount]):
        missing = [field for field, value in [("user_id", user_id), ("booking_id", booking_id), ("amount", amount)] if not value]
        error_msg = f"Missing required fields: {', '.join(missing)}"
        print(f"Validation failed: {error_msg}")
        return jsonify({
            "success": False,
            "error": error_msg
        }), 400
    
    try:
        amount = float(amount)
        user_id = int(user_id)
        
        if amount <= 0:
            return jsonify({
                "success": False,
                "error": "Amount must be greater than 0"
            }), 400
        
        # Simulate payment processing (add small delay for realism)
        import time
        time.sleep(0.5)  # Simulate network delay
        
        # Mock payment validation - ALL PAYMENTS APPROVED
        # (No random failures - all payments succeed for testing)
        print(f"Processing payment: user_id={user_id}, booking_id={booking_id}, amount={amount}, method={payment_method}")
        
        # Generate transaction ID
        import random
        timestamp = int(datetime.datetime.utcnow().timestamp())
        transaction_id = f"TXN{timestamp}{user_id}{random.randint(1000, 9999)}"
        
        # Get database connection
        conn = get_connection()
        cur = conn.cursor()
        
        # Check if booking exists (booking_id might be temporary)
        # If it's a temporary ID (starts with TEMP-), we'll create the booking later
        is_temp_booking = str(booking_id).startswith("TEMP-")
        
        if not is_temp_booking:
            cur.execute("SELECT booking_id, total_price FROM bookings WHERE booking_id = %s", (booking_id,))
            booking = cur.fetchone()
            
            if booking:
                # Verify amount matches booking
                booking_amount = float(booking[1]) if booking[1] else 0
                if abs(amount - booking_amount) > 0.01:  # Allow small floating point differences
                    cur.close()
                    conn.close()
                    return jsonify({
                        "success": False,
                        "error": f"Amount mismatch. Expected ${booking_amount:.2f}, got ${amount:.2f}"
                    }), 400
            # If booking doesn't exist and it's not temp, that's okay - we'll create it later
        
        # Create payment record
        created_at = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        status = "approved"
        card_type = payment_method.capitalize()
        last4 = "****"  # Mock payment doesn't need real card details
        
        # Check if payments table exists, create if not
        try:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS payments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    booking_id VARCHAR(255),
                    amount DECIMAL(10,2) NOT NULL,
                    card_type VARCHAR(50),
                    card_last4 VARCHAR(4),
                    status VARCHAR(50) NOT NULL,
                    transaction_id VARCHAR(255) UNIQUE,
                    created_at DATETIME,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                )
            """)
            
            # Always check and ensure booking_id column is VARCHAR (not INT) to support large/string booking IDs
            try:
                cur.execute("""
                    SELECT DATA_TYPE 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'payments' 
                    AND COLUMN_NAME = 'booking_id'
                """)
                result = cur.fetchone()
                if result and result[0] in ('int', 'bigint', 'mediumint', 'smallint', 'tinyint'):
                    # Alter the column to VARCHAR to support string booking IDs and large numbers
                    cur.execute("ALTER TABLE payments MODIFY COLUMN booking_id VARCHAR(255)")
                    conn.commit()  # Commit the ALTER TABLE immediately
                    print(f"Altered payments.booking_id from {result[0]} to VARCHAR")
            except Exception as alter_error:
                print(f"Could not check/alter booking_id column: {alter_error}")
                # Try to alter anyway - might work even if check failed
                try:
                    cur.execute("ALTER TABLE payments MODIFY COLUMN booking_id VARCHAR(255)")
                    conn.commit()
                    print("Altered payments.booking_id to VARCHAR (fallback)")
                except:
                    pass  # If alter fails, we'll handle it in the insert error handler
        except Exception as create_error:
            print(f"Error creating payments table: {create_error}")
            pass  # Table might already exist
        
        # Insert payment
        # Handle booking_id - it might be a string like "BK-123456" or an integer
        booking_id_str = str(booking_id)
        
        try:
            cur.execute("""
                INSERT INTO payments (user_id, booking_id, amount, card_type, card_last4, status, transaction_id, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (user_id, booking_id_str, amount, card_type, last4, status, transaction_id, created_at))
            payment_id = cur.lastrowid
        except Exception as insert_error:
            error_msg = str(insert_error)
            error_code = str(insert_error).split('(')[1].split(')')[0] if '(' in str(insert_error) else ""
            
            # Handle integer type errors: 1366 (incorrect value), 1264 (out of range), or type mismatch
            if ("1366" in error_msg or "1264" in error_msg or 
                "Incorrect integer value" in error_msg or 
                "Out of range value" in error_msg or
                error_code in ["1366", "1264"]):
                # Try to alter the column type to VARCHAR first
                try:
                    cur.execute("ALTER TABLE payments MODIFY COLUMN booking_id VARCHAR(255)")
                    conn.commit()
                    print("Altered payments.booking_id to VARCHAR due to type/range error")
                    # Retry the insert with string booking_id
                    cur.execute("""
                        INSERT INTO payments (user_id, booking_id, amount, card_type, card_last4, status, transaction_id, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (user_id, booking_id_str, amount, card_type, last4, status, transaction_id, created_at))
                    payment_id = cur.lastrowid
                    print(f"Successfully inserted payment with booking_id: {booking_id_str}")
                except Exception as retry_error:
                    print(f"Retry after ALTER failed: {retry_error}")
                    # If alter still fails, the table might have constraints - just store as string anyway
                    # This shouldn't happen if ALTER succeeded, but handle it gracefully
                    raise insert_error
            else:
                # For other errors, re-raise
                print(f"Payment insert error (not type-related): {insert_error}")
                raise insert_error
        
        # Update booking status to confirmed (only if booking exists and not temp)
        if not is_temp_booking:
            try:
                cur.execute("UPDATE bookings SET status=%s WHERE booking_id=%s", ("confirmed", booking_id))
            except:
                # If status column doesn't exist, that's okay
                pass
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            "success": True,
            "payment_id": payment_id,
            "transaction_id": transaction_id,
            "message": "Payment processed successfully",
            "amount": amount,
            "status": status
        }), 200
        
    except ValueError as e:
        return jsonify({
            "success": False,
            "error": f"Invalid input: {str(e)}"
        }), 400
    except Exception as e:
        import traceback
        print("Mock Payment Error:", e)
        print("Traceback:", traceback.format_exc())
        return jsonify({
            "success": False,
            "error": f"Payment processing error: {str(e)}"
        }), 500

# ======================================================
# STRIPE CHECKOUT SESSION
# ======================================================
@payment_bp.route("/create-checkout-session", methods=["POST", "OPTIONS"])
def create_checkout_session():
    """
    Create Stripe session for a booking
    Expected JSON:
    { user_id, booking_id, flight, amount }
    """
    # Handle OPTIONS preflight request
    if request.method == "OPTIONS":
        return "", 200
    
    print(f"Received payment request: {request.method} to {request.path}")
    print(f"Request data: {request.get_json()}")
    
    data = request.get_json() or {}
    amount = data.get("amount")
    user_id = data.get("user_id")
    booking_id = data.get("booking_id")
    flight = data.get("flight", "Flight Ticket")

    if not all([amount, user_id, booking_id]):
        return jsonify({"error": "user_id, booking_id and amount are required"}), 400

    try:
        # Debug: Print first few characters of key (for debugging, don't log full key)
        print(f"Stripe API key check: starts with '{stripe.api_key[:7] if stripe.api_key and len(stripe.api_key) > 7 else 'N/A'}...'")
        
        # Validate Stripe API key format
        # Stripe keys typically start with sk_test_, sk_live_, or sometimes mk_ for merchant keys
        if (stripe.api_key == "changeme" or 
            stripe.api_key == "sk_changeme" or
            stripe.api_key == "sk_test_your_actual_secret_key_here" or
            not stripe.api_key or 
            len(stripe.api_key) < 20):
            return jsonify({
                "error": "Stripe API key not configured. Please set a valid Stripe secret key in backend/routes/payment_routes.py (line 14)",
                "details": "The current key appears to be a placeholder. Get your real keys from https://dashboard.stripe.com/apikeys"
            }), 500
        
        # Check if key format is correct for checkout sessions
        # Note: mk_ keys are merchant/connect keys and won't work for checkout sessions
        # Only sk_test_ or sk_live_ secret keys work for creating checkout sessions
        if stripe.api_key.startswith("mk_"):
            return jsonify({
                "error": "Invalid Stripe API key type for checkout sessions",
                "details": "Merchant keys (mk_) cannot be used for checkout sessions. You need a SECRET key starting with 'sk_test_' (for test mode) or 'sk_live_' (for live mode). Get your secret key from https://dashboard.stripe.com/apikeys - look for 'Secret key' not 'Publishable key'"
            }), 500
        
        if not stripe.api_key.startswith("sk_"):
            return jsonify({
                "error": "Invalid Stripe API key format",
                "details": f"Stripe secret keys for checkout sessions must start with 'sk_test_' (test mode) or 'sk_live_' (live mode). Current key starts with '{stripe.api_key[:7] if stripe.api_key and len(stripe.api_key) > 7 else 'N/A'}...'. Get your keys from https://dashboard.stripe.com/apikeys"
            }), 500
        
        amount_cents = int(float(amount) * 100)
        
        if amount_cents <= 0:
            return jsonify({"error": "Invalid amount. Amount must be greater than 0"}), 400
        
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": flight},
                    "unit_amount": amount_cents,
                },
                "quantity": 1,
            }],
            success_url=FRONTEND_SUCCESS_URL,
            cancel_url=FRONTEND_CANCEL_URL,
            metadata={
                "user_id": str(user_id),
                "booking_id": str(booking_id),
                "amount": str(amount),
                "flight": flight
            }
        )
        
        # Log session details for debugging
        print(f"Stripe session created successfully:")
        print(f"  - Session ID: {session.id}")
        print(f"  - Session URL: {getattr(session, 'url', 'N/A')}")
        print(f"  - Session status: {getattr(session, 'status', 'N/A')}")
        print(f"  - Payment status: {getattr(session, 'payment_status', 'N/A')}")
        
        # Return both id and url for compatibility with new Stripe.js
        # Checkout Sessions should always have a 'url' property
        if not hasattr(session, 'url') or not session.url:
            print("ERROR: Session URL not found in Stripe response!")
            return jsonify({
                "error": "Failed to create checkout session URL",
                "details": "Stripe session was created but URL is missing. Please check your Stripe API key and configuration."
            }), 500
        
        return jsonify({
            "id": session.id,
            "url": session.url  # This should always be present for Checkout Sessions
        })
    except ValueError as e:
        print("Value Error:", e)
        return jsonify({"error": f"Invalid input: {str(e)}"}), 400
    except Exception as e:
        # Check if it's a Stripe error
        error_type = type(e).__name__
        error_msg = str(e)
        
        import traceback
        print("Payment Error:", e)
        print("Error type:", error_type)
        print("Traceback:", traceback.format_exc())
        
        # Provide user-friendly error messages
        if "Invalid API Key" in error_msg or "api_key" in error_msg.lower() or "changeme" in str(stripe.api_key):
            key_type = "merchant key (mk_)" if stripe.api_key.startswith("mk_") else "invalid format"
            return jsonify({
                "error": "Stripe API key is invalid. Please configure a valid Stripe secret key in backend/routes/payment_routes.py (line 14)",
                "details": f"Current key is a {key_type}. For checkout sessions, you need a SECRET key starting with 'sk_test_' (test mode) or 'sk_live_' (live mode). Get your keys from https://dashboard.stripe.com/apikeys"
            }), 500
        elif "No such" in error_msg or "does not exist" in error_msg:
            return jsonify({
                "error": "Stripe configuration error",
                "details": error_msg
            }), 500
        else:
            return jsonify({
                "error": f"Payment processing error: {error_msg}",
                "type": error_type
            }), 500


# ======================================================
# STORE PAYMENT AFTER STRIPE SUCCESS
# ======================================================
@payment_bp.route("/store", methods=["POST"])
def store_payment_after_stripe():
    """
    Called after Stripe success:
    { session_id }
    """
    data = request.get_json() or {}
    session_id = data.get("session_id")

    if not session_id:
        return jsonify({"success": False, "message": "session_id required"}), 400

    conn = None
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        user_id = int(session.metadata.get("user_id"))
        booking_id = session.metadata.get("booking_id")
        amount = float(session.metadata.get("amount"))
        flight = session.metadata.get("flight")
        transaction_id = session.payment_intent
        status = "approved"
        last4 = "****"

        conn = get_connection()
        cur = conn.cursor()

        # Convert booking_id to string to ensure compatibility
        booking_id_str = str(booking_id)
        
        # Ensure booking_id column is VARCHAR to support string booking IDs
        # Do this BEFORE any insert attempts - be aggressive about it
        print(f"Ensuring booking_id column is VARCHAR for booking_id: {booking_id_str}")
        try:
            # Always try to drop foreign key constraints first (if any exist)
            try:
                cur.execute("""
                    SELECT CONSTRAINT_NAME 
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'payments' 
                    AND COLUMN_NAME = 'booking_id'
                    AND REFERENCED_TABLE_NAME IS NOT NULL
                """)
                fk_results = cur.fetchall()
                for fk_row in fk_results:
                    fk_name = fk_row[0]
                    print(f"Dropping foreign key constraint: {fk_name}")
                    try:
                        cur.execute(f"ALTER TABLE payments DROP FOREIGN KEY {fk_name}")
                        conn.commit()
                    except Exception as drop_error:
                        print(f"Could not drop FK {fk_name}: {drop_error}")
            except Exception as fk_error:
                print(f"Error checking for foreign keys: {fk_error}")
            
            # Always try to alter the column type to VARCHAR
            # This is safe even if it's already VARCHAR
            print("Attempting to alter booking_id column to VARCHAR(255)...")
            cur.execute("ALTER TABLE payments MODIFY COLUMN booking_id VARCHAR(255)")
            conn.commit()
            print("✓ Successfully ensured payments.booking_id is VARCHAR(255)")
        except Exception as alter_error:
            error_msg = str(alter_error)
            # Some errors are okay (e.g., column already VARCHAR, table doesn't exist yet)
            if "Duplicate column name" not in error_msg and "doesn't exist" not in error_msg:
                print(f"⚠ ALTER TABLE warning: {alter_error}")
            # Continue anyway - we'll handle it in the insert error handler

        created_at = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        # Insert payment
        try:
            cur.execute("""
                INSERT INTO payments (user_id, booking_id, amount, card_type, card_last4, status, transaction_id, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (user_id, booking_id_str, amount, "Stripe", last4, status, transaction_id, created_at))
        except Exception as insert_error:
            error_msg = str(insert_error)
            print(f"Insert error: {error_msg}")
            # If we still get a type error, try one more time with explicit alter
            if "1292" in error_msg or "Truncated incorrect DOUBLE" in error_msg or "Incorrect integer value" in error_msg or "22007" in error_msg:
                try:
                    print("Retrying with explicit ALTER TABLE...")
                    # Drop FK again if needed
                    try:
                        cur.execute("""
                            SELECT CONSTRAINT_NAME 
                            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                            WHERE TABLE_SCHEMA = DATABASE() 
                            AND TABLE_NAME = 'payments' 
                            AND COLUMN_NAME = 'booking_id'
                            AND REFERENCED_TABLE_NAME IS NOT NULL
                        """)
                        fk_results = cur.fetchall()
                        for fk_row in fk_results:
                            cur.execute(f"ALTER TABLE payments DROP FOREIGN KEY {fk_row[0]}")
                    except:
                        pass
                    
                    cur.execute("ALTER TABLE payments MODIFY COLUMN booking_id VARCHAR(255)")
                    conn.commit()
                    
                    # Retry insert
                    cur.execute("""
                        INSERT INTO payments (user_id, booking_id, amount, card_type, card_last4, status, transaction_id, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (user_id, booking_id_str, amount, "Stripe", last4, status, transaction_id, created_at))
                    print("Retry insert succeeded!")
                except Exception as retry_error:
                    print(f"Retry insert failed: {retry_error}")
                    import traceback
                    print(f"Traceback: {traceback.format_exc()}")
                    raise insert_error
            else:
                raise insert_error
        payment_id = cur.lastrowid

        # Update booking status (only if booking_id is numeric, skip if it's a string like "BK-...")
        # String booking IDs are temporary and don't exist in bookings table yet
        try:
            # Try to convert to int - if it fails, it's a string booking_id (temporary)
            int(booking_id_str.replace("BK-", "").replace("TEMP-", ""))
            # If conversion succeeds, try to update
            cur.execute("UPDATE bookings SET status=%s WHERE booking_id=%s", ("confirmed", booking_id_str))
        except (ValueError, TypeError):
            # booking_id is a string (temporary), skip update
            print(f"Skipping booking status update - booking_id '{booking_id_str}' appears to be temporary")
        except Exception as update_error:
            # If status column doesn't exist, that's okay
            print(f"Could not update booking status: {update_error}")
            pass
        
        conn.commit()
        cur.close()

        return jsonify({
            "success": True, 
            "payment_id": payment_id, 
            "transaction_id": transaction_id,
            "booking_id": booking_id  # Return booking_id for frontend redirect
        })
    except Exception as e:
        print("Store Payment Error:", e)
        return jsonify({"success": False, "message": "Error storing payment"}), 500
    finally:
        if conn:
            conn.close()


# ======================================================
# MANUAL PAYMENT (fallback)
# ======================================================
@payment_bp.route("/charge", methods=["POST"])
def charge_payment():
    data = request.get_json() or {}
    required_fields = ["user_id", "booking_id", "amount", "card_type", "card_number", "expiry", "cvv"]
    for fld in required_fields:
        if not data.get(fld):
            return jsonify({"success": False, "field": fld, "message": f"{fld} is required"}), 400

    try:
        amount = float(data.get("amount"))
        user_id = data.get("user_id")
        booking_id = data.get("booking_id")
        card_number = re.sub(r"\D", "", str(data.get("card_number")))
        transaction_id = f"TXN{int(datetime.datetime.utcnow().timestamp())}{user_id}"
        last4 = card_number[-4:]
        status = "approved"
        created_at = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO payments (user_id, booking_id, amount, card_type, card_last4, status, transaction_id, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """, (user_id, booking_id, amount, data.get("card_type"), last4, status, transaction_id, created_at))

        # Update booking status
        cur.execute("UPDATE bookings SET status=%s WHERE booking_id=%s", ("confirmed", booking_id))
        conn.commit()
        cur.close()

        return jsonify({"success": True, "payment_id": cur.lastrowid, "transaction_id": transaction_id})
    except Exception as e:
        print("Manual Payment Error:", e)
        return jsonify({"success": False, "message": "Payment processing error"}), 500
    finally:
        if conn:
            conn.close()


# ======================================================
# VERIFY PAYMENT
# ======================================================
@payment_bp.route("/verify", methods=["POST"])
def verify_payment():
    data = request.get_json() or {}
    payment_id = data.get("payment_id")
    transaction_id = data.get("transaction_id")

    if not payment_id and not transaction_id:
        return jsonify({"success": False, "message": "payment_id or transaction_id required"}), 400

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        if payment_id:
            cur.execute("SELECT * FROM payments WHERE id=%s", (payment_id,))
        else:
            cur.execute("SELECT * FROM payments WHERE transaction_id=%s", (transaction_id,))
        record = cur.fetchone()
        cur.close()

        if not record:
            return jsonify({"success": False, "message": "Payment not found"}), 404
        return jsonify({"success": True, "payment": record})
    except Exception as e:
        print("Verify Payment Error:", e)
        return jsonify({"success": False, "message": "Error verifying payment"}), 500
    finally:
        if conn:
            conn.close()


# ======================================================
# PAYMENT HISTORY
# ======================================================
@payment_bp.route("/history/<int:user_id>", methods=["GET"])
def payment_history(user_id):
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT id AS payment_id, booking_id, amount, card_type, card_last4, status, transaction_id, created_at
            FROM payments
            WHERE user_id=%s
            ORDER BY created_at DESC
        """, (user_id,))
        rows = cur.fetchall()
        cur.close()
        return jsonify({"success": True, "payments": rows})
    except Exception as e:
        print("Payment History Error:", e)
        return jsonify({"success": False, "message": "Error fetching payment history"}), 500
    finally:
        if conn:
            conn.close()
