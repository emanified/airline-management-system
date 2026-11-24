from flask import Blueprint, request, jsonify
from connection import get_connection
import mysql.connector

user_bp = Blueprint("user_bp", __name__, url_prefix="/api/user")

# -----------------------------
# 1️⃣ User Dashboard Summary
# -----------------------------
@user_bp.route("/dashboard/<int:user_id>", methods=["GET"])
def user_dashboard(user_id):
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("SELECT COUNT(*) AS total_bookings FROM bookings WHERE user_id = %s", (user_id,))
        total_bookings = cur.fetchone()["total_bookings"]

        cur.execute("SELECT COUNT(*) AS upcoming FROM bookings WHERE user_id = %s AND status = 'confirmed'", (user_id,))
        upcoming = cur.fetchone()["upcoming"]

        return jsonify({"success": True, "totalBookings": total_bookings, "upcomingFlights": upcoming}), 200
    except Exception as e:
        print("Dashboard Error:", e)
        return jsonify({"success": False, "message": "Error loading dashboard"}), 500
    finally:
        if conn:
            conn.close()

# -----------------------------
# 2️⃣ View My Bookings
# -----------------------------
@user_bp.route("/bookings/<int:user_id>", methods=["GET"])
def get_user_bookings(user_id):
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)

        # Query with correct column names matching the database schema
        # Note: class_type may not exist in all database versions
        cur.execute("""
            SELECT b.booking_id, 
                   b.seats_booked,
                   b.total_price,
                   f.flight_no as flight_number,
                   f.source as departure,
                   f.destination as arrival,
                   DATE(f.departure_time) as date,
                   TIME(f.departure_time) as time,
                   f.airline,
                   f.departure_time,
                   f.arrival_time
            FROM bookings b
            JOIN flights f ON b.flight_id = f.flight_id
            WHERE b.user_id = %s
            ORDER BY f.departure_time DESC
        """, (user_id,))

        bookings = cur.fetchall()
        
        # Format the bookings to match frontend expectations
        formatted_bookings = []
        for booking in bookings:
            try:
                # Format departure_time for frontend
                dep_time = booking.get("departure_time")
                if dep_time and hasattr(dep_time, "strftime"):
                    dep_time_str = dep_time.strftime("%Y-%m-%d %H:%M:%S")
                elif dep_time:
                    dep_time_str = str(dep_time)
                else:
                    dep_time_str = None
                
                # Format arrival_time
                arr_time = booking.get("arrival_time")
                if arr_time and hasattr(arr_time, "strftime"):
                    arr_time_str = arr_time.strftime("%Y-%m-%d %H:%M:%S")
                elif arr_time:
                    arr_time_str = str(arr_time)
                else:
                    arr_time_str = None
                
                formatted_booking = {
                    "booking_id": booking.get("booking_id"),
                    "status": "confirmed",  # Default status since it doesn't exist in DB
                    "seat_number": str(booking.get("seats_booked")) if booking.get("seats_booked") else "N/A",
                    "flight_number": booking.get("flight_number"),
                    "source": booking.get("departure") or booking.get("source") or "N/A",
                    "destination": booking.get("arrival") or booking.get("destination") or "N/A",
                    "departure": booking.get("departure") or booking.get("source") or "N/A",
                    "arrival": booking.get("arrival") or booking.get("destination") or "N/A",
                    "date": str(booking.get("date")) if booking.get("date") else None,
                    "time": str(booking.get("time")) if booking.get("time") else None,
                    "departure_time": dep_time_str,
                    "arrival_time": arr_time_str,
                    "airline": booking.get("airline") or "N/A",
                    "total_price": float(booking.get("total_price", 0)) if booking.get("total_price") else 0,
                    "class_type": "Economy",  # Default since class_type column may not exist
                    "booking_ref": f"BK-{booking.get('booking_id')}"  # Add booking reference
                }
                formatted_bookings.append(formatted_booking)
            except Exception as e:
                print(f"Error formatting booking {booking.get('booking_id')}: {e}")
                import traceback
                print(traceback.format_exc())
                continue  # Skip this booking and continue with others
        
        return jsonify({"success": True, "bookings": formatted_bookings}), 200
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Bookings Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"success": False, "message": f"Error fetching bookings: {str(e)}"}), 500
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

