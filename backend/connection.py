# connection.py
import mysql.connector
from mysql.connector import Error
from config import DB_CONFIG

def get_connection():
    """
    Returns a new connection to the MySQL database using DB_CONFIG.
    Safe for per-request use.
    """
    try:
        conn = mysql.connector.connect(
            host=DB_CONFIG["host"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            database=DB_CONFIG["database"],
            port=DB_CONFIG.get("port", 3306),  # default port if not specified
        )
        return conn
    except Error as e:
        # Log or raise for debugging
        raise ConnectionError(f"Database connection failed: {e}")

def get_cursor(dictionary=True):
    """
    Helper to get a cursor from a new connection.
    Returns (connection, cursor)
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=dictionary)
    return conn, cursor
