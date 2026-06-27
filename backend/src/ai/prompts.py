"""
Prompt builder for QStock's AI assistant.

This module owns all LLM-facing instructions. The service layer should pass
business context in and receive plain prompt strings back; SQL generation,
validation, execution, and answer synthesis live in their own modules.
"""

from datetime import date
from typing import Iterable, Optional


SCHEMA_DESCRIPTION = """
TABLE items
-------------
Purpose: one row per inventory item type or asset record.
Primary key: items.id
Columns:
- id: integer primary key
- name: item name shown to users, e.g. "Laptop A", "Dell Latitude"
- description: optional free-text item description
- item_code: unique inventory code/barcode-like identifier
- category: one of electronics, school_items, decorations, clothes, games, other
- status: item lifecycle/status: available, borrowed, maintenance, retired
- quantity: total quantity owned by the organization
- available_quantity: quantity currently available to borrow/use
- brand: manufacturer/vendor, e.g. Dell, HP, Apple
- model: model name/number, e.g. Latitude 5420
- serial_number: unique serial number when tracked
- location: where the item is stored
- is_borrowable: whether users can borrow this item
- requires_approval: whether borrowing needs admin approval
- max_borrow_days: usual borrow duration
- purchase_date: stored as text, not a date column
- notes: internal notes
- image_url: optional display image URL
- created_at, updated_at: timezone-aware timestamps

TABLE users
-------------
Purpose: employees/users who can borrow items or make requests.
Primary key: users.id
Columns safe for AI queries:
- id: integer primary key
- full_name: user's display name
- email: user's email address
- department: optional department
- phone: phone number
- employee_id: optional employee identifier
- is_active: account active flag
- is_admin: admin permission flag
- created_at, updated_at: timezone-aware timestamps
Restricted columns: hashed_password, qr_code_data, qr_code_image

TABLE transactions
-------------
Purpose: borrow/return history. A currently borrowed item usually has a row
where transactions.status = 'borrowed' and returned_at IS NULL.
Primary key: transactions.id
Foreign keys:
- transactions.user_id -> users.id
- transactions.item_id -> items.id
- transactions.approved_by_admin_id -> users.id
Columns:
- id
- user_id
- item_id
- status: borrowed, returned, overdue, cancelled
- quantity: quantity involved in the transaction
- borrowed_at: timestamp when the item was borrowed
- due_date: optional expected return date
- returned_at: timestamp when returned; NULL means still not returned
- purpose: optional borrow purpose
- notes: optional transaction notes
- approved_by_admin_id: admin who approved, if any
- condition_at_borrow, condition_at_return
- created_at, updated_at

TABLE requests
-------------
Purpose: user requests/orders, including new item requests and special borrow
requests. The table is named requests for backward compatibility.
Primary key: requests.id
Foreign keys:
- requests.user_id -> users.id
- requests.item_id -> items.id, nullable
- requests.responded_by_admin_id -> users.id, nullable
Columns:
- id
- user_id
- item_id
- order_type: new_item, special_borrow, other
- title: optional short request title
- description: request details
- status: pending, approved, rejected, ready
- priority: legacy priority text, usually normal
- needed_date: when the user needs it
- ready_date: when admin marked it ready
- admin_response: optional admin response
- responded_by_admin_id: admin responder
- responded_at: response timestamp
- request_type: legacy request type text
- created_at, updated_at
"""


BUSINESS_RULES = """
Inventory semantics:
- "available", "in stock", "on hand", "left", "can borrow" usually mean
  items.available_quantity > 0 and items.status = 'available'.
- "total inventory", "total stock", or "owned" means SUM(items.quantity).
- "current inventory", "currently available", or "available stock" means
  SUM(items.available_quantity).
- "borrowed now", "currently has", "who has" means transactions.status IN
  ('borrowed', 'overdue') AND transactions.returned_at IS NULL.
- "overdue users/transactions" means transactions.status = 'overdue' OR
  transactions.due_date < CURRENT_DATE with returned_at IS NULL.
- "most borrowed item" means count or sum historical transactions grouped by
  item, normally excluding cancelled transactions.
- "never borrowed" means an item with no non-cancelled transaction rows.
- "low stock", unless a threshold is specified, means available_quantity < 5.
- "under maintenance" means items.status = 'maintenance'.
- "retired" means no longer active inventory.
- "this month" means from date_trunc('month', CURRENT_DATE) inclusive.
- For "me", "my", "I borrowed", or "current user", use the Authenticated User
  block included in the user prompt.

Synonyms and wording:
- laptop, notebook, computer, PC, desktop may refer to item names/descriptions
  or electronics. Search item name, description, brand, and model with ILIKE.
- Dell, HP, Apple, Lenovo, etc. are brands unless the user clearly says item
  name/model.
- electronics/electronic/computer gear -> category = 'electronics' when the
  question asks about a category.
- school supplies/items -> category = 'school_items'.
- decorations/decor -> category = 'decorations'.
- clothing/clothes/uniforms -> category = 'clothes'.
- games/toys -> category = 'games'.
"""