# -----------------------------
# 3️⃣ Booking Status
# -----------------------------
@user_bp.route("/booking-status/<int:booking_id>", methods=["GET"])
def booking_status(booking_id):
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT b.booking_id, b.status, b.seat_number,
                   f.flight_number, f.departure, f.arrival, f.date, f.time
            FROM bookings b
            JOIN flights f ON b.flight_id = f.flight_id
            WHERE b.booking_id = %s
        """, (booking_id,))

        booking = cur.fetchone()
        if not booking:
            return jsonify({"success": False, "message": "Booking not found"}), 404

        return jsonify({"success": True, "booking": booking}), 200
    except Exception as e:
        print("Booking Status Error:", e)
        return jsonify({"success": False, "message": "Error retrieving booking"}), 500
    finally:
        if conn:
            conn.close()

# -----------------------------
# 4️⃣ User Profile Details
# -----------------------------
@user_bp.route("/profile/<int:user_id>", methods=["GET"])
def user_profile(user_id):
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True, buffered=True)
        
        # Query from users table only
        cur.execute("SELECT user_id, username, email, phone FROM users WHERE user_id = %s", (user_id,))
        user_data = cur.fetchone()
        
        if not user_data:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        profile = {
            "id": user_data["user_id"],
            "name": user_data["username"],
            "email": user_data["email"],
            "phone": user_data.get("phone") or "",
            "avatar": None,
            "membership": "Member"
        }

        return jsonify({"success": True, "profile": profile}), 200
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Profile Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"success": False, "message": f"Error loading profile: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()

# -----------------------------
# 5️⃣ Update User Profile
# -----------------------------
@user_bp.route("/profile/update/<int:user_id>", methods=["PUT"])
def update_profile(user_id):
    try:
        data = request.json
        name = data.get("name")
        phone = data.get("phone")
        if not name or not phone:
            return jsonify({"success": False, "message": "Name and phone are required"}), 400

        conn = get_connection()
        cur = conn.cursor(buffered=True)
        
        # Update users table only
        cur.execute("UPDATE users SET username=%s, phone=%s WHERE user_id=%s", (name, phone, user_id))
        
        if cur.rowcount == 0:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        conn.commit()
        return jsonify({"success": True, "message": "Profile updated"}), 200
    except Exception as e:
        print("Profile Update Error:", e)
        return jsonify({"success": False, "message": f"Failed to update profile: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()

# -----------------------------
# 6️⃣ Add Passenger Details
# -----------------------------
@user_bp.route("/passenger/add", methods=["POST"])
def add_passenger():
    conn = None
    cursor = None
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "Request body is required"}), 400
        
        conn = get_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        # Check if table exists, if not create it
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'passengers'
        """)
        table_exists = cursor.fetchone()
        if not table_exists or table_exists.get('count', 0) == 0:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS passengers (
                    passenger_id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    age INT,
                    gender VARCHAR(20),
                    passport VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                )
            """)
            conn.commit()
        
        # Check which columns exist in passengers table and their properties
        cursor.execute("""
            SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'passengers'
            AND COLUMN_NAME != 'passenger_id'
        """)
        rows = cursor.fetchall()
        
        # Build a dictionary of column metadata
        column_metadata = {}
        for row in rows:
            if isinstance(row, dict):
                col_name = row.get("COLUMN_NAME") or row.get("column_name", "")
                is_nullable = (row.get("IS_NULLABLE") or row.get("is_nullable", "NO")).upper() == "YES"
                has_default = row.get("COLUMN_DEFAULT") is not None or row.get("COLUMN_DEFAULT", "") != ""
            else:
                col_name = row[0] if len(row) > 0 else ""
                is_nullable = (row[1] if len(row) > 1 else "NO").upper() == "YES"
                has_default = (row[2] if len(row) > 2 else None) is not None
            
            if col_name:
                column_metadata[col_name] = {
                    'nullable': is_nullable,
                    'has_default': has_default
                }
        
        print(f"Column metadata in passengers table: {column_metadata}")
        
        # Build INSERT statement dynamically
        columns_to_insert = []
        values_to_insert = []
        placeholders = []
        
        # Check required columns
        required_columns = []
        for col_name, metadata in column_metadata.items():
            if not metadata['nullable'] and not metadata['has_default']:
                required_columns.append(col_name)
        
        # Map field names to possible column names
        field_mappings = {
            'user_id': ['user_id'],
            'name': ['name', 'passenger_name', 'full_name'],
            'age': ['age'],
            'gender': ['gender', 'sex'],
            'passport': ['passport', 'passport_number', 'passport_no', 'cnic']
        }
        
        for field_name, possible_columns in field_mappings.items():
            col_name = None
            for possible_col in possible_columns:
                if possible_col in column_metadata:
                    col_name = possible_col
                    break
            
            if col_name:
                if field_name in data and data[field_name] is not None:
                    columns_to_insert.append(col_name)
                    # Type conversion for age
                    value = data[field_name]
                    if col_name == 'age' and isinstance(value, (str, float)):
                        try:
                            value = int(float(value))
                        except (ValueError, TypeError):
                            return jsonify({"success": False, "message": f"Invalid age value: {value}"}), 400
                    values_to_insert.append(value)
                    placeholders.append('%s')
                elif col_name in required_columns:
                    return jsonify({"success": False, "field": field_name, "message": f"{field_name} is required"}), 400
        
        # Handle any other required columns
        for col_name in required_columns:
            if col_name not in columns_to_insert:
                if col_name in data:
                    columns_to_insert.append(col_name)
                    values_to_insert.append(data[col_name])
                    placeholders.append('%s')
                else:
                    return jsonify({"success": False, "field": col_name, "message": f"{col_name} is required"}), 400
        
        if not columns_to_insert:
            return jsonify({"success": False, "message": "No valid columns found to insert. Please check the table structure."}), 500
        
        # Build and execute the INSERT query
        columns_str = ', '.join(columns_to_insert)
        placeholders_str = ', '.join(placeholders)
        insert_query = f"INSERT INTO passengers ({columns_str}) VALUES ({placeholders_str})"
        
        print(f"Executing INSERT query: {insert_query}")
        print(f"With values: {values_to_insert}")
        
        cursor.execute(insert_query, tuple(values_to_insert))
        conn.commit()
        
        if cursor.rowcount == 0:
            raise Exception("Failed to insert passenger - no rows affected")
        
        passenger_id = cursor.lastrowid
        if passenger_id == 0:
            cursor.execute("SELECT LAST_INSERT_ID() as id")
            last_insert = cursor.fetchone()
            if last_insert and last_insert.get('id'):
                passenger_id = last_insert['id']
        
        return jsonify({"success": True, "message": "Passenger details saved", "passenger_id": passenger_id}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Add Passenger Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"success": False, "message": f"Failed to save passenger: {str(e)}", "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# -----------------------------
# 7️⃣ Get Passenger Details
# -----------------------------
@user_bp.route("/passenger/<int:user_id>", methods=["GET"])
def get_passenger_details(user_id):
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM passengers WHERE user_id = %s", (user_id,))
        passengers = cur.fetchall()
        return jsonify({"success": True, "passengers": passengers}), 200
    except Exception as e:
        print("Passenger Fetch Error:", e)
        return jsonify({"success": False, "message": "Failed to load passengers"}), 500
    finally:
        if conn:
            conn.close()

# -----------------------------
# 8️⃣ Confirm Booking
# -----------------------------
@user_bp.route("/booking/confirm", methods=["POST"])
def confirm_booking():
    try:
        data = request.json
        user_id = data.get("user_id")
        flight_id = data.get("flight_id")
        seat_number = data.get("seat_number")
        if not user_id or not flight_id or not seat_number:
            return jsonify({"success": False, "message": "Missing booking data"}), 400

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO bookings (user_id, flight_id, seat_number, status)
            VALUES (%s, %s, %s, 'confirmed')
        """, (user_id, flight_id, seat_number))
        conn.commit()
        booking_id = cur.lastrowid
        return jsonify({"success": True, "booking_id": booking_id}), 201
    except Exception as e:
        print("Booking Confirm Error:", e)
        return jsonify({"success": False, "message": "Booking failed"}), 500
    finally:
        if conn:
            conn.close()

# -----------------------------
# 9️⃣ Ticket Information
# -----------------------------
@user_bp.route("/ticket/<int:booking_id>", methods=["GET"])
def get_ticket(booking_id):
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT b.booking_id, b.seat_number,
                   f.flight_number, f.departure, f.arrival, f.date, f.time,
                   u.username AS passenger_name, u.email
            FROM bookings b
            JOIN flights f ON b.flight_id = f.flight_id
            JOIN users u ON b.user_id = u.user_id
            WHERE b.booking_id = %s
        """, (booking_id,))
        ticket = cur.fetchone()
        if not ticket:
            return jsonify({"success": False, "message": "Ticket not found"}), 404
        return jsonify({"success": True, "ticket": ticket}), 200
    except Exception as e:
        print("Ticket Error:", e)
        return jsonify({"success": False, "message": "Error loading ticket"}), 500
    finally:
        if conn:
            conn.close()
