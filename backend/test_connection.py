# test_connection.py
# Run this script to test your MySQL connection
import sys
from connection import get_connection

def test_connection():
    try:
        print("Attempting to connect to MySQL...")
        conn = get_connection()
        if conn.is_connected():
            print("✅ Successfully connected to MySQL!")
            cursor = conn.cursor()
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"MySQL Server Version: {version[0]}")
            cursor.close()
            conn.close()
            return True
        else:
            print("❌ Connection failed: Not connected")
            return False
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\nTroubleshooting steps:")
        print("1. Make sure MySQL service is running (check Services.msc)")
        print("2. Verify your MySQL credentials in config.py")
        print("3. Check if MySQL is running on port 3306")
        return False

if __name__ == "__main__":
    test_connection()

