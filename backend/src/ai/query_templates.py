"""Deterministic SQL templates for common QStock inventory questions."""

from dataclasses import dataclass
import re


@dataclass(frozen=True)
class TemplateSQL:
    sql: str
    description: str


def maybe_build_template_sql(question: str, history_summary: str = "", last_sql: str = "") -> TemplateSQL | None:
    """Return reliable SQL for common intents before falling back to an LLM."""
    user_question = _extract_user_question(question)
    text = user_question.lower()
    context = f"{history_summary}\n{last_sql}".lower()

    if _asks_inventory_statistics(text):
        return TemplateSQL(
            sql="""SELECT COUNT(*) AS item_records,
       COALESCE(SUM(i.quantity), 0) AS total_quantity,
       COALESCE(SUM(i.available_quantity), 0) AS available_quantity,
       COALESCE(SUM(i.quantity - i.available_quantity), 0) AS unavailable_quantity,
       COUNT(*) FILTER (WHERE i.status = 'available') AS available_records,
       COUNT(*) FILTER (WHERE i.status = 'borrowed') AS borrowed_records,
       COUNT(*) FILTER (WHERE i.status = 'maintenance') AS maintenance_records,
       COUNT(*) FILTER (WHERE i.status = 'retired') AS retired_records
FROM items AS i""",
            description="Inventory summary statistics.",
        )

    if "compare" in text and "inventory" in text:
        return TemplateSQL(
            sql="""SELECT COALESCE(SUM(i.available_quantity), 0) AS current_available_inventory,
       COALESCE(SUM(i.quantity), 0) AS total_inventory,
       COALESCE(SUM(i.quantity - i.available_quantity), 0) AS unavailable_inventory
FROM items AS i""",
            description="Current available inventory compared with total inventory.",
        )

    if "maintenance" in text:
        return TemplateSQL(
            sql="""SELECT COUNT(*) AS maintenance_item_records,
       COALESCE(SUM(i.quantity), 0) AS maintenance_total_quantity
FROM items AS i
WHERE i.status = 'maintenance'""",
            description="Items under maintenance.",
        )

    if "highest" in text and ("categor" in text or "inventory" in text):
        return TemplateSQL(
            sql="""SELECT i.category,
       COALESCE(SUM(i.quantity), 0) AS total_quantity,
       COALESCE(SUM(i.available_quantity), 0) AS available_quantity
FROM items AS i
GROUP BY i.category
ORDER BY total_quantity DESC, i.category
LIMIT 100""",
            description="Inventory totals by category.",
        )

    if "never" in text and "borrow" in text:
        return TemplateSQL(
            sql="""SELECT i.id, i.name, i.item_code, i.brand, i.model, i.quantity, i.available_quantity
FROM items AS i
LEFT JOIN transactions AS t
  ON t.item_id = i.id AND t.status <> 'cancelled'
WHERE t.id IS NULL
ORDER BY i.name
LIMIT 100""",
            description="Items that have never been borrowed.",
        )

    if "overdue" in text and "user" in text:
        return TemplateSQL(
            sql="""SELECT u.id AS user_id, u.full_name, u.email, u.department,
       COUNT(t.id) AS overdue_transaction_count,
       MIN(t.due_date) AS oldest_due_date
FROM transactions AS t
JOIN users AS u ON u.id = t.user_id
WHERE t.returned_at IS NULL
  AND (t.status = 'overdue' OR t.due_date < CURRENT_DATE)
GROUP BY u.id, u.full_name, u.email, u.department
ORDER BY oldest_due_date ASC NULLS LAST, u.full_name
LIMIT 100""",
            description="Users with overdue transactions.",
        )

    if "this month" in text and "borrow" in text and "user" in text:
        return TemplateSQL(
            sql="""SELECT u.id AS user_id, u.full_name, u.email, COUNT(t.id) AS borrow_count,
       COALESCE(SUM(t.quantity), 0) AS quantity_borrowed
FROM transactions AS t
JOIN users AS u ON u.id = t.user_id
WHERE t.borrowed_at >= date_trunc('month', CURRENT_DATE)
  AND t.status <> 'cancelled'
GROUP BY u.id, u.full_name, u.email
ORDER BY borrow_count DESC, u.full_name
LIMIT 100""",
            description="Users who borrowed items this month.",
        )

    if "most borrowed" in text:
        return TemplateSQL(
            sql="""SELECT i.id, i.name, i.item_code, COALESCE(SUM(t.quantity), 0) AS times_borrowed
FROM items AS i
JOIN transactions AS t ON t.item_id = i.id
WHERE t.status <> 'cancelled'
GROUP BY i.id, i.name, i.item_code
ORDER BY times_borrowed DESC, i.name
LIMIT 10""",
            description="Most borrowed items.",
        )

    if "lowest" in text and ("stock" in text or "inventory" in text):
        return TemplateSQL(
            sql="""SELECT i.id, i.name, i.item_code, i.brand, i.model, i.available_quantity, i.quantity
FROM items AS i
WHERE i.status <> 'retired'
ORDER BY i.available_quantity ASC, i.name
LIMIT 10""",
            description="Items with the lowest available stock.",
        )

    if _asks_electronics_low_stock(text):
        threshold = _extract_number(text) or 5
        return TemplateSQL(
            sql=f"""SELECT i.id, i.name, i.item_code, i.brand, i.model, i.available_quantity, i.location
FROM items AS i
WHERE i.category = 'electronics'
  AND i.available_quantity < {threshold}
ORDER BY i.available_quantity ASC, i.name
LIMIT 100""",
            description="Electronics below the requested available quantity threshold.",
        )

    if _asks_current_holder(text):
        item_name = _extract_after_has(text) or _extract_named_item(user_question)
        if item_name:
            return TemplateSQL(
                sql=f"""SELECT u.id AS user_id, u.full_name, u.email, u.department,
       i.name AS item_name, t.quantity, t.borrowed_at, t.due_date, t.status
FROM transactions AS t
JOIN users AS u ON u.id = t.user_id
JOIN items AS i ON i.id = t.item_id
WHERE t.returned_at IS NULL
  AND t.status IN ('borrowed', 'overdue')
  AND i.name ILIKE '%{_escape_like_literal(item_name)}%'
ORDER BY t.borrowed_at DESC
LIMIT 100""",
                description="Current holder for the requested item.",
            )

    if _is_laptop_query(text, context):
        brand = _extract_brand(text) or (_extract_brand(context) if _is_follow_up(text) else "")
        available_only = _asks_available(text) or (_is_follow_up(text) and "available" in text)
        count_only = _asks_count(text)
        return _laptop_sql(brand=brand, available_only=available_only, count_only=count_only)

    return None


