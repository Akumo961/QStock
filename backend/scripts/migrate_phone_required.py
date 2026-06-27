"""
One-time migration: make users.phone mandatory.

Run this ONCE against your database after deploying the updated code
(the code already requires phone at the application level — this script
brings the database constraint in line with that).

Usage:
    cd backend
    python scripts/migrate_phone_required.py

Safe to run more than once by accident: it checks the column's current
state first and does nothing if the constraint is already in place.

What it does:
    1. Finds any existing user with phone IS NULL or phone = ''
    2. Sets those rows to the placeholder 'UPDATE_REQUIRED' so you can
       find and follow up with them later:
           SELECT id, email, full_name FROM users WHERE phone = 'UPDATE_REQUIRED';
    3. Adds the NOT NULL constraint on users.phone

Uses the same DATABASE_URL your app already reads from .env — there is
nothing to configure here.
"""

import sys
from pathlib import Path

# Allow running this script directly (python scripts/migrate_phone_required.py)
# from the backend/ directory without needing the package installed.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine, text

from src.core.config import settings

PLACEHOLDER = "UPDATE_REQUIRED"


def main() -> None:
    engine = create_engine(settings.DATABASE_URL)

    with engine.begin() as conn:
        # 1. Check current state — idempotent, so re-running this script
        #    safely does nothing if the constraint is already applied.
        is_nullable = conn.execute(
            text(
                "SELECT is_nullable FROM information_schema.columns "
                "WHERE table_name = 'users' AND column_name = 'phone'"
            )
        ).scalar()

        if is_nullable is None:
            print("ERROR: could not find users.phone column. Is the database set up?")
            sys.exit(1)

        if is_nullable == "NO":
            print("Nothing to do — users.phone is already NOT NULL.")
            return

        # 2. Backfill any missing phone numbers.
        result = conn.execute(
            text(
                "UPDATE users SET phone = :placeholder "
                "WHERE phone IS NULL OR phone = ''"
            ),
            {"placeholder": PLACEHOLDER},
        )
        print(f"Backfilled {result.rowcount} user(s) with a missing phone number.")
        if result.rowcount:
            print(
                f"  -> Find them later with: "
                f"SELECT id, email, full_name FROM users WHERE phone = '{PLACEHOLDER}';"
            )

        # 3. Apply the constraint.
        conn.execute(text("ALTER TABLE users ALTER COLUMN phone SET NOT NULL"))
        print("users.phone is now NOT NULL. Done.")


if __name__ == "__main__":
    main()
