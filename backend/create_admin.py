# admin.py
import getpass
from connection import get_connection
from werkzeug.security import generate_password_hash

def create_admin():
    username = input("Enter admin username: ").strip()
    password = getpass.getpass("Enter admin password (will be hidden): ").strip()
    if not username or not password:
        print("Username and password cannot be empty.")
        return

    password_hash = generate_password_hash(password)

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO admin_users (username, password_hash) VALUES (%s,%s)",
            (username, password_hash),
        )
        conn.commit()
        print("Admin user created successfully.")
    except Exception as e:
        print("Error creating admin:", e)
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    create_admin()
