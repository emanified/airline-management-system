# routes/admin/userinfo_routes.py
from flask import Blueprint, request, jsonify
from connection import get_connection as get_db_connection
from .admin_routes import admin_required

userinfo_bp = Blueprint("userinfo_bp", __name__, url_prefix="/api/users")

# ==========================
# 1️⃣ GET ALL USERS
# ==========================
@userinfo_bp.route("/", methods=["GET"])
@admin_required
def get_admin_users():
    """
    Admin dashboard: fetch all users
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT user_id, username, email, created_at
            FROM users
            ORDER BY user_id DESC
        """)
        users = cursor.fetchall()
        return jsonify(users), 200
    finally:
        cursor.close()
        conn.close()


# ==========================
# 2️⃣ GET SINGLE USER DETAILS
# ==========================
@userinfo_bp.route("/<int:user_id>", methods=["GET"])
@admin_required
def get_admin_user(user_id):
    """
    Admin dashboard: get detailed info about a single user
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT user_id, username, email, phone, cnic, created_at
            FROM users
            WHERE user_id = %s
        """, (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(user), 200
    finally:
        cursor.close()
        conn.close()


# ==========================
# 3️⃣ DELETE USER
# ==========================
@userinfo_bp.route("/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_admin_user(user_id):
    """
    Admin dashboard: delete a user
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"message": f"User {user_id} deleted successfully"}), 200
    finally:
        cursor.close()
        conn.close()
