"""
Run this ONCE to create the requests table if it doesn't exist.
Usage (from QStock/backend with venv active):
    python create_requests_table.py
"""
import sys
sys.path.insert(0, 'src')

from src.core.database import engine, Base
from src.models.transaction import Request  # ensures model is registered
from src.models import *  # load all models

# Create only missing tables (safe to run multiple times)
Base.metadata.create_all(bind=engine)
print("✅ All tables created/verified — requests table is ready.")
