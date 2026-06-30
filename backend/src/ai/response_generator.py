"""Natural-language response generation for QStock AI."""

from typing import Any

from src.ai.prompts import (
    build_answer_system_prompt,
    build_answer_user_prompt,
    build_empty_result_prompt,
    build_general_system_prompt,
    build_general_user_prompt,
)
from src.core.config import settings

# Columns that are verbose and rarely needed in a user-facing answer. Strip
# them from rows before serializing into the answer prompt so the context
# stays small and inference stays fast. The values are still returned in
# ChatResponse.rows for the frontend to display if it wants them.
_VERBOSE_COLUMNS = frozenset({
    "description", "notes", "image_url", "qr_code_data", "qr_code_image",
    "hashed_password", "purchase_date", "created_at", "updated_at",
    "is_borrowable", "requires_approval", "max_borrow_days",
})


def slim_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return rows with verbose columns stripped for prompt serialization."""
    if not rows:
        return rows
    # Only strip if the row has more than 6 columns — for narrow aggregate
    # results (stats, counts) we keep everything since they're already compact.
    if len(rows[0]) <= 6:
        return rows
    return [
        {k: v for k, v in row.items() if k not in _VERBOSE_COLUMNS}
        for row in rows
    ]


def serialize_rows_for_prompt(rows: list[dict[str, Any]], limit: int) -> str:
    """Compact, token-efficient serialization of retrieved rows."""
    if not rows:
        return "(no rows)"

    lines: list[str] = []
    for index, row in enumerate(rows[:limit], start=1):
        pairs = ", ".join(f"{key}={value}" for key, value in row.items())
        lines.append(f"{index}. {pairs}")

    if len(rows) > limit:
        lines.append(f"... and {len(rows) - limit} more row(s), total matched: {len(rows)}.")
    return "\n".join(lines)


class ResponseGenerator:
    """Turns retrieved data or general prompts into user-facing answers."""

    def __init__(self, provider: Any):
        self.provider = provider

    def answer_from_rows(
        self,
        *,
        language: str,
        question: str,
        sql: str,
        rows: list[dict[str, Any]],
        history_messages: list[dict[str, str]],
    ) -> str:
        row_limit = getattr(settings, "AI_CONTEXT_ROW_LIMIT", 15)
        max_tokens = getattr(settings, "AI_ANSWER_MAX_TOKENS", 180)
        data_block = serialize_rows_for_prompt(rows, row_limit)

        messages = (
            [{"role": "system", "content": build_answer_system_prompt(language)}]
            + history_messages
            + [
                {
                    "role": "user",
                    "content": build_answer_user_prompt(
                        question=question,
                        sql=sql,
                        data_block=data_block,
                        row_count=len(rows),
                    ),
                }
            ]
        )

        answer_num_ctx = getattr(settings, "AI_ANSWER_NUM_CTX", 2048)
        return self.provider.complete(
            messages,
            max_tokens=max_tokens,
            temperature=0.25,
            num_ctx=answer_num_ctx,
        ).strip()

    def empty_result_answer(
        self,
        *,
        language: str,
        question: str,
        sql: str,
        history_summary: str,
    ) -> str:
        messages = [
            {"role": "system", "content": build_answer_system_prompt(language)},
            {
                "role": "user",
                "content": build_empty_result_prompt(
                    language=language,
                    question=question,
                    sql=sql,
                    history_summary=history_summary,
                ),
            },
        ]
        answer_num_ctx = getattr(settings, "AI_ANSWER_NUM_CTX", 4096)
        return self.provider.complete(messages, max_tokens=120, temperature=0.25, num_ctx=answer_num_ctx).strip()

    def general_answer(self, *, language: str, question: str) -> str:
        messages = [
            {"role": "system", "content": build_general_system_prompt(language)},
            {"role": "user", "content": build_general_user_prompt(question)},
        ]
        answer_num_ctx = getattr(settings, "AI_ANSWER_NUM_CTX", 4096)
        return self.provider.complete(messages, max_tokens=180, temperature=0.35, num_ctx=answer_num_ctx).strip()


def fallback_format_rows(rows: list[dict[str, Any]], language: str) -> str:
    if not rows:
        if language == "fr":
            return "Je n'ai trouve aucun enregistrement correspondant. Essayez d'elargir le nom, la categorie ou la periode."
        return "I did not find matching records. Try broadening the item name, category, or date range."

    lines: list[str] = []
    for row in rows[:20]:
        parts = "; ".join(f"{key}: {value}" for key, value in row.items())
        lines.append(f"- {parts}")

    prefix = f"Found {len(rows)} result(s)." if language != "fr" else f"{len(rows)} resultat(s) trouve(s)."
    return prefix + "\n\n" + "\n".join(lines)


def deterministic_list_answer(rows: list[dict[str, Any]], language: str, max_items: int = 20) -> str | None:
    """Format a list-of-rows result directly in Python, with no LLM call.

    This is deliberately conservative: it only fires when every row has a
    recognizable "label" field (name or full_name) — the shape produced by
    essentially every item/user listing template in query_templates.py. Any
    row shape it doesn't recognize returns None, so the caller falls through
    to the LLM exactly as before. No functionality is lost; only the
    overwhelmingly common case (a simple list of items or people) gets the
    speedup, since on CPU/GPU-split hardware even a short LLM phrasing call
    can take 20-30+ seconds — far more than formatting ever costs.
    """
    if not rows:
        return None

    first = rows[0]
    if "name" in first:
        label_key = "name"
    elif "full_name" in first:
        label_key = "full_name"
    else:
        return None

    # Fields worth showing inline, in a sensible reading order. Anything not
    # in this list (ids, timestamps, internal flags) is simply omitted —
    # matches what the LLM was already choosing to surface in practice.
    _DISPLAY_FIELDS = [
        ("item_code", "Item Code" if language != "fr" else "Code"),
        ("email", "Email"),
        ("department", "Department" if language != "fr" else "Departement"),
        ("brand", "Brand" if language != "fr" else "Marque"),
        ("model", "Model" if language != "fr" else "Modele"),
        ("category", "Category" if language != "fr" else "Categorie"),
        ("status", "Status" if language != "fr" else "Statut"),
        ("quantity", "Quantity" if language != "fr" else "Quantite"),
        ("available_quantity", "Available" if language != "fr" else "Disponible"),
        ("location", "Location" if language != "fr" else "Emplacement"),
        ("overdue_transaction_count", "Overdue Count" if language != "fr" else "Retards"),
        ("oldest_due_date", "Oldest Due" if language != "fr" else "Echeance"),
        ("times_borrowed", "Times Borrowed" if language != "fr" else "Fois Empruntee"),
        ("borrowed_at", "Borrowed At" if language != "fr" else "Emprunte le"),
        ("due_date", "Due" if language != "fr" else "Echeance"),
    ]

    shown = rows[:max_items]
    lines = []
    for index, row in enumerate(shown, start=1):
        label = row.get(label_key) or "(unnamed)"
        details = [
            f"{display_name}: {row[key]}"
            for key, display_name in _DISPLAY_FIELDS
            if key in row and row[key] is not None
        ]
        suffix = f" - {', '.join(details)}" if details else ""
        lines.append(f"{index}. **{label}**{suffix}")

    header = ""
    if len(rows) > max_items:
        if language == "fr":
            header = f"Voici les {max_items} premiers sur {len(rows)} resultat(s) :\n\n"
        else:
            header = f"Here are the first {max_items} of {len(rows)} result(s):\n\n"
    elif language == "fr":
        header = f"Voici les {len(rows)} resultat(s) trouve(s) :\n\n"
    else:
        header = f"Here are the {len(rows)} result(s) found:\n\n"

    return header + "\n".join(lines)


def deterministic_data_answer(question: str, rows: list[dict[str, Any]], language: str) -> str | None:
    if not rows:
        if language == "fr":
            return "Je n'ai trouve aucun enregistrement correspondant a cette recherche. Essayez d'elargir le nom, la marque, la categorie ou la periode."
        return "I did not find any matching records for that search. Try broadening the name, brand, category, or date range."

    first = rows[0]
    keys = set(first.keys())

    if {
        "item_records",
        "total_quantity",
        "available_quantity",
        "unavailable_quantity",
        "available_records",
        "borrowed_records",
        "maintenance_records",
        "retired_records",
    }.issubset(keys):
        if language == "fr":
            return (
                f"L'inventaire contient {first['item_records']} fiche(s), "
                f"{first['total_quantity']} unite(s) au total et {first['available_quantity']} disponible(s). "
                f"Indisponible(s): {first['unavailable_quantity']}. "
                f"Fiches par statut: {first['available_records']} disponibles, {first['borrowed_records']} empruntees, "
                f"{first['maintenance_records']} en maintenance, {first['retired_records']} retirees."
            )
        return (
            f"Inventory has {first['item_records']} item record(s), "
            f"{first['total_quantity']} total unit(s), and {first['available_quantity']} available unit(s). "
            f"Unavailable units: {first['unavailable_quantity']}. "
            f"Records by status: {first['available_records']} available, {first['borrowed_records']} borrowed, "
            f"{first['maintenance_records']} maintenance, {first['retired_records']} retired."
        )

    if {"current_available_inventory", "total_inventory", "unavailable_inventory"}.issubset(keys):
        if language == "fr":
            return (
                f"Inventaire actuel disponible: {first['current_available_inventory']}. "
                f"Inventaire total: {first['total_inventory']}. "
                f"Indisponible: {first['unavailable_inventory']}."
            )
        return (
            f"Current available inventory is {first['current_available_inventory']}. "
            f"Total inventory is {first['total_inventory']}. "
            f"Unavailable inventory is {first['unavailable_inventory']}."
        )

    if {"maintenance_item_records", "maintenance_total_quantity"}.issubset(keys):
        if language == "fr":
            return f"{first['maintenance_item_records']} fiche(s) sont en maintenance, pour {first['maintenance_total_quantity']} unite(s) au total."
        return f"{first['maintenance_item_records']} item record(s) are under maintenance, totaling {first['maintenance_total_quantity']} unit(s)."

    return None


def deterministic_general_answer(question: str, language: str) -> str:
    text = question.lower()
    if language == "fr":
        if "low stock" in text or "faible" in text:
            return "Dans QStock, un stock faible signifie generalement que la quantite disponible est sous un seuil, par defaut moins de 5 articles si vous ne precisez pas un autre seuil."
        if "status" in text or "statut" in text:
            return "Les statuts principaux sont available pour les articles disponibles, borrowed pour les articles empruntes, maintenance pour les articles indisponibles en entretien, et retired pour les articles retires."
        return "Je peux repondre aux questions sur les articles, les quantites disponibles, les emprunts, les retards, les utilisateurs, les demandes et les statistiques d'inventaire."

    if "low stock" in text:
        return "In QStock, low stock usually means available quantity is below a threshold. If you do not specify one, I treat low stock as fewer than 5 available."
    if "status" in text:
        return "Inventory statuses describe item state: available means usable stock, borrowed means checked out, maintenance means unavailable for repair/service, and retired means no longer active."
    return "I can answer live inventory questions about items, available quantities, borrowed and overdue transactions, users, requests, categories, low stock, and inventory statistics."


def can_answer_general_deterministically(question: str) -> bool:
    text = question.lower()
    return any(
        phrase in text
        for phrase in (
            "what can you do",
            "help",
            "low stock",
            "inventory status",
            "status mean",
            "explain inventory status",
        )
    )