SQL_RULES = """
Generate exactly one PostgreSQL SELECT query.

Safety and style rules:
- Never use SELECT *.
- Select only the columns needed to answer the question.
- Use explicit table aliases for joins.
- Always add LIMIT 100 for list/detail queries. Aggregate-only queries do not
  need LIMIT unless they return grouped rows.
- Prefer exact enum comparisons for category/status values.
- Use ILIKE only for names, descriptions, brands, models, locations, titles,
  or free-text matching.
- Use COALESCE when nulls would make the answer less helpful.
- Use COUNT, SUM, GROUP BY, ORDER BY for statistics and rankings.
- Use LEFT JOIN for "never borrowed" or "missing" style questions.
- Do not expose restricted user columns or raw QR columns.
- Do not use INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, or
  any non-read operation.
- Do not return markdown, comments, or explanations in the SQL block.
"""


FEW_SHOT_EXAMPLES = """
User: What laptops are available?
SQL:
SELECT i.id, i.name, i.item_code, i.brand, i.model, i.available_quantity, i.location
FROM items AS i
WHERE i.status = 'available'
  AND i.available_quantity > 0
  AND (
    i.name ILIKE '%laptop%' OR i.name ILIKE '%notebook%' OR
    i.description ILIKE '%laptop%' OR i.description ILIKE '%notebook%' OR
    i.model ILIKE '%laptop%' OR i.model ILIKE '%notebook%'
  )
ORDER BY i.name
LIMIT 100;

User: How many Dell laptops do we have?
SQL:
SELECT COALESCE(SUM(i.quantity), 0) AS total_dell_laptops,
       COALESCE(SUM(i.available_quantity), 0) AS available_dell_laptops
FROM items AS i
WHERE i.brand ILIKE '%Dell%'
  AND (
    i.name ILIKE '%laptop%' OR i.name ILIKE '%notebook%' OR
    i.description ILIKE '%laptop%' OR i.description ILIKE '%notebook%' OR
    i.model ILIKE '%laptop%' OR i.model ILIKE '%notebook%'
  );

User: Show electronics with less than five available.
SQL:
SELECT i.id, i.name, i.item_code, i.brand, i.model, i.available_quantity, i.location
FROM items AS i
WHERE i.category = 'electronics'
  AND i.available_quantity < 5
ORDER BY i.available_quantity ASC, i.name
LIMIT 100;

User: What is the most borrowed item?
SQL:
SELECT i.id, i.name, i.item_code, COALESCE(SUM(t.quantity), 0) AS times_borrowed
FROM items AS i
JOIN transactions AS t ON t.item_id = i.id
WHERE t.status <> 'cancelled'
GROUP BY i.id, i.name, i.item_code
ORDER BY times_borrowed DESC, i.name
LIMIT 10;

User: Who currently has Laptop A?
SQL:
SELECT u.id AS user_id, u.full_name, u.email, u.department,
       i.name AS item_name, t.quantity, t.borrowed_at, t.due_date, t.status
FROM transactions AS t
JOIN users AS u ON u.id = t.user_id
JOIN items AS i ON i.id = t.item_id
WHERE t.returned_at IS NULL
  AND t.status IN ('borrowed', 'overdue')
  AND i.name ILIKE '%Laptop A%'
ORDER BY t.borrowed_at DESC
LIMIT 100;

User: How many items are under maintenance?
SQL:
SELECT COUNT(*) AS maintenance_item_records,
       COALESCE(SUM(i.quantity), 0) AS maintenance_total_quantity
FROM items AS i
WHERE i.status = 'maintenance';

User: What categories have the highest inventory?
SQL:
SELECT i.category, COALESCE(SUM(i.quantity), 0) AS total_quantity,
       COALESCE(SUM(i.available_quantity), 0) AS available_quantity
FROM items AS i
GROUP BY i.category
ORDER BY total_quantity DESC, i.category
LIMIT 100;

User: Which users borrowed items this month?
SQL:
SELECT u.id AS user_id, u.full_name, u.email, COUNT(t.id) AS borrow_count,
       COALESCE(SUM(t.quantity), 0) AS quantity_borrowed
FROM transactions AS t
JOIN users AS u ON u.id = t.user_id
WHERE t.borrowed_at >= date_trunc('month', CURRENT_DATE)
  AND t.status <> 'cancelled'
GROUP BY u.id, u.full_name, u.email
ORDER BY borrow_count DESC, u.full_name
LIMIT 100;

User: Which item has the lowest stock?
SQL:
SELECT i.id, i.name, i.item_code, i.brand, i.model, i.available_quantity, i.quantity
FROM items AS i
WHERE i.status <> 'retired'
ORDER BY i.available_quantity ASC, i.name
LIMIT 10;

User: Show inventory statistics.
SQL:
SELECT COUNT(*) AS item_records,
       COALESCE(SUM(i.quantity), 0) AS total_quantity,
       COALESCE(SUM(i.available_quantity), 0) AS available_quantity,
       COALESCE(SUM(i.quantity - i.available_quantity), 0) AS unavailable_quantity,
       COUNT(*) FILTER (WHERE i.status = 'available') AS available_records,
       COUNT(*) FILTER (WHERE i.status = 'borrowed') AS borrowed_records,
       COUNT(*) FILTER (WHERE i.status = 'maintenance') AS maintenance_records,
       COUNT(*) FILTER (WHERE i.status = 'retired') AS retired_records
FROM items AS i;

User: Compare current inventory with total inventory.
SQL:
SELECT COALESCE(SUM(i.available_quantity), 0) AS current_available_inventory,
       COALESCE(SUM(i.quantity), 0) AS total_inventory,
       COALESCE(SUM(i.quantity - i.available_quantity), 0) AS unavailable_inventory
FROM items AS i;

User: Which items have never been borrowed?
SQL:
SELECT i.id, i.name, i.item_code, i.brand, i.model, i.quantity, i.available_quantity
FROM items AS i
LEFT JOIN transactions AS t
  ON t.item_id = i.id AND t.status <> 'cancelled'
WHERE t.id IS NULL
ORDER BY i.name
LIMIT 100;

User: Which users have overdue transactions?
SQL:
SELECT u.id AS user_id, u.full_name, u.email, u.department,
       COUNT(t.id) AS overdue_transaction_count,
       MIN(t.due_date) AS oldest_due_date
FROM transactions AS t
JOIN users AS u ON u.id = t.user_id
WHERE t.returned_at IS NULL
  AND (t.status = 'overdue' OR t.due_date < CURRENT_DATE)
GROUP BY u.id, u.full_name, u.email, u.department
ORDER BY oldest_due_date ASC NULLS LAST, u.full_name
LIMIT 100;

User: Only Dell ones.
Context: Previous query was about laptops.
SQL:
SELECT i.id, i.name, i.item_code, i.brand, i.model, i.available_quantity, i.location
FROM items AS i
WHERE i.brand ILIKE '%Dell%'
  AND (
    i.name ILIKE '%laptop%' OR i.name ILIKE '%notebook%' OR
    i.description ILIKE '%laptop%' OR i.description ILIKE '%notebook%' OR
    i.model ILIKE '%laptop%' OR i.model ILIKE '%notebook%'
  )
ORDER BY i.name
LIMIT 100;
"""


