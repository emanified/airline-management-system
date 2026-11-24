from werkzeug.security import generate_password_hash
import mysql.connector

# Password you want for admin login
password = "admin123"

hashed = generate_password_hash(password)
print("Generated Hash:", hashed)

conn = mysql.connector.connect(
    host="127.0.0.1",
    user="root",
    password=os.environ.get("DB_PASSWORD", ""),
    database="airline"
)

cursor = conn.cursor()

cursor.execute("""
    UPDATE admin_users
    SET username='admin', password_hash=%s
    WHERE admin_id=4
""", (hashed,))

conn.commit()
cursor.close()
conn.close()

print("Admin password updated successfully!")
