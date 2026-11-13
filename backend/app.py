import os
from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from database import db
import models

# Import blueprints
from routes.auth_routes import auth_bp
from routes.validation_routes import validation_bp
from routes.report_routes import report_bp
from routes.handler_routes import handler_bp
from routes.routing_routes import routing_bp
from routes.queue_routes import queue_bp
from routes.simulation_routes import simulation_bp
from routes.analytics_routes import analytics_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for frontend Vite development server (default port 5173 / localhost)
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize database
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(validation_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(handler_bp)
    app.register_blueprint(routing_bp)
    app.register_blueprint(queue_bp)
    app.register_blueprint(simulation_bp)
    app.register_blueprint(analytics_bp)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'application': 'PATHFLOW - Pathology Lab Result Notifier',
            'version': '1.0.0',
            'modules': ['BCS503_Automata', 'BCS502_ComputerNetworks', 'SQLite_Persistence']
        }), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting PATHFLOW Backend on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