def _format_history(history: Iterable[tuple[str, str]]) -> str:
    lines: list[str] = []
    for index, (question, answer) in enumerate(history, start=1):
        lines.append(f"{index}. User: {question}\n   Assistant: {answer}")
    return "\n".join(lines) if lines else "No previous turns."


def build_system_prompt(language: str = "en", retry_reason: Optional[str] = None) -> str:
    """Build the SQL-generation system prompt."""
    retry_block = ""
    if retry_reason:
        retry_block = f"""
Previous SQL attempt failed for this reason:
{retry_reason}

Repair the query. Prefer a simpler valid SELECT over returning NO_SQL.
"""

    return f"""
You are QStock's senior PostgreSQL query generator for an inventory management
system. Convert the user's message into one safe, efficient PostgreSQL SELECT.

Current date: {date.today().isoformat()}
Response language requested by the UI: {language}

DATABASE SCHEMA
===============
{SCHEMA_DESCRIPTION}

BUSINESS RULES
==============
{BUSINESS_RULES}

SQL RULES
=========
{SQL_RULES}

EXAMPLES
========
{FEW_SHOT_EXAMPLES}

{retry_block}

OUTPUT FORMAT
=============
Return exactly one of these:
1. A single PostgreSQL SELECT query.
2. NO_SQL: followed by one concise clarification question, only when the
   database schema cannot answer the request or essential details are missing.

Do not use markdown. Do not explain the SQL.
"""


