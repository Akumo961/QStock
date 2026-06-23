"""
service.py

AI Inventory Assistant — core pipeline (Retrieval-Augmented Generation
over the live SQL database).

Architecture
------------
  User question (+ short conversation history)
       ↓
  AIProvider  (OpenAI or Ollama, selected by env vars)         [CALL 1]
       ↓
  Raw LLM output (SQL + description)
       ↓
  sql_guard.validate_sql()
       ↓
  Execute SELECT on PostgreSQL (read-only, max 100 rows, 10 s timeout)  <- "Retrieval"
       ↓
  AIProvider  →  natural-language, conversational answer        [CALL 2]   <- "Augmented Generation"
       grounded ONLY in the rows just retrieved (anti-hallucination
       prompt in prompts.build_answer_system_prompt)
       ↓
  memory.add_turn()  (per-user, in-process conversation buffer)
       ↓
  ChatResponse

Why "RAG over SQL" instead of vector-embedding RAG?
----------------------------------------------------
QStock's data (items, transactions, requests, users) is structured and
relational, with exact filters, counts and aggregations ("how many",
"which ones are overdue"). Vector-similarity search over embedded text
chunks is the right tool when the corpus is unstructured prose; for exact
business data it is the wrong tool and would itself be a source of
inaccurate/hallucinated numbers. The retrieval step here is the
SQL query — generated from natural language, validated, and executed
read-only — which is strictly more reliable for this domain than
nearest-neighbour search. CALL 2 above is exactly the same idea
("synthesize a natural answer strictly from retrieved context") taken
from the reference rag-chatbot-master project, just pointed at SQL rows
instead of vector-store chunks. See CHANGES.md for the full rationale.

Adding a new provider
---------------------
1. Subclass AIProvider and implement `complete(messages, max_tokens, temperature, num_ctx)`.
2. Add a branch in `get_provider()`.
"""

import logging
import re
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.ai import memory as conversation_memory
from src.ai.prompts import (
    build_system_prompt,
    build_user_prompt,
    build_answer_system_prompt,
    build_answer_user_prompt,
)
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
        "en": "I checked the database, but I couldn't find any matching records for that question.",
        "fr": "J'ai vérifié la base de données, mais je n'ai trouvé aucun enregistrement correspondant à cette question.",
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

class AIProvider(ABC):
    """Common interface every LLM backend must implement."""

    @abstractmethod
    def complete(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 128,
        temperature: float = 0.0,
        num_ctx: int = 2048,
    ) -> str:
        """Send a chat-style message list to the LLM and return its text reply."""
        raise NotImplementedError


class OllamaProvider(AIProvider):
    """Local Ollama provider. Used for both SQL generation and answer synthesis,
    with different `max_tokens`/`temperature`/`num_ctx` per call site."""

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
        num_gpu: Optional[int] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        # If set, forces Ollama to try to put this many model layers on
        # GPU (it caps automatically at the model's real layer count).
        # Useful when `ollama ps` shows a CPU/GPU split that's more
        # CPU-heavy than your VRAM should require — Ollama's
        # auto-detection is sometimes conservative. Leave unset (None) to
        # keep Ollama's automatic behavior (the default, safe choice).
        self.num_gpu = num_gpu

    def complete(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 128,
        temperature: float = 0.0,
        num_ctx: int = 2048,
    ) -> str:
        options = {
            "temperature": temperature,
            "num_predict": max_tokens,
            "num_ctx": num_ctx,
        }
        if self.num_gpu is not None:
            options["num_gpu"] = self.num_gpu

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "keep_alive": "30m",
            "options": options,
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


class OpenAIProvider(AIProvider):
    """
    OpenAI provider — gives the assistant ChatGPT-quality conversational
    synthesis when an OPENAI_API_KEY is configured. Uses a plain httpx
    call against the REST API (no extra SDK dependency, mirrors the
    OllamaProvider implementation style above).
    """

    _client = httpx.Client(timeout=60)

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model

    def complete(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 128,
        temperature: float = 0.0,
        num_ctx: int = 2048,  # noqa: ARG002 - not applicable to OpenAI, kept for interface parity
    ) -> str:
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        start = time.time()

        response = self._client.post(
            "https://api.openai.com/v1/chat/completions",
            json=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )

        logger.info("OPENAI HTTP TOOK %.2fs", time.time() - start)

        response.raise_for_status()

        data = response.json()
        return data["choices"][0]["message"]["content"]


