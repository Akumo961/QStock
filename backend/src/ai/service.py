"""
service.py

AI Inventory Assistant — core pipeline.

Architecture
------------
  User question
       ↓
  AIProvider  (OpenAI or Ollama, selected by env vars)
       ↓
  Raw LLM output (SQL + description)
       ↓
  sql_guard.validate_sql()
       ↓
  Execute SELECT on PostgreSQL (read-only, max 100 rows, 30 s timeout)
       ↓
  AIProvider  →  natural-language answer
       ↓
  ChatResponse

Adding a new provider
---------------------
1. Subclass AIProvider and implement `complete(messages)`.
2. Add a branch in `get_provider()`.
"""

import logging
import re
import time
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.ai.prompts import build_system_prompt, build_user_prompt
from src.ai.sql_guard import validate_sql
from src.ai.schemas import ChatResponse
from src.core.config import settings

logger = logging.getLogger(__name__)

# Maximum rows returned to the frontend / fed back to the LLM.
MAX_ROWS = 100
# Statement timeout in milliseconds (PostgreSQL session-level).
QUERY_TIMEOUT_MS = 10_000

# ---------------------------------------------------------------------------
# Bilingual fallback / error strings.
#
# These are the few messages generated directly by this module (not by the
# LLM) — provider-not-configured, LLM-unreachable, SQL-guard rejection, etc.
# Mirrors the `language === 'fr' ? ... : ...` convention used across the
# existing frontend (Scanner.tsx, Header.tsx, BorrowProcess.tsx).
# ---------------------------------------------------------------------------

_MESSAGES = {
    "no_provider": {
        "en": "The AI Assistant is not configured. Please ask your administrator to set OPENAI_API_KEY or OLLAMA_URL in the server environment.",
        "fr": "L'assistant IA n'est pas configuré. Veuillez demander à votre administrateur de définir OPENAI_API_KEY ou OLLAMA_URL dans l'environnement du serveur.",
    },
    "llm_unreachable": {
        "en": "I'm having trouble reaching the AI service right now. Please try again in a moment.",
        "fr": "J'ai du mal à contacter le service d'IA en ce moment. Veuillez réessayer dans un instant.",
    },
    "no_answer_found": {
        "en": "I couldn't find an answer to that question based on the available inventory data.",
        "fr": "Je n'ai pas trouvé de réponse à cette question à partir des données d'inventaire disponibles.",
    },
    "sql_guard_rejected": {
        "en": "I generated a query that didn't pass safety validation. Please rephrase your question.",
        "fr": "J'ai généré une requête qui n'a pas passé la validation de sécurité. Veuillez reformuler votre question.",
    },
    "execution_failed": {
        "en": "I was unable to retrieve the data. The query may reference information that doesn't exist.",
        "fr": "Je n'ai pas pu récupérer les données. La requête fait peut-être référence à des informations qui n'existent pas.",
    },
    "found_results": {
        "en": "Found {count} result(s).",
        "fr": "{count} résultat(s) trouvé(s).",
    },
    "no_results": {
        "en": "No results found.",
        "fr": "Aucun résultat trouvé.",
    },
}


def _msg(key: str, language: str, **kwargs) -> str:
    """Look up a bilingual fallback string, defaulting to English."""
    entry = _MESSAGES.get(key, {})
    template = entry.get(language) or entry.get("en") or key
    return template.format(**kwargs) if kwargs else template


# =============================================================================
# Provider abstraction
# =============================================================================

class OllamaProvider:
    """Fast Ollama provider optimized for SQL generation."""

    _client = httpx.Client(
        timeout=60,
        limits=httpx.Limits(
            max_keepalive_connections=10,
            max_connections=20,
        ),
    )

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "phi3:mini",
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model

    def complete(self, messages: List[Dict[str, str]]) -> str:
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "keep_alive": "30m",
            "options": {
                "temperature": 0,
                "num_predict": 128,
                "num_ctx": 2048,
            },
        }

        start = time.time()

        response = self._client.post(
            f"{self.base_url}/api/chat",
            json=payload,
        )

        logger.info(
            "OLLAMA HTTP TOOK %.2fs",
            time.time() - start,
        )

        response.raise_for_status()

        data = response.json()

        return data["message"]["content"]


