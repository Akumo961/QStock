"""
migrate_orders.py — Run ONCE from QStock/backend with venv active:
    python migrate_orders.py

Adds needed_date, ready_date columns to requests table.
Creates orders indexes. Safe to run multiple times.
"""
import sys
sys.path.insert(0, 'src')
from src.core.config import settings
import psycopg2
from urllib.parse import urlparse

url = urlparse(settings.DATABASE_URL)
conn = psycopg2.connect(
    dbname=url.path.lstrip("/"), user=url.username or "postgres",
    password=url.password or "", host=url.hostname or "localhost",
    port=url.port or 5432,
)
conn.autocommit = True
cur = conn.cursor()

def col_exists(table, col):
    cur.execute("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name=%s AND column_name=%s)", (table, col))
    return cur.fetchone()[0]

def table_exists(table):
    cur.execute("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name=%s)", (table,))
    return cur.fetchone()[0]

print("=" * 50)
print("Orders / QR workflow migration")
print("=" * 50)

if not table_exists("requests"):
    cur.execute("""
        CREATE TABLE requests (
            id                    SERIAL PRIMARY KEY,
            user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            item_id               INTEGER REFERENCES items(id) ON DELETE SET NULL,
            request_type          VARCHAR(50),
            order_type            VARCHAR(50) NOT NULL DEFAULT 'other',
            title                 VARCHAR(255) NOT NULL DEFAULT 'Order',
            description           TEXT NOT NULL DEFAULT '',
            priority              VARCHAR(20) DEFAULT 'normal',
            status                VARCHAR(20) NOT NULL DEFAULT 'pending',
            needed_date           TIMESTAMPTZ,
            ready_date            TIMESTAMPTZ,
            admin_response        TEXT,
            responded_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            responded_at          TIMESTAMPTZ,
            created_at            TIMESTAMPTZ DEFAULT NOW(),
            updated_at            TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    print("✅ requests table created")
else:
    print("✅ requests table exists")
    new_cols = [
        ("order_type",  "VARCHAR(50) DEFAULT 'other'"),
        ("title",       "VARCHAR(255) DEFAULT 'Order'"),
        ("needed_date", "TIMESTAMPTZ"),
        ("ready_date",  "TIMESTAMPTZ"),
    ]
    for col, defn in new_cols:
        if not col_exists("requests", col):
            cur.execute(f"ALTER TABLE requests ADD COLUMN {col} {defn}")
            print(f"✅ Added: {col}")
        else:
            print(f"   Exists: {col}")

    # Sync order_type from request_type for existing rows
    cur.execute("UPDATE requests SET order_type = request_type WHERE order_type IS NULL AND request_type IS NOT NULL")
    print(f"✅ Synced order_type from request_type ({cur.rowcount} rows)")

    # Normalise status values
    cur.execute("UPDATE requests SET status = LOWER(status) WHERE status != LOWER(status)")
    if cur.rowcount: print(f"✅ Normalised {cur.rowcount} status values")

# Indexes
for name, sql in [
    ("idx_requests_user_status",  "CREATE INDEX IF NOT EXISTS idx_requests_user_status ON requests(user_id, status)"),
    ("idx_requests_status",       "CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status)"),
    ("idx_requests_order_type",   "CREATE INDEX IF NOT EXISTS idx_requests_order_type ON requests(order_type)"),
]:
    cur.execute(sql); print(f"✅ Index: {name}")

# Summary
cur.execute("SELECT status, COUNT(*) FROM requests GROUP BY status ORDER BY status")
rows = cur.fetchall()
if rows:
    print("\nCurrent order statuses:")
    for s, c in rows: print(f"  {s}: {c}")

cur.close(); conn.close()
print("\n✅ Migration complete. Restart backend.")
