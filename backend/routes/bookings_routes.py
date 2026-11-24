# routes/bookings_routes.py
from flask import Blueprint, request, jsonify
from connection import get_connection
from routes.admin_routes import admin_required

bookings_bp = Blueprint("bookings", __name__, url_prefix="/api/bookings")


@bookings_bp.route("", methods=["POST"])
def create_booking():
    """
    Public endpoint to create a booking.
    Expects JSON body:
    {
      "user_id": int (optional, for logged-in users),
      "flight_id": int,
      "passenger": {
          "fullName": "...",
          "email": "...",
          "phone": "...",
          "passport": "..."
      },
      "class_type": "Economy",
      "seats_booked": int,
      "payment": {
          "card_type": "...",
          "card_last4": "...",
          "amount": float
      } (optional - for Stripe flow, payment is processed separately)
    }
    """
    data = request.get_json() or {}
    
    # Debug logging
    print(f"Received booking request data: {data}")
    print(f"Data keys: {list(data.keys())}")
    
    required_fields = ["flight_id", "passenger", "class_type", "seats_booked"]
    for field in required_fields:
        if field not in data:
            print(f"Missing required field: {field}")
            return jsonify({"success": False, "message": f"{field} is required"}), 400

    flight_id = int(data["flight_id"])
    seats_needed = int(data["seats_booked"])
    passenger = data["passenger"]
    class_type = data["class_type"]
    payment = data.get("payment")  # Optional for Stripe flow - NOT required
    user_id = data.get("user_id")  # Optional, for logged-in users
    
    print(f"Processing booking: flight_id={flight_id}, user_id={user_id}, class_type={class_type}, seats={seats_needed}, has_payment={payment is not None}")
    
    # Validate passenger object
    if not isinstance(passenger, dict):
        return jsonify({"success": False, "message": "passenger must be an object"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)
    try:
        # check flight exists and seats available
        cursor.execute("SELECT * FROM flights WHERE flight_id = %s", (flight_id,))
        flight = cursor.fetchone()
        if not flight:
            return jsonify({"success": False, "message": "Flight not found"}), 404
        if flight["seats_available"] < seats_needed:
            return jsonify({"success": False, "message": "Not enough seats available"}), 400

        total_price = float(flight["price"]) * seats_needed

        # Check which columns exist in bookings table
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'bookings'
        """)
        rows = cursor.fetchall()
        # Handle both dictionary and tuple/list results
        existing_columns = set()
        for row in rows:
            if isinstance(row, dict):
                existing_columns.add(row.get("COLUMN_NAME") or row.get("column_name", ""))
            else:
                # If it's a tuple/list, access by index
                existing_columns.add(row[0] if row else "")
        existing_columns = {col for col in existing_columns if col}  # Remove empty strings

        has_user_id = 'user_id' in existing_columns
        has_class_type = 'class_type' in existing_columns
        has_seat_number = 'seat_number' in existing_columns
        
        # Add seat_number column if it doesn't exist
        if not has_seat_number:
            try:
                cursor.execute("ALTER TABLE bookings ADD COLUMN seat_number VARCHAR(10)")
                conn.commit()
                has_seat_number = True
                print("Added seat_number column to bookings table")
            except Exception as alter_error:
                print(f"Could not add seat_number column: {alter_error}")
        
        print(f"Existing columns in bookings table: {existing_columns}")
        print(f"has_user_id: {has_user_id}, has_class_type: {has_class_type}, has_seat_number: {has_seat_number}")

        # Get seat number from request data
        seat_number = data.get("seat_number") or data.get("selectedSeat") or None

        # Build INSERT statement dynamically based on available columns
        if has_user_id and user_id:
            if has_class_type:
                if has_seat_number:
                    cursor.execute("""
                        INSERT INTO bookings 
                        (user_id, flight_id, passenger_name, cnic, email, phone, seats_booked, total_price, class_type, seat_number)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        user_id,
                        flight_id,
                        passenger.get("fullName"),
                        passenger.get("passport"),
                        passenger.get("email"),
                        passenger.get("phone"),
                        seats_needed,
                        total_price,
                        class_type,
                        seat_number
                    ))
                else:
                    cursor.execute("""
                        INSERT INTO bookings 
                        (user_id, flight_id, passenger_name, cnic, email, phone, seats_booked, total_price, class_type)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        user_id,
                        flight_id,
                        passenger.get("fullName"),
                        passenger.get("passport"),
                        passenger.get("email"),
                        passenger.get("phone"),
                        seats_needed,
                        total_price,
                        class_type
                    ))
            else:
                # No class_type column
                if has_seat_number:
                    cursor.execute("""
                        INSERT INTO bookings 
                        (user_id, flight_id, passenger_name, cnic, email, phone, seats_booked, total_price, seat_number)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        user_id,
                        flight_id,
                        passenger.get("fullName"),
                        passenger.get("passport"),
                        passenger.get("email"),
                        passenger.get("phone"),
                        seats_needed,
                        total_price,
                        seat_number
                    ))
                else:
                    cursor.execute("""
                        INSERT INTO bookings 
                        (user_id, flight_id, passenger_name, cnic, email, phone, seats_booked, total_price)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        user_id,
                        flight_id,
                        passenger.get("fullName"),
                        passenger.get("passport"),
                        passenger.get("email"),
                        passenger.get("phone"),
                        seats_needed,
                        total_price
                    ))
        else:
            # No user_id column or no user_id provided
            if has_class_type:
                if has_seat_number:
                    cursor.execute("""
                        INSERT INTO bookings 
                        (flight_id, passenger_name, cnic, email, phone, seats_booked, total_price, class_type, seat_number)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        flight_id,
                        passenger.get("fullName"),
                        passenger.get("passport"),
                        passenger.get("email"),
                        passenger.get("phone"),
                        seats_needed,
                        total_price,
                        class_type,
                        seat_number
                    ))
                else:
                    cursor.execute("""
                        INSERT INTO bookings 
                        (flight_id, passenger_name, cnic, email, phone, seats_booked, total_price, class_type)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        flight_id,
                        passenger.get("fullName"),
                        passenger.get("passport"),
                        passenger.get("email"),
                        passenger.get("phone"),
                        seats_needed,
                        total_price,
                        class_type
                    ))
            else:
                # No class_type column
                if has_seat_number:
                    cursor.execute("""
                        INSERT INTO bookings 
                        (flight_id, passenger_name, cnic, email, phone, seats_booked, total_price, seat_number)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        flight_id,
                        passenger.get("fullName"),
                        passenger.get("passport"),
                        passenger.get("email"),
                        passenger.get("phone"),
                        seats_needed,
                        total_price,
                        seat_number
                    ))
                else:
                    cursor.execute("""
                        INSERT INTO bookings 
                        (flight_id, passenger_name, cnic, email, phone, seats_booked, total_price)
                        VALUES (%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        flight_id,
                        passenger.get("fullName"),
                        passenger.get("passport"),
                        passenger.get("email"),
                        passenger.get("phone"),
                        seats_needed,
                        total_price
                    ))
        # Check if INSERT was successful
        if cursor.rowcount == 0:
            raise Exception("Failed to insert booking - no rows affected")
        
        booking_id = cursor.lastrowid
        if booking_id == 0:
            # Try to get the booking_id another way if lastrowid is 0
            # This can happen with some MySQL configurations
            cursor.execute("SELECT LAST_INSERT_ID() as id")
            last_insert = cursor.fetchone()
            if last_insert and last_insert.get('id'):
                booking_id = last_insert['id']
            else:
                raise Exception("Failed to get booking ID after insert")
        
        print(f"Booking created successfully with ID: {booking_id}")

        # decrement seats
        cursor.execute(
            "UPDATE flights SET seats_available = seats_available - %s WHERE flight_id = %s",
            (seats_needed, flight_id)
        )
        
        if cursor.rowcount == 0:
            print(f"Warning: Flight {flight_id} not found or seats not updated")

        # save payment info only if provided (for non-Stripe flows)
        if payment:
            try:
                cursor.execute("""
                    INSERT INTO payments (booking_id, amount, card_type, card_last4)
                    VALUES (%s, %s, %s, %s)
                """, (
                    booking_id,
                    payment.get("amount", total_price),
                    payment.get("card_type"),
                    payment.get("card_last4")
                ))
            except Exception as payment_error:
                # Payment table might not exist or have different structure
                print(f"Could not insert payment: {payment_error}")

        conn.commit()
        return jsonify({"success": True, "message": "Booking created", "booking_id": booking_id}), 201

    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print("=" * 50)
        print("ERROR creating booking:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print("Full traceback:")
        print(error_trace)
        print("=" * 50)
        return jsonify({
            "success": False, 
            "message": f"Error creating booking: {str(e)}",
            "error_type": type(e).__name__
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@bookings_bp.route("", methods=["GET"])
@admin_required
def list_bookings():
    """
    Admin-only: list all bookings with flight and payment info
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)
    try:
        cursor.execute("""
            SELECT b.*, f.airline_name, f.flight_no, f.source, f.destination, f.departure_time, p.amount, p.card_type, p.card_last4
            FROM bookings b
            JOIN flights f ON b.flight_id = f.flight_id
            LEFT JOIN payments p ON b.booking_id = p.booking_id
            ORDER BY b.booking_time DESC
        """)
        rows = cursor.fetchall()
        for r in rows:
            r["departure_time"] = r["departure_time"].strftime("%Y-%m-%d %H:%M:%S")
        return jsonify({"success": True, "bookings": rows}), 200
    finally:
        cursor.close()
        conn.close()
