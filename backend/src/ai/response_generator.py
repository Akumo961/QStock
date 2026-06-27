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
        return self.provider.complete(messages, max_tokens=120, temperature=0.25, num_ctx=2048).strip()

    def general_answer(self, *, language: str, question: str) -> str:
        messages = [
            {"role": "system", "content": build_general_system_prompt(language)},
            {"role": "user", "content": build_general_user_prompt(question)},
        ]
        return self.provider.complete(messages, max_tokens=180, temperature=0.35, num_ctx=2048).strip()


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
