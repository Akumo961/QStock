"""
sql_guard.py

Validates LLM-generated SQL before it is ever sent to the database.

Rules enforced
--------------
1. Only SELECT statements are allowed.
2. Banned keywords: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE.
3. Multiple statements (semicolons not at the very end) are rejected.
4. Empty / whitespace-only queries are rejected.

The guard works on the *raw* SQL string returned by the LLM, before any
execution attempt.  It is intentionally conservative: when in doubt, reject.
"""

import re
from typing import Tuple


# ---------------------------------------------------------------------------
# Banned keyword patterns
# ---------------------------------------------------------------------------

_BANNED_KEYWORDS: list[str] = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "TRUNCATE",
    "CREATE",
    "GRANT",
    "REVOKE",
]

# Build a single compiled regex that catches any banned keyword used as a
# SQL token (surrounded by word boundaries so e.g. "created_at" is fine).
_BANNED_RE = re.compile(
    r"\b(?:" + "|".join(_BANNED_KEYWORDS) + r")\b",
    re.IGNORECASE,
)

# Multiple-statement detector: semicolons that are NOT at the very end of the
# trimmed string indicate a second statement.
_MULTI_STMT_RE = re.compile(r";(?!\s*$)")


def validate_sql(sql: str) -> Tuple[bool, str]:
    """
    Validate a SQL string.

    Returns
    -------
    (True, cleaned_sql)   — safe to execute
    (False, reason)       — must NOT be executed
    """
    if not sql or not sql.strip():
        return False, "Empty SQL query."

    cleaned = sql.strip()

    # ---- 1. Must start with SELECT ----------------------------------------
    first_token = cleaned.split()[0].upper()
    if first_token != "SELECT":
        return False, f"Only SELECT queries are allowed. Got: {first_token!r}."

    # ---- 2. No banned keywords --------------------------------------------
    match = _BANNED_RE.search(cleaned)
    if match:
        return False, f"Forbidden keyword detected: {match.group().upper()!r}."

    # ---- 3. No multiple statements ----------------------------------------
    if _MULTI_STMT_RE.search(cleaned):
        return False, "Multiple SQL statements are not allowed."

    # ---- 4. Strip trailing semicolon for safety ---------------------------
    cleaned = cleaned.rstrip(";").strip()

    return True, cleaned