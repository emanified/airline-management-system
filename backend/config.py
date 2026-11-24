# config.py
import os

try:  # optional: load backend/.env if python-dotenv is installed
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Used for signing JWTs. Set SECRET_KEY in your environment or backend/.env.
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-change-me")

# MySQL settings - set DB_PASSWORD (and others if needed) in your environment or backend/.env.
DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "127.0.0.1"),
    "user": os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "database": os.environ.get("DB_NAME", "airline"),
    "port": int(os.environ.get("DB_PORT", 3306)),
}