def get_provider() -> Optional[OllamaProvider]:
    """
    Return configured Ollama provider.
    """

    ollama_url = getattr(settings, "OLLAMA_URL", "") or ""

    if not ollama_url:
        logger.error("OLLAMA_URL not configured")
        return None

    model = getattr(settings, "OLLAMA_MODEL", "phi3:mini")

    logger.info(
        "AI provider: Ollama (%s @ %s)",
        model,
        ollama_url,
    )

    logger.info("MODEL LOADED = %s", model)

    return OllamaProvider(
        base_url=ollama_url,
        model=model,
    )

# =============================================================================
# SQL execution helper
# =============================================================================

def _execute_safe_select(db: Session, sql: str) -> List[Dict[str, Any]]:
    """
    Execute a validated SELECT statement and return rows as a list of dicts.

    Applies a PostgreSQL session-level statement timeout to prevent runaway
    queries, and hard-caps results at MAX_ROWS.
    """
    # Session-level timeout — reverts automatically at end of transaction.
    db.execute(text(f"SET LOCAL statement_timeout = {QUERY_TIMEOUT_MS}"))

    # Ensure the query has a LIMIT so we never scan the whole table.
    sql_upper = sql.upper()
    if "LIMIT" not in sql_upper:
        sql = f"{sql} LIMIT {MAX_ROWS}"

    result = db.execute(text(sql))
    columns = list(result.keys())
    rows = [dict(zip(columns, row)) for row in result.fetchmany(MAX_ROWS)]
    return rows


# =============================================================================
# Main pipeline
# =============================================================================

def _parse_llm_output(raw: str):
    """
    Extract the SQL and description from the raw LLM response.

    Expected format (two blocks separated by a blank line):
        SELECT ...;

        Description of what the query does.

    Returns (sql_or_none, description).
    """
    raw = raw.strip()

    # Model said it cannot answer
    if raw.startswith("NO_SQL"):
        explanation = raw[len("NO_SQL"):].strip()
        return None, explanation

    # Split on first blank line
    parts = re.split(r"\n\s*\n", raw, maxsplit=1)
    sql_part = parts[0].strip()
    description = parts[1].strip() if len(parts) > 1 else ""

    # Strip markdown code fences if the model forgot the rule
    sql_part = re.sub(r"^```[a-zA-Z]*\n?", "", sql_part).strip()
    sql_part = re.sub(r"\n?```$", "", sql_part).strip()

    return sql_part, description


