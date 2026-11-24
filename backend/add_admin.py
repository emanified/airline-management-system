#!/usr/bin/env python3
"""
Add Admin User Script
=====================
Interactive script to add new admin users to the Aether Airlines system.

Usage:
    python add_admin.py
    python add_admin.py --username admin_name --password admin_pass
    python add_admin.py -u admin_name -p admin_pass
"""

import sys
import getpass
import argparse
from connection import get_connection as get_db_connection
from werkzeug.security import generate_password_hash

def add_admin(username, password):
    """
    Add a new admin user to the database.
    
    Args:
        username (str): Admin username
        password (str): Admin password (will be hashed)
    
    Returns:
        bool: True if successful, False otherwise
    """
    if not username or not password:
        print("❌ Error: Username and password cannot be empty.")
        return False
    
    if len(password) < 6:
        print("❌ Error: Password must be at least 6 characters long.")
        return False
    
    # Generate password hash
    password_hash = generate_password_hash(password)
    
    conn = get_db_connection()
    if conn is None:
        print("❌ Error: Could not connect to database.")
        return False
    
    cursor = conn.cursor()
    try:
        # Check if username already exists
        cursor.execute(
            "SELECT admin_id FROM admin_users WHERE username = %s",
            (username,)
        )
        if cursor.fetchone():
            print(f"❌ Error: Username '{username}' already exists.")
            return False
        
        # Insert new admin
        cursor.execute(
            "INSERT INTO admin_users (username, password_hash) VALUES (%s, %s)",
            (username, password_hash)
        )
        conn.commit()
        
        admin_id = cursor.lastrowid
        print(f"✅ Admin user '{username}' created successfully!")
        print(f"   Admin ID: {admin_id}")
        print(f"   Username: {username}")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error creating admin: {e}")
        return False
    finally:
        cursor.close()
        conn.close()


def interactive_mode():
    """Interactive mode - prompts user for input."""
    print("=" * 50)
    print("Aether Airlines - Add Admin User")
    print("=" * 50)
    print()
    
    username = input("Enter admin username: ").strip()
    if not username:
        print("❌ Username cannot be empty.")
        return
    
    password = getpass.getpass("Enter admin password (will be hidden): ").strip()
    if not password:
        print("❌ Password cannot be empty.")
        return
    
    confirm_password = getpass.getpass("Confirm password: ").strip()
    if password != confirm_password:
        print("❌ Passwords do not match.")
        return
    
    print()
    add_admin(username, password)


def main():
    """Main function - handles command line arguments."""
    parser = argparse.ArgumentParser(
        description='Add a new admin user to Aether Airlines system',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python add_admin.py                    # Interactive mode
  python add_admin.py -u admin -p pass123
  python add_admin.py --username admin --password pass123
        """
    )
    
    parser.add_argument(
        '-u', '--username',
        type=str,
        help='Admin username'
    )
    
    parser.add_argument(
        '-p', '--password',
        type=str,
        help='Admin password'
    )
    
    args = parser.parse_args()
    
    # If username/password provided, use them; otherwise interactive mode
    if args.username and args.password:
        add_admin(args.username, args.password)
    elif args.username or args.password:
        print("❌ Error: Both username and password must be provided.")
        print("   Use: python add_admin.py -u username -p password")
        sys.exit(1)
    else:
        interactive_mode()


if __name__ == "__main__":
    main()
