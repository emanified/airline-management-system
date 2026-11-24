# routes/admin/operations_routes.py
from flask import Blueprint, request, jsonify
from connection import get_connection as get_db_connection
from .admin_routes import admin_required

operations_bp = Blueprint("operations_bp", __name__, url_prefix="/api/operations")

# GET all operations
@operations_bp.route("/", methods=["GET"])
@admin_required
def get_operations():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        # Filter out operations for flights from 2025 and order by newest first
        cursor.execute("""
            SELECT o.* 
            FROM operations o
            LEFT JOIN flights f ON o.flight_id = f.flight_id
            WHERE f.flight_id IS NULL OR YEAR(COALESCE(f.departure_time, '2000-01-01')) = 2026
            ORDER BY o.operation_id DESC
        """)
        return jsonify(cursor.fetchall()), 200
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Get Operations Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# POST new operation
@operations_bp.route("/", methods=["POST", "OPTIONS"])
@admin_required
def add_operation():
    # Handle OPTIONS request for CORS
    if request.method == "OPTIONS":
        return "", 200
    
    conn = None
    cursor = None
    try:
        data = request.get_json() or {}
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        # Validate required fields based on schema
        if 'flight_id' not in data or data.get('flight_id') is None:
            return jsonify({"error": "flight_id is required"}), 400
        
        if 'operation_type' not in data or not str(data.get('operation_type', '')).strip():
            return jsonify({"error": "operation_type is required"}), 400
        
        if 'scheduled_at' not in data or not data.get('scheduled_at'):
            return jsonify({"error": "scheduled_at is required"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        # Build INSERT statement based on the actual schema:
        # Required: operation_id (auto), flight_id, operation_type, scheduled_at
        # Optional: status (defaults to 'Pending'), completed_at
        # Auto: created_at, updated_at (have defaults)
        
        columns_to_insert = []
        values_to_insert = []
        placeholders = []
        
        # Required fields
        columns_to_insert.append('flight_id')
        values_to_insert.append(int(data['flight_id']))
        placeholders.append('%s')
        
        columns_to_insert.append('operation_type')
        operation_type = str(data['operation_type']).strip()
        if len(operation_type) > 50:
            return jsonify({"error": "operation_type must be 50 characters or less"}), 400
        values_to_insert.append(operation_type)
        placeholders.append('%s')
        
        columns_to_insert.append('scheduled_at')
        values_to_insert.append(data['scheduled_at'])
        placeholders.append('%s')
        
        # Optional fields
        if 'status' in data and data['status']:
            # Validate status is one of the allowed enum values
            valid_statuses = ['Pending', 'In Progress', 'Completed']
            status = data['status']
            if status not in valid_statuses:
                return jsonify({"error": f"status must be one of: {', '.join(valid_statuses)}"}), 400
            columns_to_insert.append('status')
            values_to_insert.append(status)
            placeholders.append('%s')
        
        if 'completed_at' in data and data['completed_at']:
            columns_to_insert.append('completed_at')
            values_to_insert.append(data['completed_at'])
            placeholders.append('%s')
        
        # Safety check - should never be empty since we have required fields
        if not columns_to_insert or len(columns_to_insert) == 0:
            print(f"ERROR: columns_to_insert is empty! Data received: {data}")
            return jsonify({"error": "Internal error: No columns to insert. Please check the server logs."}), 500
        
        # Build and execute the INSERT query
        columns_str = ', '.join(columns_to_insert)
        placeholders_str = ', '.join(placeholders)
        insert_query = f"INSERT INTO operations ({columns_str}) VALUES ({placeholders_str})"
        
        print(f"DEBUG: columns_to_insert = {columns_to_insert}")
        print(f"DEBUG: values_to_insert = {values_to_insert}")
        
        print(f"Executing INSERT query: {insert_query}")
        print(f"With values: {values_to_insert}")
        
        cursor.execute(insert_query, tuple(values_to_insert))
        conn.commit()
        
        if cursor.rowcount == 0:
            raise Exception("Failed to insert operation - no rows affected")
        
        operation_id = cursor.lastrowid
        if operation_id == 0:
            cursor.execute("SELECT LAST_INSERT_ID() as id")
            last_insert = cursor.fetchone()
            if last_insert and last_insert.get('id'):
                operation_id = last_insert['id']
        
        return jsonify({"message": "Operation added successfully", "operation_id": operation_id}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Add Operation Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# DELETE operation
@operations_bp.route("/<int:operation_id>", methods=["DELETE"])
@admin_required
def delete_operation(operation_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM operations WHERE operation_id=%s", (operation_id,))
        conn.commit()
        return jsonify({"message": "Operation deleted successfully"}), 200
    finally:
        cursor.close()
        conn.close()
