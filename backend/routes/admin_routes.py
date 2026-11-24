# routes/admin/admin_routes.py
from flask import Blueprint, request, jsonify
from connection import get_connection as get_db_connection
from werkzeug.security import check_password_hash
import jwt
import datetime
from config import SECRET_KEY
from functools import wraps

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

# -------------------------
# JWT HELPERS
# -------------------------
def generate_jwt(admin_id):
    payload = {
        "admin_id": admin_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=6)
    }
    # Ensure token is a string (common for PyJWT versions)
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token if isinstance(token, str) else token.decode()

def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        # ✅ Allow preflight requests
        if request.method == "OPTIONS":
            return "", 200

        auth = request.headers.get("Authorization", None)
        if not auth:
            return jsonify({"error": "Missing Authorization header"}), 401

        parts = auth.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Invalid Authorization header"}), 401

        token = parts[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.admin_id = payload["admin_id"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except Exception as e:
            print(f"Token decoding error: {e}")
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)
    return wrapper

# -------------------------
# ADMIN LOGIN
# -------------------------
@admin_bp.route("/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "username & password required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT admin_id, username, password_hash FROM admin_users WHERE username=%s",
            (username,)
        )
        admin = cursor.fetchone()

        if not admin or not check_password_hash(admin["password_hash"], password):
            return jsonify({"error": "Invalid credentials"}), 401

        token = generate_jwt(admin["admin_id"])
        return jsonify({"token": token}), 200
    finally:
        cursor.close()
        conn.close()

# =========================================================
# 1️⃣ GET ALL BOOKINGS
# =========================================================
@admin_bp.route("/bookings", methods=["GET"])
@admin_required
def get_all_bookings():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Calculate flight status based on departure time (same logic as flight status endpoint)
        cursor.execute("""
    SELECT 
        b.booking_id AS id,
        CONCAT(f.airline, ' ', f.flight_no) AS flight_name,
        f.source AS origin,
        f.destination,
        f.departure_time,
        f.arrival_time,
        f.seats_available AS seats_available,
        u.user_id,
        u.username AS user_name,
        u.email,
        b.seats_booked,
        b.total_price,
        b.booking_time,
        CASE 
            WHEN f.departure_time IS NOT NULL AND f.departure_time < NOW() THEN 'Departed'
            ELSE 'On Time'
        END AS status

    FROM bookings b
    INNER JOIN flights f ON b.flight_id = f.flight_id
    LEFT JOIN users u ON b.user_id = u.user_id
    ORDER BY b.booking_time DESC
""")
        return jsonify(cursor.fetchall())
    except Exception as e:
        print("Error fetching bookings:", str(e))
        return jsonify({"error": "Database query failed", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
        
# =========================================================
# 2️⃣ GET DASHBOARD STATS
# =========================================================
@admin_bp.route("/stats", methods=["GET"])
@admin_required
def admin_stats():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Total flights today (UTC comparison for consistency)
        today_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        cursor.execute("""
            SELECT COUNT(*) AS total_flights_today
            FROM flights
            WHERE DATE(departure_time) = %s
        """, (today_str,))
        flights_today = cursor.fetchone()["total_flights_today"]

        # Total users
        cursor.execute("SELECT COUNT(*) AS total_users FROM users")
        total_users = cursor.fetchone()["total_users"]

        # Today formatted
        today_formatted = datetime.datetime.utcnow().strftime("%d %B %Y")

        return jsonify({
            "today": today_formatted,
            "total_users": total_users,
            "total_flights_today": flights_today
        })
    except Exception as e:
        print("Error fetching stats:", str(e))
        return jsonify({"error": "Failed to fetch stats", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# =========================================================
# 3️⃣ GET ALL USERS
# =========================================================
@admin_bp.route("/users", methods=["GET"])
@admin_required
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT user_id, username, email, phone
            FROM users
            ORDER BY user_id DESC
        """)
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()

# =========================================================
# 3️⃣ POST CREATE NEW USER
# =========================================================
@admin_bp.route("/users", methods=["POST"])
@admin_required
def add_user():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        data = request.get_json() or {}
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        phone = data.get('phone')
        
        # Validate required fields
        if not username or not email or not password:
            return jsonify({"error": "Username, email, and password are required"}), 400
        
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        # Check if username or email already exists
        cursor.execute(
            "SELECT user_id FROM users WHERE username = %s OR email = %s",
            (username, email)
        )
        if cursor.fetchone():
            return jsonify({"error": "Username or email already exists"}), 409
        
        # Hash the password
        from werkzeug.security import generate_password_hash
        password_hash = generate_password_hash(password)
        
        # Insert new user
        if phone:
            cursor.execute(
                "INSERT INTO users (username, email, password_hash, phone) VALUES (%s, %s, %s, %s)",
                (username, email, password_hash, phone)
            )
        else:
            cursor.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
                (username, email, password_hash)
            )
        conn.commit()
        
        user_id = cursor.lastrowid
        return jsonify({"message": "User created successfully", "user_id": user_id}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        print("Error creating user:", str(e))
        return jsonify({"error": "Failed to create user", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# =========================================================
# 4️⃣ GET ALL FLIGHTS
# =========================================================
@admin_bp.route("/flights", methods=["GET"])
@admin_required
def get_flights():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT flight_id,
                   airline,
                   flight_no,
                   source,
                   destination,
                   departure_time,
                   arrival_time,
                   price,
                   seats_available
            FROM flights
            WHERE YEAR(departure_time) = 2026
            ORDER BY departure_time DESC
        """)
        flights = cursor.fetchall()
        # Format the data to ensure proper types
        for flight in flights:
            # Ensure price is a float/decimal
            if 'price' in flight and flight['price'] is not None:
                flight['price'] = float(flight['price'])
            # Ensure seats_available is an int
            if 'seats_available' in flight and flight['seats_available'] is not None:
                flight['seats_available'] = int(flight['seats_available'])
            # Format datetime fields
            if 'departure_time' in flight and flight['departure_time']:
                if hasattr(flight['departure_time'], 'strftime'):
                    flight['departure_time'] = flight['departure_time'].isoformat()
            if 'arrival_time' in flight and flight['arrival_time']:
                if hasattr(flight['arrival_time'], 'strftime'):
                    flight['arrival_time'] = flight['arrival_time'].isoformat()
        return jsonify(flights)
    finally:
        cursor.close()
        conn.close()

# =========================================================
# 5️⃣ DELETE USER
# =========================================================
@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Note: Depending on your DB schema, you might need to delete related bookings first
        cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"message": f"User {user_id} deleted successfully"}), 200
    except Exception as e:
        print("Error deleting user:", str(e))
        conn.rollback()
        return jsonify({"error": "Failed to delete user", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# =========================================================
# 6️⃣ DELETE FLIGHT
# =========================================================
@admin_bp.route("/flights/<int:flight_id>", methods=["DELETE"])
@admin_required
def delete_flight(flight_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Note: Depending on your DB schema, you might need to handle related bookings first
        cursor.execute("DELETE FROM flights WHERE flight_id = %s", (flight_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Flight not found"}), 404
        return jsonify({"message": f"Flight {flight_id} deleted successfully"}), 200
    except Exception as e:
        print("Error deleting flight:", str(e))
        conn.rollback()
        return jsonify({"error": "Failed to delete flight", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# =========================================================
# 7️⃣ CLEANUP OLD DATA (Delete 2024 and 2025 data, keep only 2026)
# =========================================================
@admin_bp.route("/cleanup-old-data", methods=["POST"])
@admin_required
def cleanup_old_data():
    """Delete all data from 2024 and 2025, keep only 2026"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    results = {}
    
    try:
        # 1. Delete flights from 2024 and 2025
        # This will cascade delete related bookings, schedules, operations (via foreign keys)
        cursor.execute("""
            DELETE FROM flights 
            WHERE YEAR(departure_time) IN (2024, 2025)
        """)
        flights_deleted = cursor.rowcount
        results['flights'] = flights_deleted
        
        # 2. Delete operations from 2024 and 2025
        cursor.execute("""
            DELETE FROM operations 
            WHERE YEAR(COALESCE(scheduled_at, created_at)) IN (2024, 2025)
               OR (completed_at IS NOT NULL AND YEAR(completed_at) IN (2024, 2025))
        """)
        operations_deleted = cursor.rowcount
        results['operations'] = operations_deleted
        
        # 3. Delete crew members created in 2024 or 2025
        cursor.execute("""
            DELETE FROM crew 
            WHERE YEAR(created_at) IN (2024, 2025)
        """)
        crew_deleted = cursor.rowcount
        results['crew'] = crew_deleted
        
        # 4. Delete reports from 2024 and 2025
        try:
            # Check which date columns exist in reports table
            cursor.execute("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'reports'
                AND COLUMN_NAME IN ('date', 'created_at')
            """)
            date_columns = [row[0] for row in cursor.fetchall()]
            
            if date_columns:
                # Build WHERE clause based on available columns
                if 'date' in date_columns and 'created_at' in date_columns:
                    where_clause = "YEAR(COALESCE(date, created_at)) IN (2024, 2025)"
                elif 'date' in date_columns:
                    where_clause = "YEAR(date) IN (2024, 2025)"
                else:
                    where_clause = "YEAR(created_at) IN (2024, 2025)"
                
                cursor.execute(f"""
                    DELETE FROM reports 
                    WHERE {where_clause}
                """)
                reports_deleted = cursor.rowcount
            else:
                # No date columns found, skip deletion
                reports_deleted = 0
            results['reports'] = reports_deleted
        except Exception as e:
            print(f"Error deleting reports: {e}")
            results['reports'] = 0
        
        # 5. Delete schedules from 2024 and 2025 (in case any weren't cascade deleted)
        cursor.execute("""
            DELETE FROM schedules 
            WHERE YEAR(COALESCE(departure_time, created_at)) IN (2024, 2025)
        """)
        schedules_deleted = cursor.rowcount
        results['schedules'] = schedules_deleted
        
        # 6. Delete payments from 2024 and 2025 (if table exists)
        try:
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'payments'
            """)
            result = cursor.fetchone()
            count = result[0] if result else 0
            
            if count > 0:
                cursor.execute("""
                    DELETE FROM payments 
                    WHERE YEAR(created_at) IN (2024, 2025)
                """)
                payments_deleted = cursor.rowcount
                results['payments'] = payments_deleted
            else:
                results['payments'] = 0
        except:
            results['payments'] = 0
        
        # 7. Delete bookings from 2024 and 2025 (in case any weren't cascade deleted)
        try:
            cursor.execute("""
                DELETE FROM bookings 
                WHERE YEAR(booking_time) IN (2024, 2025)
            """)
            bookings_deleted = cursor.rowcount
            results['bookings'] = bookings_deleted
        except:
            results['bookings'] = 0
        
        # Commit all deletions
        conn.commit()
        
        total_deleted = sum(results.values())
        
        return jsonify({
            "success": True,
            "message": "Old data cleanup completed successfully",
            "deleted": results,
            "total_deleted": total_deleted
        }), 200
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error cleaning up old data: {e}")
        print(f"Traceback: {error_trace}")
        conn.rollback()
        return jsonify({"error": "Failed to cleanup old data", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# =========================================================
# 8️⃣ ADD CREW DATA (Create sample crew members)
# =========================================================
@admin_bp.route("/crew/add-data", methods=["POST"])
@admin_required
def add_crew_data():
    """Add sample crew member data"""
    import random
    from datetime import datetime, timedelta
    from datetime import datetime, timedelta
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Ensure crew table exists
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'crew'
        """)
        result = cursor.fetchone()
        table_exists = result and result.get('count', 0) > 0 if result else False
        
        if not table_exists:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS crew (
                    crew_id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    role VARCHAR(100),
                    phone VARCHAR(50),
                    email VARCHAR(150),
                    flight_id INT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
        
        # Check which columns exist in the crew table
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'crew'
        """)
        columns = [row['COLUMN_NAME'] for row in cursor.fetchall()]
        has_name = 'name' in columns
        has_first_name = 'first_name' in columns
        has_last_name = 'last_name' in columns
        has_role = 'role' in columns
        has_phone = 'phone' in columns
        has_email = 'email' in columns
        has_flight_id = 'flight_id' in columns
        has_hire_date = 'hire_date' in columns
        
        # If table exists but doesn't have expected columns, we need to alter it
        # Note: We don't add hire_date automatically as it might have specific requirements
        if table_exists and not has_name and not has_first_name:
            # Try to add missing columns
            try:
                if not has_name and not has_first_name:
                    cursor.execute("ALTER TABLE crew ADD COLUMN name VARCHAR(255)")
                if not has_role:
                    cursor.execute("ALTER TABLE crew ADD COLUMN role VARCHAR(100)")
                if not has_phone:
                    cursor.execute("ALTER TABLE crew ADD COLUMN phone VARCHAR(50)")
                if not has_email:
                    cursor.execute("ALTER TABLE crew ADD COLUMN email VARCHAR(150)")
                if not has_flight_id:
                    cursor.execute("ALTER TABLE crew ADD COLUMN flight_id INT NULL")
                conn.commit()
                # Refresh column list
                cursor.execute("""
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'crew'
                """)
                columns = [row['COLUMN_NAME'] for row in cursor.fetchall()]
                has_name = 'name' in columns
                has_first_name = 'first_name' in columns
                has_last_name = 'last_name' in columns
                has_role = 'role' in columns
                has_phone = 'phone' in columns
                has_email = 'email' in columns
                has_flight_id = 'flight_id' in columns
                has_hire_date = 'hire_date' in columns
            except Exception as alter_error:
                print(f"Could not alter crew table: {alter_error}")
        
        # Re-check columns one more time to ensure we have the latest state
        cursor.execute("""
            SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'crew'
        """)
        column_info = {row['COLUMN_NAME']: {'nullable': row['IS_NULLABLE'] == 'YES', 'default': row['COLUMN_DEFAULT']} for row in cursor.fetchall()}
        columns = list(column_info.keys())
        has_name = 'name' in columns
        has_first_name = 'first_name' in columns
        has_last_name = 'last_name' in columns
        has_role = 'role' in columns
        has_phone = 'phone' in columns
        has_email = 'email' in columns
        has_flight_id = 'flight_id' in columns
        has_hire_date = 'hire_date' in columns
        
        # Check if hire_date is required (NOT NULL, no default)
        hire_date_required = has_hire_date and not column_info.get('hire_date', {}).get('nullable', True) and column_info.get('hire_date', {}).get('default') is None
        
        # Debug: Print column detection
        print(f"Column detection - has_hire_date: {has_hire_date}, hire_date_required: {hire_date_required}")
        print(f"Available columns: {columns}")
        
        # Get available flights from 2026
        cursor.execute("""
            SELECT flight_id
            FROM flights
            WHERE YEAR(departure_time) = 2026
            ORDER BY departure_time DESC
            LIMIT 50
        """)
        flights = cursor.fetchall()
        flight_ids = [f['flight_id'] for f in flights] if flights else []
        
        # Sample names
        first_names = [
            "Ahmed", "Fatima", "Muhammad", "Ayesha", "Ali", "Zainab", "Hassan", "Maryam",
            "John", "Sarah", "David", "Emily", "Michael", "Jessica", "James", "Jennifer",
            "Robert", "Lisa", "William", "Amy", "Richard", "Michelle", "Joseph", "Kimberly"
        ]
        
        last_names = [
            "Khan", "Ahmed", "Ali", "Hassan", "Malik", "Butt", "Sheikh", "Raza",
            "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
            "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris"
        ]
        
        # Roles
        roles = [
            "Pilot", "Co-Pilot", "Flight Attendant", "Senior Flight Attendant",
            "Ground Staff", "Maintenance Engineer", "Security Officer", "Catering Staff"
        ]
        
        crew_data = []
        num_crew = random.randint(30, 50)
        
        for i in range(num_crew):
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            name = f"{first_name} {last_name}"
            role = random.choice(roles)
            email = f"{first_name.lower()}.{last_name.lower()}@airline.com"
            phone = f"+92-{random.randint(300, 399)}-{random.randint(1000000, 9999999)}"
            # 70% assigned to flights, 30% unassigned
            flight_id = random.choice(flight_ids) if random.random() < 0.7 and flight_ids else None
            
            # Build data tuple based on available columns
            row_data = []
            # Handle name vs first_name/last_name
            if has_first_name:
                row_data.append(first_name)
            if has_last_name:
                row_data.append(last_name)
            if has_name and not has_first_name:
                row_data.append(name)
            if has_role:
                row_data.append(role)
            if has_phone:
                row_data.append(phone)
            if has_email:
                row_data.append(email)
            if has_flight_id:
                row_data.append(flight_id)
            # Always include hire_date if the column exists (required or not)
            if has_hire_date or hire_date_required:
                # Generate a random hire date within the last 5 years
                days_ago = random.randint(0, 1825)  # 5 years = 1825 days
                hire_date = (datetime.now() - timedelta(days=days_ago)).date()
                row_data.append(hire_date)
            
            crew_data.append(tuple(row_data))
        
        # Build insert query based on available columns
        cols = []
        # Handle name vs first_name/last_name
        if has_first_name:
            cols.append('first_name')
        if has_last_name:
            cols.append('last_name')
        if has_name and not has_first_name:
            cols.append('name')
        if has_role:
            cols.append('role')
        if has_phone:
            cols.append('phone')
        if has_email:
            cols.append('email')
        if has_flight_id:
            cols.append('flight_id')
        # Always include hire_date in columns if it exists or is required
        if has_hire_date or hire_date_required:
            cols.append('hire_date')
        
        if not cols:
            return jsonify({
                "success": False,
                "message": "No valid columns found in crew table"
            }), 400
        
        # Insert crew members
        cols_str = ', '.join(cols)
        placeholders = ', '.join(['%s'] * len(cols))
        insert_query = f"""
            INSERT INTO crew ({cols_str})
            VALUES ({placeholders})
        """
        cursor.executemany(insert_query, crew_data)
        inserted_count = len(crew_data)  # Use length of data instead of rowcount
        conn.commit()
        
        return jsonify({
            "success": True,
            "message": "Crew data added successfully",
            "added": inserted_count
        }), 200
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error adding crew data: {e}")
        print(f"Traceback: {error_trace}")
        conn.rollback()
        return jsonify({"error": "Failed to add crew data", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# =========================================================
# 9️⃣ ADD REPORTS DATA (Create sample reports)
# =========================================================
@admin_bp.route("/reports/add-data", methods=["POST"])
@admin_required
def add_reports_data():
    """Add sample reports data"""
    from datetime import timedelta
    import random
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Ensure reports table exists
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'reports'
        """)
        result = cursor.fetchone()
        table_exists = result and result.get('count', 0) > 0 if result else False
        
        if not table_exists:
            # Try to create with common schema
            try:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS reports (
                        report_id INT AUTO_INCREMENT PRIMARY KEY,
                        title VARCHAR(255) NOT NULL,
                        report_type VARCHAR(100) NOT NULL,
                        content TEXT,
                        generated_by INT NULL,
                        report_data JSON,
                        status VARCHAR(50) DEFAULT 'Draft',
                        date DATE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    )
                """)
                conn.commit()
            except:
                # If that fails, try simpler schema
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS reports (
                        report_id INT AUTO_INCREMENT PRIMARY KEY,
                        title VARCHAR(255) NOT NULL,
                        report_type VARCHAR(100) NOT NULL,
                        content TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                conn.commit()
        
        # Check which columns exist
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'reports'
        """)
        columns = [row['COLUMN_NAME'] for row in cursor.fetchall()]
        has_status = 'status' in columns
        has_date = 'date' in columns
        has_generated_by = 'generated_by' in columns
        
        # Report types
        report_types = [
            "Financial", "Operational", "Safety", "Maintenance", 
            "Customer Service", "Security", "Performance", "Compliance"
        ]
        
        statuses = ['Draft', 'Submitted', 'Approved', 'Under Review'] if has_status else []
        
        # Sample report templates
        report_templates = [
            {
                "title": "Monthly Financial Summary",
                "type": "Financial",
                "content": "This report covers the financial performance for the month, including revenue, expenses, and profit margins. Key highlights include increased passenger bookings and improved operational efficiency."
            },
            {
                "title": "Flight Operations Review",
                "type": "Operational",
                "content": "Comprehensive review of flight operations including on-time performance, route efficiency, and aircraft utilization. Recommendations for improvement included."
            },
            {
                "title": "Safety Inspection Report",
                "type": "Safety",
                "content": "Detailed safety inspection findings across all aircraft and ground operations. All safety protocols are being followed correctly. No critical issues identified."
            },
            {
                "title": "Aircraft Maintenance Log",
                "type": "Maintenance",
                "content": "Monthly maintenance report covering scheduled and unscheduled maintenance activities. All aircraft are in excellent condition and meeting regulatory requirements."
            },
            {
                "title": "Customer Satisfaction Survey",
                "type": "Customer Service",
                "content": "Analysis of customer feedback and satisfaction ratings. Overall satisfaction score improved by 8% compared to last quarter. Areas for improvement identified."
            },
            {
                "title": "Security Assessment",
                "type": "Security",
                "content": "Quarterly security assessment covering all security protocols, staff training, and incident reports. All security measures are up to date and compliant."
            },
            {
                "title": "Performance Metrics Report",
                "type": "Performance",
                "content": "Key performance indicators including load factors, revenue per passenger, and operational efficiency metrics. Performance targets exceeded in most categories."
            },
            {
                "title": "Regulatory Compliance Review",
                "type": "Compliance",
                "content": "Annual compliance review ensuring all operations meet regulatory requirements. All certifications are current and valid. No compliance issues identified."
            }
        ]
        
        reports_data = []
        num_reports = random.randint(15, 25)
        
        for i in range(num_reports):
            # Use template or generate random
            if random.random() < 0.6 and report_templates:
                template = random.choice(report_templates)
                title = template["title"]
                report_type = template["type"]
                content = template["content"]
            else:
                report_type = random.choice(report_types)
                title = f"{report_type} Report - {datetime.datetime.now().strftime('%B %Y')}"
                content = f"This is a {report_type.lower()} report covering various aspects of airline operations. Generated on {datetime.datetime.now().strftime('%Y-%m-%d')}."
            
            # Build insert based on available columns
            if has_status:
                status = random.choice(statuses) if statuses else None
            else:
                status = None
            
            if has_date:
                days_ago = random.randint(0, 90)
                report_date = (datetime.datetime.now() - timedelta(days=days_ago)).date()
            else:
                report_date = None
            
            # Build columns and values dynamically
            cols = ['title', 'report_type', 'content']
            vals = [title, report_type, content]
            
            if has_status and status:
                cols.append('status')
                vals.append(status)
            
            if has_date and report_date:
                cols.append('date')
                vals.append(report_date)
            
            reports_data.append((cols, vals))
        
        # Insert reports
        inserted_count = 0
        for cols, vals in reports_data:
            try:
                placeholders = ', '.join(['%s'] * len(cols))
                cols_str = ', '.join(cols)
                insert_query = f"INSERT INTO reports ({cols_str}) VALUES ({placeholders})"
                cursor.execute(insert_query, tuple(vals))
                inserted_count += 1
            except Exception as e:
                print(f"Error inserting report: {e}")
                continue
        
        conn.commit()
        
        return jsonify({
            "success": True,
            "message": "Reports data added successfully",
            "added": inserted_count
        }), 200
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error adding reports data: {e}")
        print(f"Traceback: {error_trace}")
        conn.rollback()
        return jsonify({"error": "Failed to add reports data", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# =========================================================
# 🔟 UPDATE FLIGHT DATA (Delete 2025 flights, add new flights) - DEPRECATED
# =========================================================
@admin_bp.route("/flights/update", methods=["POST"])
@admin_required
def update_flight_data():
    """Delete flights from 2025 and add new flight data"""
    from datetime import timedelta
    import random
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Delete flights from 2024 and 2025
        cursor.execute("""
            DELETE FROM flights 
            WHERE YEAR(departure_time) IN (2024, 2025)
        """)
        deleted_count = cursor.rowcount
        
        # Add new flights (2026 only)
        airlines = ["Pakistan International Airlines", "Emirates", "Qatar Airways", "Turkish Airlines", "British Airways"]
        cities = ["Karachi", "Lahore", "Islamabad", "Peshawar", "Quetta", "Dubai", "Abu Dhabi", "Doha", 
                 "Istanbul", "London", "Manchester", "New York", "Los Angeles", "Chicago", "Toronto", 
                 "Vancouver", "Sydney", "Melbourne", "Frankfurt", "Berlin", "Paris"]
        
        flights_data = []
        
        # Generate flights for 2026 only
        base_date_2026 = datetime.datetime(2026, 1, 1)
        for i in range(100):
            departure_date = base_date_2026 + timedelta(days=random.randint(0, 180))
            departure_time = departure_date.replace(
                hour=random.randint(6, 22),
                minute=random.choice([0, 15, 30, 45])
            )
            arrival_time = departure_time + timedelta(hours=random.randint(2, 12))
            
            source = random.choice(cities)
            destination = random.choice([c for c in cities if c != source])
            airline = random.choice(airlines)
            flight_no = f"{airline[:2].upper()}-{random.randint(100, 999)}"
            price = round(random.uniform(200, 2000), 2)
            seats_available = random.randint(10, 200)
            
            flights_data.append((
                airline, flight_no, source, destination,
                departure_time, arrival_time, price, seats_available
            ))
        
        # Insert new flights
        insert_query = """
            INSERT INTO flights 
            (airline, flight_no, source, destination, departure_time, arrival_time, price, seats_available)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.executemany(insert_query, flights_data)
        inserted_count = cursor.rowcount
        conn.commit()
        
        return jsonify({
            "success": True,
            "message": "Flight data updated successfully (2026 only)",
            "deleted": deleted_count,
            "added": inserted_count
        }), 200
    except Exception as e:
        print("Error updating flight data:", str(e))
        conn.rollback()
        return jsonify({"error": "Failed to update flight data", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# =========================================================
# 8️⃣ SYNC SCHEDULES WITH FLIGHTS (Create schedules for flights without schedules)
# =========================================================
@admin_bp.route("/schedules/sync", methods=["POST"])
@admin_required
def sync_schedules():
    """Create schedules for all flights that don't have schedules"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check if schedules table exists, create if not
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'schedules'
        """)
        table_exists = cursor.fetchone()
        if not table_exists or table_exists.get('count', 0) == 0:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS schedules (
                    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
                    flight_id INT NOT NULL,
                    departure_time DATETIME NOT NULL,
                    arrival_time DATETIME NOT NULL,
                    status VARCHAR(50) DEFAULT 'Scheduled',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (flight_id) REFERENCES flights(flight_id) ON DELETE CASCADE
                )
            """)
            conn.commit()
        
        # Find flights without schedules
        cursor.execute("""
            SELECT f.flight_id, f.departure_time, f.arrival_time
            FROM flights f
            LEFT JOIN schedules s ON f.flight_id = s.flight_id
            WHERE s.schedule_id IS NULL
            AND YEAR(f.departure_time) = 2026
        """)
        flights_without_schedules = cursor.fetchall()
        
        created_count = 0
        for flight in flights_without_schedules:
            try:
                cursor.execute("""
                    INSERT INTO schedules (flight_id, departure_time, arrival_time, status)
                    VALUES (%s, %s, %s, 'Scheduled')
                """, (flight['flight_id'], flight['departure_time'], flight['arrival_time']))
                created_count += 1
            except Exception as e:
                print(f"Error creating schedule for flight {flight['flight_id']}: {e}")
                continue
        
        conn.commit()
        
        return jsonify({
            "success": True,
            "message": f"Synced schedules with flights",
            "created": created_count,
            "total_flights_checked": len(flights_without_schedules)
        }), 200
    except Exception as e:
        print("Error syncing schedules:", str(e))
        conn.rollback()
        return jsonify({"error": "Failed to sync schedules", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
