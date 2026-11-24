# How to Install Python Dependencies

## Error: `ModuleNotFoundError: No module named 'mysql'`

This error occurs because the required Python packages are not installed. Follow these steps to fix it:

---

## Method 1: Install All Requirements (Recommended) ✅

### Step 1: Open Terminal/Command Prompt
Navigate to the `backend` directory:
```bash
cd D:\AirlineProject\backend
```

### Step 2: Install Dependencies
Choose one of these commands based on your Python setup:

**Option A: Using `pip`**
```bash
pip install -r requirements.txt
```

**Option B: Using `python -m pip`**
```bash
python -m pip install -r requirements.txt
```

**Option C: Using `py` launcher (Windows)**
```bash
py -m pip install -r requirements.txt
```

**Option D: Using `python3`**
```bash
python3 -m pip install -r requirements.txt
```

---

## Method 2: Install Individual Packages

If the above doesn't work, install each package individually:

```bash
pip install Flask==2.3.2
pip install flask-cors==3.0.10
pip install mysql-connector-python==8.1.0
pip install PyJWT==2.8.0
pip install Werkzeug==2.3.6
```

Or using `python -m pip`:
```bash
python -m pip install Flask==2.3.2
python -m pip install flask-cors==3.0.10
python -m pip install mysql-connector-python==8.1.0
python -m pip install PyJWT==2.8.0
python -m pip install Werkzeug==2.3.6
```

---

## Method 3: Using Virtual Environment (Best Practice)

### Step 1: Create Virtual Environment
```bash
cd D:\AirlineProject\backend
python -m venv venv
```

### Step 2: Activate Virtual Environment

**Windows PowerShell:**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows Command Prompt:**
```cmd
venv\Scripts\activate.bat
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

---

## Verify Installation

After installing, verify the packages are installed:

```bash
python -c "import mysql.connector; print('mysql-connector-python: OK')"
python -c "import flask; print('Flask: OK')"
python -c "from werkzeug.security import generate_password_hash; print('Werkzeug: OK')"
```

---

## Troubleshooting

### Error: "pip is not recognized"
- Use `python -m pip` instead of just `pip`
- Or use `py -m pip` on Windows

### Error: "Python was not found"
- Make sure Python is installed
- Add Python to your system PATH
- Or use the full path to Python: `C:\Python\python.exe -m pip install ...`

### Error: "Permission denied"
- On Windows: Run Command Prompt as Administrator
- Or use `--user` flag: `pip install --user -r requirements.txt`

### Error: "No module named 'mysql'" after installation
- Make sure you're using the same Python interpreter
- Try: `python -m pip install --upgrade mysql-connector-python`
- Verify: `python -c "import mysql.connector; print(mysql.connector.__version__)"`

---

## Required Packages

Your `requirements.txt` contains:
- **Flask==2.3.2** - Web framework
- **flask-cors==3.0.10** - CORS support
- **mysql-connector-python==8.1.0** - MySQL database connector ⚠️ **This is the missing one!**
- **PyJWT==2.8.0** - JWT token handling
- **Werkzeug==2.3.6** - Password hashing utilities

---

## Quick Fix (Just MySQL Connector)

If you only need to fix the immediate error, install just the MySQL connector:

```bash
python -m pip install mysql-connector-python
```

Or:
```bash
pip install mysql-connector-python
```

---

## After Installation

Once installed, you should be able to run:
```bash
python create_admin.py
```

Or:
```bash
python add_admin.py
```

---

**Need Help?** Make sure Python is installed and in your PATH. You can check by running:
```bash
python --version
```
