# routes/admin/crew_routes.py
from flask import Blueprint, request, jsonify
from connection import get_connection as get_db_connection
from .admin_routes import admin_required  # same folder import

crew_bp = Blueprint("crew_bp", __name__, url_prefix="/api/crew")

# =======================
# GET all crew members
# =======================
@crew_bp.route("/", methods=["GET", "OPTIONS"])
@admin_required
def get_crew():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if crew table exists
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'crew'
        """)
        table_exists = cursor.fetchone()
        if not table_exists or table_exists.get('count', 0) == 0:
            # Table doesn't exist, return empty array
            return jsonify([]), 200
        
        # Check if flight_id column exists
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'crew'
            AND COLUMN_NAME = 'flight_id'
        """)
        flight_id_exists = cursor.fetchone()
        has_flight_id = flight_id_exists and flight_id_exists.get('count', 0) > 0
        
        if has_flight_id:
            # Filter out crew assigned to flights from 2025, but show crew without flight assignments
            # Order by newest first
            cursor.execute("""
                SELECT c.* 
                FROM crew c
                LEFT JOIN flights f ON c.flight_id = f.flight_id
                WHERE c.flight_id IS NULL OR YEAR(COALESCE(f.departure_time, '2000-01-01')) = 2026
                ORDER BY c.crew_id DESC
            """)
        else:
            # No flight_id column, just get all crew
            cursor.execute("""
                SELECT c.* 
                FROM crew c
                ORDER BY c.crew_id DESC
            """)
        
        return jsonify(cursor.fetchall()), 200
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Get Crew Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# =======================
# POST new crew member
# =======================
@crew_bp.route("/", methods=["POST", "OPTIONS"])
@admin_required
def add_crew_member():
    if request.method == "OPTIONS":
        return "", 200

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
            AND TABLE_NAME = 'crew'
        """)
        table_exists = cursor.fetchone()
        if not table_exists or table_exists.get('count', 0) == 0:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS crew (
                    crew_id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    role VARCHAR(100),
                    phone VARCHAR(50),
                    email VARCHAR(150),
                    flight_id INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
        
        # Check which columns exist in crew table and their properties
        cursor.execute("""
            SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'crew'
            AND COLUMN_NAME != 'crew_id'
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
        
        print(f"Column metadata in crew table: {column_metadata}")
        
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
            'name': ['name', 'crew_name', 'full_name'],
            'role': ['role', 'position', 'job_title'],
            'phone': ['phone', 'phone_number', 'contact_phone'],
            'email': ['email', 'email_address'],
            'flight_id': ['flight_id']
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
        insert_query = f"INSERT INTO crew ({columns_str}) VALUES ({placeholders_str})"
        
        print(f"Executing INSERT query: {insert_query}")
        print(f"With values: {values_to_insert}")
        
        cursor.execute(insert_query, tuple(values_to_insert))
        conn.commit()
        
        if cursor.rowcount == 0:
            raise Exception("Failed to insert crew member - no rows affected")
        
        crew_id = cursor.lastrowid
        if crew_id == 0:
            cursor.execute("SELECT LAST_INSERT_ID() as id")
            last_insert = cursor.fetchone()
            if last_insert and last_insert.get('id'):
                crew_id = last_insert['id']
        
        return jsonify({"message": "Crew member added successfully", "crew_id": crew_id}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Add Crew Member Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# =======================
# PUT update crew member
# =======================
@crew_bp.route("/<int:crew_id>", methods=["PUT", "OPTIONS"])
@admin_required
def update_crew_member(crew_id):
    if request.method == "OPTIONS":
        return "", 200

    conn = None
    cursor = None
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        # Check which columns exist in crew table
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'crew'
            AND COLUMN_NAME != 'crew_id'
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
        allowed_fields = ['name', 'role', 'phone', 'email', 'flight_id']
        
        for field in allowed_fields:
            if field in data and field in existing_columns:
                updates.append(f"{field} = %s")
                params.append(data[field])
        
        if not updates:
            return jsonify({"error": "No valid fields to update"}), 400
        
        params.append(crew_id)
        query = f"UPDATE crew SET {', '.join(updates)} WHERE crew_id = %s"
        cursor.execute(query, tuple(params))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Crew member not found"}), 404
        return jsonify({"message": "Crew member updated successfully"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Update Crew Member Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# =======================
# DELETE crew member
# =======================
@crew_bp.route("/<int:crew_id>", methods=["DELETE", "OPTIONS"])
@admin_required
def delete_crew_member(crew_id):
    if request.method == "OPTIONS":
        return "", 200

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM crew WHERE crew_id=%s", (crew_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Crew member not found"}), 404
        return jsonify({"message": "Crew member deleted successfully"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Delete Crew Member Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
