# routes/admin/reports_routes.py
from flask import Blueprint, request, jsonify
from connection import get_connection as get_db_connection
from .admin_routes import admin_required

reports_bp = Blueprint("reports_bp", __name__, url_prefix="/api/reports")

# GET all reports
@reports_bp.route("/", methods=["GET", "OPTIONS"])
@admin_required
def get_reports():
    # Handle OPTIONS request for CORS
    if request.method == "OPTIONS":
        return "", 200
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        # Check if table exists first - wrap in try/except to handle gracefully
        try:
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'reports'
            """)
            table_exists = cursor.fetchone()
            if not table_exists or table_exists.get('count', 0) == 0:
                # Return empty array if table doesn't exist yet
                print("Reports table does not exist, returning empty array")
                return jsonify([]), 200
        except Exception as table_check_error:
            print(f"Error checking if reports table exists: {table_check_error}")
            # Continue anyway, let the SELECT fail gracefully below
        
        # Query to fetch reports matching the actual schema:
        # report_id, report_type, generated_by, report_data, created_at, title, content
        cursor.execute("""
            SELECT 
                report_id,
                report_type,
                generated_by,
                report_data,
                created_at,
                title,
                content
            FROM reports 
            ORDER BY report_id DESC
        """)
        reports = cursor.fetchall()
        
        # Process reports to format data properly
        import json
        for report in reports:
            # Ensure title is set (it's required, but handle gracefully)
            report['title'] = str(report.get('title', '')).strip() or f"Report {report.get('report_id', '')}"
            
            # Ensure report_type is set (it's required)
            report['report_type'] = str(report.get('report_type', '')).strip() or 'General'
            
            # Handle content - if empty, try to extract from report_data JSON
            content_value = report.get('content', '')
            if not content_value or not content_value.strip():
                report_data = report.get('report_data')
                if report_data:
                    try:
                        if isinstance(report_data, str):
                            data = json.loads(report_data)
                        else:
                            data = report_data
                        
                        if isinstance(data, dict):
                            # Format JSON data as readable text
                            content_parts = []
                            for key, value in data.items():
                                content_parts.append(f"{key.replace('_', ' ').title()}: {value}")
                            content_value = '\n'.join(content_parts)
                        else:
                            content_value = str(data)
                    except:
                        content_value = str(report_data) if report_data else ''
            
            # Set the content
            report['content'] = str(content_value).strip() if content_value else ''
            
            # Format created_at if it exists
            if report.get('created_at') and hasattr(report['created_at'], 'strftime'):
                report['created_at'] = report['created_at'].strftime("%Y-%m-%d %H:%M:%S")
        
        return jsonify(reports), 200
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Get Reports Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# POST new report
@reports_bp.route("/", methods=["POST", "OPTIONS"])
@admin_required
def add_report():
    # Handle OPTIONS request for CORS
    if request.method == "OPTIONS":
        return "", 200
    
    conn = None
    cursor = None
    try:
        data = request.get_json() or {}
        
        # Validate required fields based on schema
        if not data:
            return jsonify({"error": "Request body is required", "received_data": None}), 400
        
        # Validate title (required, cannot be empty)
        if 'title' not in data or not data.get('title') or not str(data.get('title', '')).strip():
            return jsonify({"error": "Title is required and cannot be empty", "received_fields": list(data.keys())}), 400
        
        # Validate report_type (required, cannot be empty)
        report_type = data.get('report_type', '').strip() if data.get('report_type') else ''
        if 'report_type' not in data or not report_type:
            return jsonify({"error": "Report type is required. Please select a report type from the dropdown.", "received_fields": list(data.keys()), "received_report_type": data.get('report_type')}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        # Build INSERT statement based on the actual schema:
        # Required: report_id (auto), report_type, title
        # Optional: generated_by, report_data, content
        # Auto: created_at (has default)
        
        columns_to_insert = []
        values_to_insert = []
        placeholders = []
        
        # Required fields
        columns_to_insert.append('report_type')
        values_to_insert.append(data['report_type'])
        placeholders.append('%s')
        
        columns_to_insert.append('title')
        values_to_insert.append(data['title'])
        placeholders.append('%s')
        
        # Optional fields
        if 'content' in data and data['content'] is not None:
            columns_to_insert.append('content')
            values_to_insert.append(data['content'])
            placeholders.append('%s')
        
        if 'generated_by' in data and data['generated_by'] is not None:
            columns_to_insert.append('generated_by')
            values_to_insert.append(int(data['generated_by']))
            placeholders.append('%s')
        
        if 'report_data' in data and data['report_data'] is not None:
            import json
            report_data = data['report_data']
            # If it's a dict, convert to JSON string; if already string, use as is
            if isinstance(report_data, dict):
                report_data = json.dumps(report_data)
            elif not isinstance(report_data, str):
                report_data = json.dumps(report_data)
            columns_to_insert.append('report_data')
            values_to_insert.append(report_data)
            placeholders.append('%s')
        
        # Build and execute the INSERT query
        columns_str = ', '.join(columns_to_insert)
        placeholders_str = ', '.join(placeholders)
        insert_query = f"INSERT INTO reports ({columns_str}) VALUES ({placeholders_str})"
        
        print(f"Executing INSERT query: {insert_query}")
        print(f"With values: {values_to_insert}")
        
        cursor.execute(insert_query, tuple(values_to_insert))
        conn.commit()
        
        if cursor.rowcount == 0:
            raise Exception("Failed to insert report - no rows affected")
        
        report_id = cursor.lastrowid
        if report_id == 0:
            cursor.execute("SELECT LAST_INSERT_ID() as id")
            last_insert = cursor.fetchone()
            if last_insert and last_insert.get('id'):
                report_id = last_insert['id']
        
        return jsonify({"message": "Report added successfully", "report_id": report_id}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Add Report Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# DELETE report
@reports_bp.route("/<int:report_id>", methods=["DELETE", "OPTIONS"])
@admin_required
def delete_report(report_id):
    # Handle OPTIONS request for CORS
    if request.method == "OPTIONS":
        return "", 200
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM reports WHERE report_id=%s", (report_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Report not found"}), 404
        
        return jsonify({"message": "Report deleted successfully"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Delete Report Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
