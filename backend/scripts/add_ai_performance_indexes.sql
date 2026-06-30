-- QStock AI ChatBot performance indexes
-- Run once against your real database:  psql -d qstock -f add_ai_performance_indexes.sql
--
-- Why these and not others: every deterministic SQL template filters on one
-- of these columns. EXPLAIN ANALYZE on the seed dataset (5 rows) shows
-- Seq Scans today (see report) — invisible at 5 rows, but these are exactly
-- the columns that will matter once your real items/transactions tables grow
-- past a few hundred rows, which is well within reach for a school/org
-- inventory system over a year or two of use.
--
-- All indexes are partial/targeted, not blanket "index everything" — each
-- one matches a real WHERE clause already in query_templates.py.

-- items.category — used by every "Show electronics/school_items/..." template
CREATE INDEX IF NOT EXISTS ix_items_category ON items (category);

-- items.status — used by "available items", "maintenance items", statistics
CREATE INDEX IF NOT EXISTS ix_items_status ON items (status);

-- Composite for the single most common template: available items
-- (WHERE status = 'available' AND available_quantity > 0)
CREATE INDEX IF NOT EXISTS ix_items_status_available_qty
    ON items (status, available_quantity)
    WHERE status = 'available';

-- items.location — used by the new generic item+location template
CREATE INDEX IF NOT EXISTS ix_items_location ON items (location);

-- items.brand — used by brand-filtered queries (Dell/HP/etc.)
CREATE INDEX IF NOT EXISTS ix_items_brand ON items (brand);

-- transactions.status — used by overdue/borrowed templates
CREATE INDEX IF NOT EXISTS ix_transactions_status ON transactions (status);

-- transactions.returned_at — used by every "currently borrowed/overdue" query
-- (partial index: only rows that are NOT yet returned are ever queried by
-- these templates, so indexing only those rows keeps the index small)
CREATE INDEX IF NOT EXISTS ix_transactions_returned_at_null
    ON transactions (due_date)
    WHERE returned_at IS NULL;

-- transactions.borrowed_at — used by "this month" / date_trunc templates
CREATE INDEX IF NOT EXISTS ix_transactions_borrowed_at ON transactions (borrowed_at);

ANALYZE items;
ANALYZE transactions;