#for user
@bookings_bp.route("/user/<int:user_id>", methods=["GET"])
def get_user_bookings(user_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)
    try:
        cursor.execute("""
            SELECT b.booking_id, b.flight_id, b.seats_booked, b.total_price, b.class_type,
                   f.flight_no, f.airline, f.source, f.destination, f.departure_time, f.arrival_time
            FROM bookings b
            JOIN flights f ON b.flight_id = f.flight_id
            WHERE b.user_id = %s
            ORDER BY b.booking_time DESC
        """, (user_id,))
        bookings = cursor.fetchall()

        for b in bookings:
            b["departure_time"] = b["departure_time"].strftime("%Y-%m-%d %H:%M:%S") if b["departure_time"] else None
            b["arrival_time"] = b["arrival_time"].strftime("%Y-%m-%d %H:%M:%S") if b["arrival_time"] else None

        return jsonify({"success": True, "bookings": bookings})
    finally:
        cursor.close()
        conn.close()

@bookings_bp.route("/<int:booking_id>", methods=["GET"])
def get_booking(booking_id):
    """
    Public: get booking by id (ticket view)
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)
    try:
        cursor.execute("""
            SELECT b.*, f.airline_name, f.flight_no, f.source, f.destination, 
                   f.departure_time, f.arrival_time, f.price, p.amount, p.card_type, p.card_last4
            FROM bookings b
            JOIN flights f ON b.flight_id = f.flight_id
            LEFT JOIN payments p ON b.booking_id = p.booking_id
            WHERE b.booking_id = %s
        """, (booking_id,))
        booking = cursor.fetchone()
        if not booking:
            return jsonify({"success": False, "message": "Booking not found"}), 404

        booking["departure_time"] = booking["departure_time"].strftime("%Y-%m-%d %H:%M:%S")
        booking["arrival_time"] = booking["arrival_time"].strftime("%Y-%m-%d %H:%M:%S")

        return jsonify({"success": True, "booking": booking}), 200
    finally:
        cursor.close()
        conn.close()