def _extract_user_question(question: str) -> str:
    match = re.search(r"User Question:\s*(.+)", question, flags=re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else question.strip()


def _asks_inventory_statistics(text: str) -> bool:
    return "inventory statistics" in text or "inventory stats" in text or text.strip() in {"stats", "statistics"}


def _asks_electronics_low_stock(text: str) -> bool:
    return "electronics" in text and any(term in text for term in ("less than", "under", "below", "low"))


def _asks_current_holder(text: str) -> bool:
    return "who" in text and ("has" in text or "currently" in text)


def _is_laptop_query(text: str, context: str) -> bool:
    laptop_terms = ("laptop", "notebook", "computer", "pc", "desktop")
    return any(term in text for term in laptop_terms) or (_is_follow_up(text) and any(term in context for term in laptop_terms))


def _is_follow_up(text: str) -> bool:
    return any(term in text for term in ("only", "ones", "those", "them", "which are", "available"))


def _asks_available(text: str) -> bool:
    return any(term in text for term in ("available", "in stock", "left"))


def _asks_count(text: str) -> bool:
    return "how many" in text or "count" in text


def _extract_brand(text: str) -> str:
    for brand in ("dell", "hp", "apple", "lenovo", "acer", "asus", "microsoft"):
        if re.search(rf"\b{brand}\b", text, flags=re.IGNORECASE):
            return brand.title()
    return ""


def _extract_number(text: str) -> int | None:
    words = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}
    digit = re.search(r"\b(\d+)\b", text)
    if digit:
        return int(digit.group(1))
    for word, value in words.items():
        if re.search(rf"\b{word}\b", text):
            return value
    return None


def _extract_after_has(text: str) -> str:
    match = re.search(r"has\s+(.+?)\??$", text, flags=re.IGNORECASE)
    return match.group(1).strip() if match else ""


def _extract_named_item(text: str) -> str:
    match = re.search(r"(?:item|laptop|notebook|computer)\s+([A-Za-z0-9_-]+)", text, flags=re.IGNORECASE)
    if not match:
        return ""
    return match.group(0).strip()


def _escape_like_literal(value: str) -> str:
    return value.replace("'", "''").replace("%", "\\%").replace("_", "\\_")


def _laptop_sql(brand: str = "", available_only: bool = False, count_only: bool = False) -> TemplateSQL:
    brand_filter = f"\n  AND i.brand ILIKE '%{_escape_like_literal(brand)}%'" if brand else ""
    available_filter = "\n  AND i.status = 'available'\n  AND i.available_quantity > 0" if available_only else ""
    laptop_filter = """(
    i.name ILIKE '%laptop%' OR i.name ILIKE '%notebook%' OR
    i.description ILIKE '%laptop%' OR i.description ILIKE '%notebook%' OR
    i.model ILIKE '%laptop%' OR i.model ILIKE '%notebook%'
  )"""

    if count_only:
        label = f"{brand.lower()}_laptops" if brand else "laptops"
        return TemplateSQL(
            sql=f"""SELECT COALESCE(SUM(i.quantity), 0) AS total_{label},
       COALESCE(SUM(i.available_quantity), 0) AS available_{label}
FROM items AS i
WHERE {laptop_filter}{brand_filter}""",
            description="Laptop inventory counts.",
        )

    return TemplateSQL(
        sql=f"""SELECT i.id, i.name, i.item_code, i.brand, i.model, i.available_quantity, i.location
FROM items AS i
WHERE {laptop_filter}{brand_filter}{available_filter}
ORDER BY i.name
LIMIT 100""",
        description="Laptop inventory listing.",
    )
