import os
import sys

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask
from config import Config
from database import db
import models

def init_database():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    with app.app_context():
        print(f"Creating database tables in {app.config['SQLALCHEMY_DATABASE_URI']}...")
        db.create_all()
        print("Database tables created successfully.")

if __name__ == '__main__':
    init_database()
