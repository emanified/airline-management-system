# routes/signup_routes.py
import hashlib
import uuid
import jwt
import datetime
from flask import Blueprint, request, jsonify
from connection import get_connection as get_db_connection
from config import SECRET_KEY

signup_bp = Blueprint('signup', __name__)

# --- Hashing Helper Function ---
def hash_password(password):
    """Generates a salted SHA-256 hash of the password."""
    salt = uuid.uuid4().hex
    hashed_password = hashlib.sha256(salt.encode() + password.encode()).hexdigest()
    return f"{salt}:{hashed_password}"

# --- User Registration ---
@signup_bp.route('/api/register', methods=['POST', 'OPTIONS'])
def register_user():
    # Handle OPTIONS preflight request
    if request.method == "OPTIONS":
        return "", 200
    """Handles new user registration using salted SHA-256 hashing."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({'success': False, 'message': 'Database unavailable.'}), 503

    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')

        # Basic validation
        if not username or not password or len(password) < 6 or not email:
            return jsonify({
                'success': False,
                'message': 'Username, email, and password (min 6 chars) are required.'
            }), 400

        cursor = conn.cursor(dictionary=True)

        # Check if username or email already exists
        cursor.execute(
            "SELECT user_id FROM users WHERE username = %s OR email = %s",
            (username, email)
        )
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Username or email already taken.'}), 409

        # Hash the password
        hashed_password_with_salt = hash_password(password)

        # Insert new user
        cursor.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
            (username, email, hashed_password_with_salt)
        )
        conn.commit()

        # Get the new user's ID
        user_id = cursor.lastrowid

        cursor.close()
        conn.close()

        # Generate JWT token for immediate login (optional)
        payload = {
            "user_id": user_id,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=6)
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
        token_str = token if isinstance(token, str) else token.decode()

        return jsonify({
            'success': True,
            'message': 'Registration successful!',
            'token': token_str  # Return token for immediate login
        }), 201

    except Exception as e:
        print(f"Error during registration: {e}")
        if conn and conn.is_connected():
            conn.rollback()
            conn.close()
        return jsonify({'success': False, 'message': 'Internal server error during registration.'}), 500
