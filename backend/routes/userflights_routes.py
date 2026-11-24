from flask import Blueprint, request, jsonify
from connection import get_connection
from datetime import datetime

user_flights_bp = Blueprint("flights", __name__, url_prefix="/api/flights")

# --- List all flights ---
@user_flights_bp.route("", methods=["GET"])
def list_flights():
    source = request.args.get("source")
    destination = request.args.get("destination")
    date = request.args.get("date")

    if date:
        try:
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"success": False, "message": "Invalid date format. Use YYYY-MM-DD"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)
    try:
        # Corrected query - filter out 2025 flights and show newest first
        query = """
            SELECT flight_id, flight_no, airline, source, destination, 
                   departure_time, arrival_time, price, seats_available
            FROM flights
            WHERE YEAR(departure_time) = 2026
        """
        params = []

        if source:
            query += " AND source = %s"
            params.append(source)
        if destination:
            query += " AND destination = %s"
            params.append(destination)
        if date:
            query += " AND DATE(departure_time) = %s"
            params.append(date_obj)

        query += " ORDER BY departure_time DESC"
        cursor.execute(query, tuple(params))
        flights = cursor.fetchall()

        # Format datetimes and add default status
        for f in flights:
            f["departure_time"] = f["departure_time"].strftime("%Y-%m-%d %H:%M:%S") if f["departure_time"] else None
            f["arrival_time"] = f["arrival_time"].strftime("%Y-%m-%d %H:%M:%S") if f["arrival_time"] else None
            f["status"] = "On Time"  # default value

        return jsonify({"success": True, "flights": flights or []})
    except Exception as e:
        print("Error fetching flights:", e)
        return jsonify({"success": False, "message": "Error fetching flights"}), 500
    finally:
        cursor.close()
        conn.close()

# --- Flight status by flight number ---
@user_flights_bp.route("/status", methods=["GET"])
def flight_status():
    flight_no = request.args.get("flight_no")
    if not flight_no:
        return jsonify({"success": False, "message": "flight_no query parameter is required"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)
    try:
        cursor.execute(
            """
            SELECT flight_id, flight_no, airline, source, destination, 
                   departure_time, arrival_time, price, seats_available
            FROM flights
            WHERE flight_no = %s
            """,
            (flight_no,)
        )
        flight = cursor.fetchone()
        if not flight:
            return jsonify({"success": False, "message": "Flight not found"}), 404

        # Format datetimes and add default status
        try:
            # Check if departure_time is a datetime object
            if flight.get("departure_time") and hasattr(flight["departure_time"], "strftime"):
                flight["departure_time"] = flight["departure_time"].strftime("%Y-%m-%d %H:%M:%S")
            elif flight.get("departure_time"):
                # Already a string, keep it as is
                flight["departure_time"] = str(flight["departure_time"])
            else:
                flight["departure_time"] = None
                
            # Check if arrival_time is a datetime object
            if flight.get("arrival_time") and hasattr(flight["arrival_time"], "strftime"):
                flight["arrival_time"] = flight["arrival_time"].strftime("%Y-%m-%d %H:%M:%S")
            elif flight.get("arrival_time"):
                # Already a string, keep it as is
                flight["arrival_time"] = str(flight["arrival_time"])
            else:
                flight["arrival_time"] = None
        except (AttributeError, KeyError, TypeError) as e:
            print(f"Error formatting datetime: {e}")
            import traceback
            print(traceback.format_exc())
            flight["departure_time"] = str(flight.get("departure_time", "")) if flight.get("departure_time") else None
            flight["arrival_time"] = str(flight.get("arrival_time", "")) if flight.get("arrival_time") else None
        
        # Calculate status based on current time
        from datetime import datetime
        now = datetime.now()
        if flight.get("departure_time"):
            try:
                # Try to parse the formatted string
                if isinstance(flight["departure_time"], str):
                    dep_time = datetime.strptime(flight["departure_time"], "%Y-%m-%d %H:%M:%S")
                elif hasattr(flight["departure_time"], "strftime"):
                    dep_time = flight["departure_time"]
                else:
                    dep_time = None
                    
                if dep_time and dep_time < now:
                    flight["status"] = "Departed"
                else:
                    flight["status"] = "On Time"
            except (ValueError, TypeError) as e:
                print(f"Error parsing departure time: {e}")
                flight["status"] = "On Time"
        else:
            flight["status"] = "On Time"

        return jsonify({"success": True, "flight": flight})
    except Exception as e:
        import traceback
        print("Error fetching flight status:", e)
        print(traceback.format_exc())
        return jsonify({"success": False, "message": f"Error fetching flight status: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

# --- Get booked seats for a flight ---
@user_flights_bp.route("/<int:flight_id>/booked-seats", methods=["GET"])
def get_booked_seats(flight_id):
    """Get list of booked seat numbers for a specific flight"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)
    try:
        # Check if seat_number column exists
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'bookings'
            AND COLUMN_NAME = 'seat_number'
        """)
        has_seat_number = cursor.fetchone() is not None
        
        if has_seat_number:
            cursor.execute("""
                SELECT DISTINCT seat_number 
                FROM bookings 
                WHERE flight_id = %s AND seat_number IS NOT NULL AND seat_number != ''
            """, (flight_id,))
            booked_seats = [row["seat_number"] for row in cursor.fetchall()]
        else:
            # If seat_number column doesn't exist, return empty list
            booked_seats = []
        
        return jsonify({"success": True, "booked_seats": booked_seats})
    except Exception as e:
        print(f"Error fetching booked seats: {e}")
        return jsonify({"success": False, "message": "Error fetching booked seats"}), 500
    finally:
        cursor.close()
        conn.close()
