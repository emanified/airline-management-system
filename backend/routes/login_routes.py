# routes/login_routes.py
import hashlib
import jwt
import datetime
from flask import Blueprint, request, jsonify
from connection import get_connection as get_db_connection
from config import SECRET_KEY

login_bp = Blueprint("login_bp", __name__)

# --- Password Verification Helper ---
def verify_password(stored_hash, provided_password):
    """
    Verify a password against the stored salted SHA-256 hash.
    Format stored_hash = salt:hash
    """
    try:
        salt, hash_val = stored_hash.split(":")
        test_hash = hashlib.sha256(salt.encode() + provided_password.encode()).hexdigest()
        return test_hash == hash_val
    except Exception:
        return False

# --- User Login ---
@login_bp.route("/api/login", methods=["POST", "OPTIONS"])
def user_login():
    # Handle OPTIONS preflight request
    if request.method == "OPTIONS":
        return "", 200
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database unavailable"}), 503

    try:
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"success": False, "message": "Username and password required"}), 400

        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT user_id, password_hash FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()

        if not user or not verify_password(user["password_hash"], password):
            cursor.close()
            conn.close()
            return jsonify({"success": False, "message": "Invalid credentials"}), 401

        # Generate JWT token
        payload = {
            "user_id": user["user_id"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=6)
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
        token_str = token if isinstance(token, str) else token.decode()

        cursor.close()
        conn.close()

        return jsonify({
         "success": True,
         "message": "Login successful",
         "token": token_str,
         "user_id": user["user_id"]   
            }), 200


    except Exception as e:
        print("Login error:", e)
        if conn and conn.is_connected():
            conn.close()
        return jsonify({"success": False, "message": "Internal server error"}), 500