def handle_chat(
    db: Session,
    user_message: str,
    requesting_user_id: int,
    language: str = "en",
) -> ChatResponse:
    """
    Full AI assistant pipeline.

    1. Get configured provider.
    2. Ask LLM to generate SQL.
    3. Validate SQL via sql_guard.
    4. Execute against PostgreSQL.
    5. Ask LLM to summarise results in natural language (in the requested language).
    6. Log the interaction.
    7. Return ChatResponse.

    Args:
        language: 'en' or 'fr' — matches the frontend's LanguageContext.
                  Controls the language of the assistant's answer and of
                  any fallback/error message generated by this module.
    """
    language = language if language in ("en", "fr") else "en"
    started_at = time.time()

    # ------------------------------------------------------------------
    # 0. Provider check
    # ------------------------------------------------------------------
    provider = get_provider()
    if provider is None:
        return ChatResponse(
            answer=_msg("no_provider", language),
            sql=None,
            rows=None,
            error="no_provider",
        )

    # ------------------------------------------------------------------
    # 1. Generate SQL
    # ------------------------------------------------------------------
    sql_messages = [
        {"role": "system", "content": build_system_prompt(language)},
        {"role": "user", "content": build_user_prompt(user_message)},
    ]

    try:
        logger.info("START OLLAMA")
        raw_llm = provider.complete(sql_messages)
        logger.info("END OLLAMA")
        logger.info(
            "LLM SQL generation took %.2fs",
            time.time() - started_at,
        )
    except Exception as exc:
        logger.exception("LLM call failed")
        return ChatResponse(
            answer=_msg("llm_unreachable", language),
            sql=None,
            rows=None,
            error=str(exc),
        )

    sql, description = _parse_llm_output(raw_llm)

    # Model said it cannot answer
    if sql is None:
        _log(requesting_user_id, user_message, None, started_at)
        return ChatResponse(answer=description or _msg("no_answer_found", language), sql=None, rows=None)

    # ------------------------------------------------------------------
    # 2. Validate SQL (security gate)
    # ------------------------------------------------------------------
    ok, sql_or_reason = validate_sql(sql)

    if not ok:
        logger.warning(
            "SQL guard rejected query for user %d: %s",
            requesting_user_id,
            sql_or_reason,
        )

        _log(requesting_user_id, user_message, sql, started_at)

        return ChatResponse(
            answer=_msg("sql_guard_rejected", language),
            sql=None,
            rows=None,
            error=f"SQL guard: {sql_or_reason}",
        )

    # SQL validé
    clean_sql = sql_or_reason

    # Cast ENUM -> TEXT pour permettre ILIKE
    clean_sql = re.sub(
        r"\bcategory\s+ILIKE\b",
        "category::text ILIKE",
        clean_sql,
        flags=re.IGNORECASE,
    )

    clean_sql = re.sub(
        r"\bstatus\s+ILIKE\b",
        "status::text ILIKE",
        clean_sql,
        flags=re.IGNORECASE,
    )

    logger.info("FINAL SQL: %s", clean_sql)

    # ------------------------------------------------------------------
    # 3. Execute query
    # ------------------------------------------------------------------
    try:
        rows = _execute_safe_select(db, clean_sql)
        logger.info(
            "Total query time %.2fs",
            time.time() - started_at,
        )
    except Exception as exc:
        logger.exception(
            "SQL execution error for user %d | SQL: %s",
            requesting_user_id,
            clean_sql,
        )

        _log(requesting_user_id, user_message, clean_sql, started_at)

        return ChatResponse(
            answer=f"SQL ERROR: {exc}",
            sql=clean_sql,
            rows=None,
            error=str(exc),
        )


    # ------------------------------------------------------------------
    # 4. Fast answer generation
    # ------------------------------------------------------------------

    if not rows:
        answer = _msg("no_results", language)

    else:
        lines = []

        for row in rows:
            name = row.get("name", "-")
            quantity = row.get("quantity", 0)
            available = row.get("available_quantity", 0)

            # ta colonne s'appelle probablement location
            location = row.get("location", "-")

            if language == "fr":
                lines.append(
                    f"• {name}\n"
                    f"  Quantité totale : {quantity}\n"
                    f"  Disponible : {available}\n"
                    f"  Emplacement : {location}"
                )
            else:
                lines.append(
                    f"• {name}\n"
                    f"  Total quantity: {quantity}\n"
                    f"  Available: {available}\n"
                    f"  Location: {location}"
                )

        answer = "\n\n".join(lines)
    # ------------------------------------------------------------------
    # 5. Log & return
    # ------------------------------------------------------------------
    _log(requesting_user_id, user_message, clean_sql, started_at)

    return ChatResponse(
        answer=answer.strip(),
        sql=clean_sql,
        rows=rows,
    )


# =============================================================================
# Audit logging (no DB writes to existing tables)
# =============================================================================

def _log(user_id: int, question: str, sql: Optional[str], started_at: float) -> None:
    """Write an audit entry to the application log (file / stdout)."""
    elapsed = round(time.time() - started_at, 3)
    logger.info(
        "AI_AUDIT | user_id=%d | elapsed=%.3fs | sql=%s | question=%r",
        user_id,
        elapsed,
        repr(sql),
        question,
    )