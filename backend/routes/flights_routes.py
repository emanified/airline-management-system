from flask import Blueprint, request, jsonify
from connection import get_connection
from .admin_routes import admin_required

admin_flights_bp = Blueprint("admin_flights", __name__, url_prefix="/api/admin/flights")

@admin_flights_bp.route("", methods=["GET"])
@admin_required
def list_flights_admin():
    """
    GET /api/admin/flights  (admins only)
    Optional query params: source, destination, date (YYYY-MM-DD)
    """
    conn = None
    cursor = None
    try:
        source = request.args.get("source")
        destination = request.args.get("destination")
        date = request.args.get("date")

        conn = get_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        # Explicitly select all columns to ensure we get everything
        # Filter out flights from 2025 and order by newest first
        query = """
            SELECT 
                flight_id,
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
            params.append(date)
        
        query += " ORDER BY departure_time DESC"
        
        cursor.execute(query, tuple(params))
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
        
        print(f"Fetched {len(flights)} flights")
        if flights and len(flights) > 0:
            print(f"Sample flight data: {flights[0]}")
        
        return jsonify(flights), 200
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Get Flights Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@admin_flights_bp.route("", methods=["POST"])
@admin_required
def add_flight():
    """
    POST /api/admin/flights
    """
    conn = None
    cursor = None
    try:
        data = request.get_json() or {}
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        conn = get_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        # Check which columns exist in flights table and their properties
        cursor.execute("""
            SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'flights'
            AND COLUMN_NAME != 'flight_id'
        """)
        rows = cursor.fetchall()
        
        # Build a dictionary of column metadata
        column_metadata = {}
        for row in rows:
            if isinstance(row, dict):
                col_name = row.get("COLUMN_NAME") or row.get("column_name", "")
                is_nullable = (row.get("IS_NULLABLE") or row.get("is_nullable", "NO")).upper() == "YES"
                has_default = row.get("COLUMN_DEFAULT") is not None or row.get("COLUMN_DEFAULT", "") != ""
                data_type = row.get("DATA_TYPE") or row.get("data_type", "")
            else:
                col_name = row[0] if len(row) > 0 else ""
                is_nullable = (row[1] if len(row) > 1 else "NO").upper() == "YES"
                has_default = (row[2] if len(row) > 2 else None) is not None
                data_type = row[4] if len(row) > 4 else ""
            
            if col_name:
                column_metadata[col_name] = {
                    'nullable': is_nullable,
                    'has_default': has_default,
                    'data_type': data_type
                }
        
        print(f"Column metadata in flights table: {column_metadata}")
        
        # Build INSERT statement dynamically based on available columns
        columns_to_insert = []
        values_to_insert = []
        placeholders = []
        
        # Check required columns (NOT NULL without default)
        required_columns = []
        for col_name, metadata in column_metadata.items():
            if not metadata['nullable'] and not metadata['has_default']:
                required_columns.append(col_name)
        
        # Map common field names to possible column names
        field_mappings = {
            'airline': ['airline', 'airline_name'],
            'flight_no': ['flight_no', 'flight_number', 'flight_number'],
            'source': ['source', 'origin', 'departure_city'],
            'destination': ['destination', 'dest', 'arrival_city'],
            'departure_time': ['departure_time', 'departure', 'departure_datetime'],
            'arrival_time': ['arrival_time', 'arrival', 'arrival_datetime'],
            'price': ['price', 'ticket_price', 'cost'],
            'seats_available': ['seats_available', 'available_seats', 'seats']
        }
        
        # Process each field
        for field_name, possible_columns in field_mappings.items():
            col_name = None
            for possible_col in possible_columns:
                if possible_col in column_metadata:
                    col_name = possible_col
                    break
            
            if col_name:
                if field_name in data:
                    columns_to_insert.append(col_name)
                    # Type conversion based on data type
                    value = data[field_name]
                    if column_metadata[col_name]['data_type'] in ['decimal', 'numeric', 'float', 'double']:
                        value = float(value)
                    elif column_metadata[col_name]['data_type'] in ['int', 'tinyint', 'smallint', 'mediumint', 'bigint']:
                        value = int(value)
                    values_to_insert.append(value)
                    placeholders.append('%s')
                elif col_name in required_columns:
                    return jsonify({"error": f"Required field '{field_name}' is missing"}), 400
        
        # Handle any other required columns that we haven't covered
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
        insert_query = f"INSERT INTO flights ({columns_str}) VALUES ({placeholders_str})"
        
        print(f"Executing INSERT query: {insert_query}")
        print(f"With values: {values_to_insert}")
        
        cursor.execute(insert_query, tuple(values_to_insert))
        conn.commit()
        
        if cursor.rowcount == 0:
            raise Exception("Failed to insert flight - no rows affected")
        
        flight_id = cursor.lastrowid
        if flight_id == 0:
            cursor.execute("SELECT LAST_INSERT_ID() as id")
            last_insert = cursor.fetchone()
            if last_insert and last_insert.get('id'):
                flight_id = last_insert['id']
        
        # Automatically create a schedule entry for the new flight
        try:
            # Check if schedules table exists
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'schedules'
            """)
            table_exists = cursor.fetchone()
            
            if not table_exists or table_exists.get('count', 0) == 0:
                # Create schedules table if it doesn't exist
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
            
            # Get departure_time and arrival_time from the flight data
            # Try multiple possible field names
            departure_time = data.get('departure_time') or data.get('departure') or data.get('departure_datetime')
            arrival_time = data.get('arrival_time') or data.get('arrival') or data.get('arrival_datetime')
            
            # If not in data, fetch from the flight we just created
            if not departure_time or not arrival_time:
                cursor.execute("SELECT departure_time, arrival_time FROM flights WHERE flight_id = %s", (flight_id,))
                flight_data = cursor.fetchone()
                if flight_data:
                    departure_time = departure_time or flight_data.get('departure_time')
                    arrival_time = arrival_time or flight_data.get('arrival_time')
            
            # Check which columns exist in schedules table
            cursor.execute("""
                SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'schedules'
                AND COLUMN_NAME != 'schedule_id'
            """)
            schedule_rows = cursor.fetchall()
            
            schedule_column_metadata = {}
            for row in schedule_rows:
                if isinstance(row, dict):
                    col_name = row.get("COLUMN_NAME") or row.get("column_name", "")
                    is_nullable = (row.get("IS_NULLABLE") or row.get("is_nullable", "NO")).upper() == "YES"
                    has_default = row.get("COLUMN_DEFAULT") is not None or row.get("COLUMN_DEFAULT", "") != ""
                else:
                    col_name = row[0] if len(row) > 0 else ""
                    is_nullable = (row[1] if len(row) > 1 else "NO").upper() == "YES"
                    has_default = (row[2] if len(row) > 2 else None) is not None
                
                if col_name:
                    schedule_column_metadata[col_name] = {
                        'nullable': is_nullable,
                        'has_default': has_default
                    }
            
            # Check if schedule already exists for this flight
            cursor.execute("SELECT schedule_id FROM schedules WHERE flight_id = %s", (flight_id,))
            existing_schedule = cursor.fetchone()
            
            if not existing_schedule:
                # Build schedule INSERT statement
                schedule_columns = ['flight_id']
                schedule_values = [flight_id]
                schedule_placeholders = ['%s']
                
                # Add departure_time if available and column exists
                if departure_time and 'departure_time' in schedule_column_metadata:
                    schedule_columns.append('departure_time')
                    schedule_values.append(departure_time)
                    schedule_placeholders.append('%s')
                
                # Add arrival_time if available and column exists
                if arrival_time and 'arrival_time' in schedule_column_metadata:
                    schedule_columns.append('arrival_time')
                    schedule_values.append(arrival_time)
                    schedule_placeholders.append('%s')
                
                # Add status if column exists (it has a default, but we can set it explicitly)
                if 'status' in schedule_column_metadata:
                    schedule_columns.append('status')
                    schedule_values.append('Scheduled')
                    schedule_placeholders.append('%s')
                
                # Insert schedule - ensure we have at least flight_id and times
                # If we don't have times in data, fetch from database
                if not departure_time or not arrival_time:
                    cursor.execute("SELECT departure_time, arrival_time FROM flights WHERE flight_id = %s", (flight_id,))
                    flight_times = cursor.fetchone()
                    if flight_times:
                        if not departure_time and 'departure_time' in schedule_column_metadata:
                            if 'departure_time' not in schedule_columns:
                                schedule_columns.append('departure_time')
                                schedule_values.append(flight_times.get('departure_time'))
                                schedule_placeholders.append('%s')
                        if not arrival_time and 'arrival_time' in schedule_column_metadata:
                            if 'arrival_time' not in schedule_columns:
                                schedule_columns.append('arrival_time')
                                schedule_values.append(flight_times.get('arrival_time'))
                                schedule_placeholders.append('%s')
                
                # Now check if we have all required fields
                has_departure = 'departure_time' in schedule_columns
                has_arrival = 'arrival_time' in schedule_columns
                
                if has_departure and has_arrival:
                    schedule_insert_query = f"""
                        INSERT INTO schedules ({', '.join(schedule_columns)})
                        VALUES ({', '.join(schedule_placeholders)})
                    """
                    cursor.execute(schedule_insert_query, tuple(schedule_values))
                    conn.commit()
                    print(f"Created schedule entry for flight_id {flight_id}")
                else:
                    print(f"Warning: Could not create schedule for flight {flight_id} - missing required fields (departure: {has_departure}, arrival: {has_arrival})")
        except Exception as schedule_error:
            # Log the error but don't fail the flight creation
            print(f"Warning: Could not create schedule entry for flight {flight_id}: {schedule_error}")
            # Don't rollback the flight insertion
        
        return jsonify({"message": "Flight added successfully", "flight_id": flight_id}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Add Flight Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@admin_flights_bp.route("/<int:flight_id>", methods=["PUT"])
@admin_required
def update_flight(flight_id):
    conn = None
    cursor = None
    try:
        data = request.get_json() or {}
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        conn = get_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        # Check which columns exist in flights table
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'flights'
            AND COLUMN_NAME != 'flight_id'
        """)
        rows = cursor.fetchall()
        existing_columns = set()
        for row in rows:
            if isinstance(row, dict):
                existing_columns.add(row.get("COLUMN_NAME") or row.get("column_name", ""))
            else:
                existing_columns.add(row[0] if row else "")
        existing_columns = {col for col in existing_columns if col}
        
        allowed = ["airline","flight_no","source","destination","departure_time","arrival_time","price","seats_available"]
        fields = []
        params = []
        for k in allowed:
            if k in data and k in existing_columns:
                fields.append(f"{k} = %s")
                params.append(data[k])
        
        if not fields:
            return jsonify({"error": "No valid fields to update"}), 400

        params.append(flight_id)
        query = "UPDATE flights SET " + ", ".join(fields) + " WHERE flight_id = %s"
        cursor.execute(query, tuple(params))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Flight not found"}), 404
        
        # Update corresponding schedule if departure_time or arrival_time were changed
        try:
            # Check if schedules table exists
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'schedules'
            """)
            table_exists = cursor.fetchone()
            
            if table_exists and table_exists.get('count', 0) > 0:
                # Check if schedule exists for this flight
                cursor.execute("SELECT schedule_id FROM schedules WHERE flight_id = %s", (flight_id,))
                schedule = cursor.fetchone()
                
                if schedule:
                    # Update existing schedule
                    schedule_updates = []
                    schedule_params = []
                    
                    if 'departure_time' in data:
                        schedule_updates.append("departure_time = %s")
                        schedule_params.append(data['departure_time'])
                    
                    if 'arrival_time' in data:
                        schedule_updates.append("arrival_time = %s")
                        schedule_params.append(data['arrival_time'])
                    
                    if schedule_updates:
                        schedule_params.append(schedule.get('schedule_id') or schedule.get('id'))
                        schedule_update_query = f"""
                            UPDATE schedules 
                            SET {', '.join(schedule_updates)} 
                            WHERE schedule_id = %s
                        """
                        cursor.execute(schedule_update_query, tuple(schedule_params))
                        conn.commit()
                        print(f"Updated schedule for flight_id {flight_id}")
                else:
                    # Create schedule if it doesn't exist - get times from flight or data
                    cursor.execute("SELECT departure_time, arrival_time FROM flights WHERE flight_id = %s", (flight_id,))
                    flight_data = cursor.fetchone()
                    
                    departure_time = data.get('departure_time') or (flight_data.get('departure_time') if flight_data else None)
                    arrival_time = data.get('arrival_time') or (flight_data.get('arrival_time') if flight_data else None)
                    
                    if departure_time and arrival_time:
                        schedule_insert_query = """
                            INSERT INTO schedules (flight_id, departure_time, arrival_time, status)
                            VALUES (%s, %s, %s, 'Scheduled')
                        """
                        cursor.execute(schedule_insert_query, (flight_id, departure_time, arrival_time))
                        conn.commit()
                        print(f"Created schedule entry for flight_id {flight_id}")
                    else:
                        print(f"Warning: Could not create schedule for flight {flight_id} - missing departure/arrival times")
        except Exception as schedule_error:
            # Log the error but don't fail the flight update
            import traceback
            print(f"Warning: Could not update schedule for flight {flight_id}: {schedule_error}")
            print(traceback.format_exc())
            # Don't rollback the flight update
        
        return jsonify({"message": "Flight updated successfully"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Update Flight Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@admin_flights_bp.route("/<int:flight_id>", methods=["DELETE"])
@admin_required
def delete_flight(flight_id):
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM flights WHERE flight_id = %s", (flight_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Flight not found"}), 404
        
        return jsonify({"message": "Flight deleted successfully"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Delete Flight Error: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": str(e), "details": error_trace}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
