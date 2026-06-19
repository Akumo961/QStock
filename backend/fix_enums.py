"""
fix_enums.py — Run this ONCE to fix the PostgreSQL enum type mismatch.
Usage (from QStock/backend folder with venv active):
    python fix_enums.py
"""
import sys

# Read DB URL from your app config
sys.path.insert(0, "src")
try:
    from src.core.config import settings
    DATABASE_URL = settings.DATABASE_URL
except Exception:
    DATABASE_URL = "postgresql://postgres@localhost:3016/qr_inventory"

print(f"Connecting to: {DATABASE_URL}")

try:
    import psycopg2
except ImportError:
    print("Installing psycopg2...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2

from urllib.parse import urlparse

url = urlparse(DATABASE_URL)
conn = psycopg2.connect(
    dbname=url.path.lstrip("/"),
    user=url.username or "postgres",
    password=url.password or "",
    host=url.hostname or "localhost",
    port=url.port or 5432,
)
conn.autocommit = False
cur = conn.cursor()

steps = [
    ("Converting items.status to VARCHAR",
     "ALTER TABLE items ALTER COLUMN status TYPE VARCHAR(50) USING lower(status::text)"),
    ("Converting items.category to VARCHAR",
     "ALTER TABLE items ALTER COLUMN category TYPE VARCHAR(50) USING lower(category::text)"),
    ("Converting transactions.status to VARCHAR",
     "ALTER TABLE transactions ALTER COLUMN status TYPE VARCHAR(50) USING lower(status::text)"),
    ("Dropping PG type itemstatus",
     "DROP TYPE IF EXISTS itemstatus"),
    ("Dropping PG type itemcategory",
     "DROP TYPE IF EXISTS itemcategory"),
    ("Dropping PG type transactionstatus",
     "DROP TYPE IF EXISTS transactionstatus"),
]

for label, sql in steps:
    try:
        print(f"  {label}...", end=" ")
        cur.execute(sql)
        print("✅")
    except Exception as e:
        print(f"⚠️  skipped ({e})")
        conn.rollback()
        conn.autocommit = False

conn.commit()

# Verify
cur.execute("SELECT DISTINCT status FROM items")
print("\nitems.status values now:", [r[0] for r in cur.fetchall()])
cur.execute("SELECT DISTINCT category FROM items")
print("items.category values now:", [r[0] for r in cur.fetchall()])

cur.close()
conn.close()
print("\n✅ Done. Restart your backend.")