# routes/admin/schedule_routes.py
from flask import Blueprint, request, jsonify
from connection import get_connection as get_db_connection
from .admin_routes import admin_required

schedule_bp = Blueprint("schedule_bp", __name__, url_prefix="/api/schedules")

# ==========================
# GET all schedules
# ==========================
@schedule_bp.route("/", methods=["GET"])
@admin_required
def get_schedules():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        # Filter out schedules from 2025 and order by newest first
        cursor.execute("""
            SELECT s.* 
            FROM schedules s
            LEFT JOIN flights f ON s.flight_id = f.flight_id
            WHERE YEAR(COALESCE(s.departure_time, f.departure_time)) = 2026
            ORDER BY COALESCE(s.departure_time, f.departure_time) DESC
        """)
        return jsonify(cursor.fetchall()), 200
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Get Schedules Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==========================
# POST new schedule
# ==========================
@schedule_bp.route("/", methods=["POST"])
@admin_required
def add_schedule():
    conn = None
    cursor = None
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        # Check if table exists, if not create it
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
        
        # Check which columns exist in schedules table and their properties
        cursor.execute("""
            SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'schedules'
            AND COLUMN_NAME != 'schedule_id'
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
        
        print(f"Column metadata in schedules table: {column_metadata}")
        
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
            'flight_id': ['flight_id'],
            'departure_time': ['departure_time', 'departure', 'departure_datetime'],
            'arrival_time': ['arrival_time', 'arrival', 'arrival_datetime'],
            'status': ['status', 'schedule_status']
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
                    values_to_insert.append(data[field_name])
                    placeholders.append('%s')
                elif col_name in required_columns:
                    # Provide default for status if required
                    if field_name == 'status' and col_name in required_columns:
                        columns_to_insert.append(col_name)
                        values_to_insert.append(data.get('status', 'Scheduled'))
                        placeholders.append('%s')
                    else:
                        return jsonify({"error": f"Required field '{field_name}' is missing"}), 400
        
        # Handle any other required columns
        for col_name in required_columns:
            if col_name not in columns_to_insert:
                if col_name in data:
                    columns_to_insert.append(col_name)
                    values_to_insert.append(data[col_name])
                    placeholders.append('%s')
                else:
                    return jsonify({"error": f"Required field '{col_name}' is missing"}), 400
        
        if not columns_to_insert:
            return jsonify({"error": "No valid columns found to insert. Please check the table structure."}), 500
        
        # Build and execute the INSERT query
        columns_str = ', '.join(columns_to_insert)
        placeholders_str = ', '.join(placeholders)
        insert_query = f"INSERT INTO schedules ({columns_str}) VALUES ({placeholders_str})"
        
        print(f"Executing INSERT query: {insert_query}")
        print(f"With values: {values_to_insert}")
        
        cursor.execute(insert_query, tuple(values_to_insert))
        conn.commit()
        
        if cursor.rowcount == 0:
            raise Exception("Failed to insert schedule - no rows affected")
        
        schedule_id = cursor.lastrowid
        if schedule_id == 0:
            cursor.execute("SELECT LAST_INSERT_ID() as id")
            last_insert = cursor.fetchone()
            if last_insert and last_insert.get('id'):
                schedule_id = last_insert['id']
        
        return jsonify({"message": "Schedule added successfully", "schedule_id": schedule_id}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Add Schedule Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==========================
# PUT update schedule
# ==========================
@schedule_bp.route("/<int:schedule_id>", methods=["PUT"])
@admin_required
def update_schedule(schedule_id):
    conn = None
    cursor = None
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        # Check which columns exist in schedules table
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'schedules'
            AND COLUMN_NAME != 'schedule_id'
        """)
        rows = cursor.fetchall()
        existing_columns = set()
        for row in rows:
            if isinstance(row, dict):
                existing_columns.add(row.get("COLUMN_NAME") or row.get("column_name", ""))
            else:
                existing_columns.add(row[0] if row else "")
        existing_columns = {col for col in existing_columns if col}
        
        updates = []
        params = []
        allowed_fields = ['flight_id', 'departure_time', 'arrival_time', 'status']
        
        for field in allowed_fields:
            if field in data and field in existing_columns:
                updates.append(f"{field} = %s")
                params.append(data[field])
        
        if not updates:
            return jsonify({"error": "No valid fields to update"}), 400
        
        params.append(schedule_id)
        query = f"UPDATE schedules SET {', '.join(updates)} WHERE schedule_id = %s"
        cursor.execute(query, tuple(params))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Schedule not found"}), 404
        
        return jsonify({"message": "Schedule updated successfully"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Update Schedule Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==========================
# DELETE schedule
# ==========================
@schedule_bp.route("/<int:schedule_id>", methods=["DELETE"])
@admin_required
def delete_schedule(schedule_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM schedules WHERE schedule_id=%s", (schedule_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Schedule not found"}), 404
        
        return jsonify({"message": "Schedule deleted successfully"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Delete Schedule Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
