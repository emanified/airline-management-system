# app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from config import SECRET_KEY

# --- Admin Blueprints ---
from routes.crew_routes import crew_bp
from routes.operations_routes import operations_bp
from routes.reports_routes import reports_bp
from routes.schedule_routes import schedule_bp
from routes.admin_routes import admin_bp
from routes.flights_routes import admin_flights_bp
from routes.userflights_routes import user_flights_bp
from routes.userinfo_routes import userinfo_bp

# --- User Blueprints ---
from routes.signup_routes import signup_bp
from routes.user_routes import user_bp
from routes.login_routes import login_bp
from routes.bookings_routes import bookings_bp
from routes.payment_routes import payment_bp


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = SECRET_KEY

    # ✅ Enable CORS for frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True, allow_headers=["Content-Type", "Authorization"])
    # Also allow payment routes if they're at root level (backup)
    CORS(app, resources={r"/payment/*": {"origins": "*"}}, supports_credentials=True)

    # --- Register Admin Blueprints ---
    app.register_blueprint(crew_bp)          # /api/crew
    app.register_blueprint(operations_bp)    # /api/operations
    app.register_blueprint(reports_bp)       # /api/reports
    app.register_blueprint(schedule_bp)      # /api/schedules
    app.register_blueprint(admin_bp)         # /api/admin
    app.register_blueprint(admin_flights_bp)
    app.register_blueprint(userinfo_bp)      # /api/users

    # --- Register User Blueprints ---
    app.register_blueprint(signup_bp)        # /api/register
    app.register_blueprint(user_bp)          # /api/user
    app.register_blueprint(login_bp)         # /api/login
    app.register_blueprint(bookings_bp)      # /api/bookings
    app.register_blueprint(user_flights_bp)
    app.register_blueprint(payment_bp)       # /api/payment

    # --- Handle preflight OPTIONS requests ---
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = jsonify({})
            response.headers.add("Access-Control-Allow-Origin", "*")
            response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
            response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            return response, 200

    # --- Default Route ---
    @app.route("/")
    def index():
        return jsonify({"message": "Airline Flask API running"}), 200
    
    # --- Debug Route: List all registered routes ---
    @app.route("/debug/routes", methods=["GET"])
    def list_routes():
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                "endpoint": rule.endpoint,
                "methods": list(rule.methods),
                "path": rule.rule
            })
        return jsonify({"routes": routes}), 200

    # --- Error Handlers ---
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "message": "API endpoint not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"success": False, "message": "Internal server error"}), 500

    return app


# --- Run Server ---
if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5001)