def get_provider(role: str = "sql") -> Optional[AIProvider]:
    """
    Return the configured AI provider.

    Args:
        role: "sql" (default) or "answer". Lets you point the
              answer-synthesis step at a smaller/faster model than the one
              used for SQL generation, via OLLAMA_ANSWER_MODEL /
              OPENAI_ANSWER_MODEL — purely a speed optimization. If those
              aren't set, the same model is used for both steps (original
              behavior, fully backward compatible).

    Selection order (matches env.example, which already documents OpenAI
    as "Option A" and Ollama as "Option B / OR Ollama"):
      1. OpenAI, if OPENAI_API_KEY is set.
      2. Ollama, if OLLAMA_URL is set (default value is already a local URL).
      3. None, if neither is configured.
    """
    openai_key = (getattr(settings, "OPENAI_API_KEY", "") or "").strip()
    if openai_key:
        default_model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
        model = default_model
        if role == "answer":
            model = getattr(settings, "OPENAI_ANSWER_MODEL", "") or default_model
        logger.info("AI provider: OpenAI (%s) [role=%s]", model, role)
        return OpenAIProvider(api_key=openai_key, model=model)

    ollama_url = getattr(settings, "OLLAMA_URL", "") or ""
    if not ollama_url:
        logger.error("Neither OPENAI_API_KEY nor OLLAMA_URL is configured")
        return None

    default_model = getattr(settings, "OLLAMA_MODEL", "phi3:mini")
    model = default_model
    if role == "answer":
        model = getattr(settings, "OLLAMA_ANSWER_MODEL", "") or default_model

    logger.info(
        "AI provider: Ollama (%s @ %s) [role=%s]",
        model,
        ollama_url,
        role,
    )

    return OllamaProvider(
        base_url=ollama_url,
        model=model,
        num_gpu=getattr(settings, "OLLAMA_NUM_GPU", None),
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
    display_question: Optional[str] = None,
) -> ChatResponse:
    """
    Full AI assistant pipeline (RAG over SQL).

    1. Get configured provider.
    2. Ask LLM to generate SQL.                                   [CALL 1]
    3. Validate SQL via sql_guard.
    4. Execute against PostgreSQL.                                 <- retrieval
    5. Ask LLM to turn the retrieved rows into a natural,
       conversational answer, grounded strictly in those rows.    [CALL 2]
    6. Update per-user conversation memory.
    7. Log the interaction.
    8. Return ChatResponse.

    Args:
        language: 'en' or 'fr' — matches the frontend's LanguageContext.
                  Controls the language of the assistant's answer and of
                  any fallback/error message generated by this module.
        display_question: the user's original, un-enriched question text,
                  used for conversation memory and for the answer-synthesis
                  prompt. Falls back to `user_message` if not provided, so
                  existing callers keep working unchanged.
    """
    language = language if language in ("en", "fr") else "en"
    display_question = (display_question or user_message).strip()
    started_at = time.time()

    # ------------------------------------------------------------------
    # 0. Provider check
    # ------------------------------------------------------------------
    provider = get_provider(role="sql")
    if provider is None:
        return ChatResponse(
            answer=_msg("no_provider", language),
            sql=None,
            rows=None,
            error="no_provider",
        )

    # ------------------------------------------------------------------
    # 1. Generate SQL
    #
    # Recent conversation history is included here too (not just in the
    # answer-synthesis call) so that follow-up questions referring back
    # to a previous turn ("who has it?", "what about the available
    # ones?") have enough context to be translated into correct SQL
    # rather than failing or guessing.
    # ------------------------------------------------------------------
    history_for_sql = conversation_memory.get_history(requesting_user_id)
    history = history_for_sql  # same buffer; reused for the answer-synthesis call below
    sql_history_messages: List[Dict[str, str]] = []
    for past_question, past_answer in history_for_sql:
        sql_history_messages.append({"role": "user", "content": past_question})
        sql_history_messages.append({"role": "assistant", "content": past_answer})

    sql_messages = (
        [{"role": "system", "content": build_system_prompt(language)}]
        + sql_history_messages
        + [{"role": "user", "content": build_user_prompt(user_message)}]
    )

    try:
        logger.info("START SQL GENERATION")
        raw_llm = provider.complete(sql_messages)  # defaults: max_tokens=128, temperature=0.0, num_ctx=2048
        logger.info("END SQL GENERATION")
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
        answer = description or _msg("no_answer_found", language)
        _remember_turn(requesting_user_id, display_question, answer)
        _log(requesting_user_id, user_message, None, started_at)
        return ChatResponse(answer=answer, sql=None, rows=None)

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
    # 3. Execute query  (the "Retrieval" half of RAG)
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
            answer=_msg("execution_failed", language),
            sql=clean_sql,
            rows=None,
            error=str(exc),
        )

    # ------------------------------------------------------------------
    # 4. Natural-language answer generation (the "Augmented Generation"
    #    half of RAG) — strictly grounded in the rows retrieved above.
    # ------------------------------------------------------------------
    if not rows:
        answer = _msg("no_results", language)
    else:
        try:
            answer_provider = get_provider(role="answer") or provider
            answer = _generate_natural_answer(
                provider=answer_provider,
                language=language,
                question=display_question,
                sql=clean_sql,
                rows=rows,
                history=history,
            )
        except Exception:
            # Never let a flaky answer-synthesis call break the response —
            # degrade gracefully to a plain, still 100%-grounded listing.
            logger.exception(
                "Answer synthesis failed for user %d; falling back to plain row listing",
                requesting_user_id,
            )
            answer = _fallback_format_rows(rows, language)

    # ------------------------------------------------------------------
    # 5. Update conversation memory & log
    # ------------------------------------------------------------------
    _remember_turn(requesting_user_id, display_question, answer)
    _log(requesting_user_id, user_message, clean_sql, started_at)

    return ChatResponse(
        answer=answer.strip(),
        sql=clean_sql,
        rows=rows,
    )