def build_user_prompt(
    question: str,
    history_summary: str = "",
    last_sql: str = "",
) -> str:
    """Build the SQL-generation user prompt with follow-up context."""
    context = history_summary.strip() or "No conversation context."
    previous_sql = last_sql.strip() or "No previous SQL."
    return f"""
Conversation context for follow-up resolution:
{context}

Previous successful SQL, if relevant:
{previous_sql}

Current user message:
{question.strip()}
""".strip()


def build_general_system_prompt(language: str = "en") -> str:
    """System prompt for non-SQL inventory assistant conversation."""
    if language == "fr":
        return """Tu es l'assistant IA de QStock. Reponds aux questions generales sur ce que tu peux faire, les statuts d'inventaire, les seuils de faible stock, et l'utilisation du chatbot. N'invente pas de donnees d'inventaire chiffrees sans requete SQL. Sois bref et utile, en francais."""
    return """You are QStock's AI inventory assistant. Answer general questions about what you can do, inventory statuses, low-stock meaning, and how to use the assistant. Do not invent live inventory counts or item names without a SQL query. Be brief and useful in English."""


def build_general_user_prompt(question: str) -> str:
    return question.strip()


def build_clarification_answer(language: str, clarification: str) -> str:
    clarification = clarification.strip()
    if clarification:
        return clarification
    if language == "fr":
        return "Pouvez-vous preciser quel article, utilisateur, categorie ou intervalle de dates vous voulez verifier ?"
    return "Could you clarify which item, user, category, or date range you want me to check?"


def build_empty_result_prompt(
    language: str,
    question: str,
    sql: str,
    history_summary: str = "",
) -> str:
    if language == "fr":
        return f"""La requete SQL valide n'a retourne aucune ligne.
Question: {question}
SQL: {sql}
Contexte: {history_summary or 'Aucun'}

Explique brievement qu'aucun enregistrement correspondant n'a ete trouve et suggere une facon utile d'elargir la recherche. Reponds en francais."""
    return f"""The valid SQL query returned zero rows.
Question: {question}
SQL: {sql}
Context: {history_summary or 'None'}

Briefly explain that no matching records were found and suggest a useful way to broaden the search. Answer in English."""


def build_answer_system_prompt(language: str = "en") -> str:
    """System prompt for the natural-language answer synthesis step."""
    if language == "fr":
        return """Tu es l'assistant IA d'inventaire de QStock.

Regles strictes:
- Utilise uniquement les donnees de "DONNEES RECUPEREES".
- N'invente jamais de valeur, nom, quantite, date ou statut.
- Si les donnees ne suffisent pas, dis-le clairement.
- Utilise l'historique seulement pour comprendre une question de suivi.
- Reponds en francais, directement, sans formule inutile.
- Pour plusieurs lignes, donne une liste courte. Pour des statistiques, explique les chiffres clairement.
"""
    return """You are QStock's AI inventory assistant.

Strict rules:
- Use only the rows in "RETRIEVED DATA".
- Never invent a value, name, quantity, date, or status.
- If the rows do not fully answer the question, say so plainly.
- Use history only to understand follow-up context.
- Answer in English, directly, with no filler.
- For multiple rows, use a short list. For statistics, explain the numbers clearly.
"""


def build_answer_user_prompt(
    question: str,
    sql: str,
    data_block: str,
    row_count: int,
) -> str:
    return f"""USER QUESTION:
{question.strip()}

SQL QUERY EXECUTED (reference only; do not show SQL unless asked):
{sql}

NUMBER OF MATCHING ROWS: {row_count}

RETRIEVED DATA:
{data_block}

Write the answer using only the retrieved data.
"""
