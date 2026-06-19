"""
Run this ONCE from QStock/backend with venv active:
    python fix_requests.py
"""
import sys
sys.path.insert(0, 'src')

from src.core.database import engine, Base, SessionLocal
from src.core.config import settings
import psycopg2
from urllib.parse import urlparse

url = urlparse(settings.DATABASE_URL)
conn = psycopg2.connect(
    dbname=url.path.lstrip("/"),
    user=url.username or "postgres",
    password=url.password or "",
    host=url.hostname or "localhost",
    port=url.port or 5432,
)
conn.autocommit = True
cur = conn.cursor()

# Check if requests table exists
cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'requests')")
exists = cur.fetchone()[0]

if not exists:
    print("Creating requests table...")
    cur.execute("""
        CREATE TABLE requests (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
            request_type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            priority VARCHAR(20) NOT NULL DEFAULT 'normal',
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            admin_response TEXT,
            responded_by_admin_id INTEGER REFERENCES users(id),
            responded_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    print("✅ requests table created")
else:
    print("✅ requests table already exists")

# Verify
cur.execute("SELECT COUNT(*) FROM requests")
count = cur.fetchone()[0]
print(f"✅ requests table has {count} rows — ready!")

cur.close()
conn.close()