# =============================================================================
# Answer synthesis helpers
# =============================================================================

def _serialize_rows_for_prompt(rows: List[Dict[str, Any]], limit: int) -> str:
    """
    Compact, token-efficient text serialization of retrieved rows, used as
    the grounding context fed to the LLM in CALL 2. Capping at `limit` rows
    keeps the prompt small even when the SQL query matched many rows; the
    full row set (up to MAX_ROWS) is still returned to the frontend
    separately for the "Show SQL" data table.
    """
    if not rows:
        return "(no rows)"

    limited = rows[:limit]
    lines = []
    for i, row in enumerate(limited, start=1):
        pairs = ", ".join(f"{k}={v}" for k, v in row.items())
        lines.append(f"{i}. {pairs}")

    text_block = "\n".join(lines)
    if len(rows) > limit:
        text_block += f"\n... and {len(rows) - limit} more row(s) not shown here (total matched: {len(rows)})."
    return text_block


def _generate_natural_answer(
    provider: AIProvider,
    language: str,
    question: str,
    sql: str,
    rows: List[Dict[str, Any]],
    history: List[Tuple[str, str]],
) -> str:
    """
    CALL 2: ask the LLM to turn retrieved SQL rows into a natural,
    conversational answer. Strictly grounded via the system prompt in
    prompts.build_answer_system_prompt — the model is instructed to use
    ONLY the rows passed in `data_block` and nothing else.
    """
    row_limit = getattr(settings, "AI_CONTEXT_ROW_LIMIT", 30)
    max_tokens = getattr(settings, "AI_ANSWER_MAX_TOKENS", 200)

    data_block = _serialize_rows_for_prompt(rows, row_limit)

    history_messages: List[Dict[str, str]] = []
    for past_question, past_answer in history:
        history_messages.append({"role": "user", "content": past_question})
        history_messages.append({"role": "assistant", "content": past_answer})

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
    raw = provider.complete(messages, max_tokens=max_tokens, temperature=0.3, num_ctx=answer_num_ctx)
    return raw.strip()


def _fallback_format_rows(rows: List[Dict[str, Any]], language: str) -> str:
    """
    Deterministic, dependency-free formatting of rows — used only if the
    answer-synthesis LLM call fails. Generic over any table's columns
    (unlike the old hard-coded items-table template), so it degrades
    sensibly for transactions/requests/users queries too.
    """
    if not rows:
        return _msg("no_results", language)

    lines = []
    for row in rows:
        parts = "; ".join(f"{k}: {v}" for k, v in row.items())
        lines.append(f"• {parts}")

    prefix = _msg("found_results", language, count=len(rows))
    return prefix + "\n\n" + "\n".join(lines)


def _remember_turn(user_id: int, question: str, answer: str) -> None:
    """Best-effort write to conversation memory; never blocks the response."""
    try:
        max_turns = getattr(settings, "AI_MAX_HISTORY_TURNS", conversation_memory.DEFAULT_MAX_TURNS)
        conversation_memory.add_turn(user_id, question, answer, max_turns=max_turns)
    except Exception:
        logger.exception("Failed to update conversation memory for user %d", user_id)


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