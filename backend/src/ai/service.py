"""
QStock AI assistant orchestration.

Architecture:
  user message
    -> intent classifier
    -> general assistant response OR SQL pipeline
    -> SQL generator with retry
    -> SQL guard
    -> read-only SQL executor
    -> grounded response generator
    -> structured conversation memory
"""

import logging
import re
import time
from abc import ABC, abstractmethod
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from src.ai import memory as conversation_memory
from src.ai.intent import Intent, classify_intent
from src.ai.prompts import build_clarification_answer
from src.ai.response_generator import (
    ResponseGenerator,
    can_answer_general_deterministically,
    deterministic_general_answer,
    fallback_format_rows,
)
from src.ai.schemas import ChatResponse
from src.ai.sql_executor import SQLExecutor, preview_rows
from src.ai.sql_generator import SQLGenerator
from src.core.config import settings


logger = logging.getLogger(__name__)


_MESSAGES = {
    "no_provider": {
        "en": "The AI Assistant is not configured. Please ask your administrator to set OPENAI_API_KEY or OLLAMA_URL in the server environment.",
        "fr": "L'assistant IA n'est pas configure. Veuillez demander a votre administrateur de definir OPENAI_API_KEY ou OLLAMA_URL dans l'environnement du serveur.",
    },
    "llm_unreachable": {
        "en": "I'm having trouble reaching the AI service right now. Please try again in a moment.",
        "fr": "J'ai du mal a contacter le service d'IA en ce moment. Veuillez reessayer dans un instant.",
    },
    "execution_failed": {
        "en": "I was unable to retrieve the data. The query may reference information that does not exist.",
        "fr": "Je n'ai pas pu recuperer les donnees. La requete fait peut-etre reference a des informations qui n'existent pas.",
    },
    "clarify": {
        "en": "Could you clarify which item, user, category, or date range you want me to check?",
        "fr": "Pouvez-vous preciser quel article, utilisateur, categorie ou intervalle de dates vous voulez verifier ?",
    },
}


def _msg(key: str, language: str) -> str:
    entry = _MESSAGES.get(key, {})
    return entry.get(language) or entry.get("en") or key


class AIProvider(ABC):
    """Common interface every LLM backend must implement."""

    @abstractmethod
    def complete(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 100,
        temperature: float = 0.0,
        num_ctx: int = 2048,
    ) -> str:
        raise NotImplementedError


class OllamaProvider(AIProvider):
    """Local Ollama provider."""

    # ROOT CAUSE of the ReadTimeout: this used to be `httpx.Client(timeout=60)`,
    # a single scalar that applies to connect/read/write/pool *equally*. The
    # failure always happened at "about 60 seconds" because the *read* timeout
    # (waiting for Ollama to finish generating tokens) was being capped at the
    # same 60s meant for connect/write. A large system prompt + an 8B model
    # can legitimately take longer than 60s to prefill+generate, especially
    # without a fast GPU. Using an explicit httpx.Timeout fixes this without
    # disabling timeouts altogether (connect/write/pool stay tight so a truly
    # unreachable Ollama still fails fast).
    _client = httpx.Client(
        timeout=httpx.Timeout(
            connect=getattr(settings, "OLLAMA_CONNECT_TIMEOUT", 30.0),
            read=getattr(settings, "OLLAMA_READ_TIMEOUT", 300.0),
            write=getattr(settings, "OLLAMA_WRITE_TIMEOUT", 30.0),
            pool=getattr(settings, "OLLAMA_POOL_TIMEOUT", 30.0),
        ),
        limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
    )

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "phi3:mini",
        num_gpu: Optional[int] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.num_gpu = num_gpu
        self.last_elapsed: float = 0.0

    def complete(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 100,
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
            # IMPORTANT: qwen3 is a hybrid "thinking" model. Ollama's chat API
            # defaults thinking ON for it unless `think` is set as a TOP-LEVEL
            # request field (not inside `options`). Without this, qwen3 burns
            # part — sometimes all — of `num_predict` on an invisible <think>
            # trace before/instead of emitting the actual SQL, which both
            # slows every request down and risks an empty `content` field on
            # tight token budgets (see ollama/ollama#14793).
            "think": getattr(settings, "OLLAMA_THINK", False),
            "options": options,
        }

        started_at = time.time()
        print(
            f"--- OLLAMA REQUEST --- model={self.model} num_messages={len(messages)} "
            f"max_tokens={max_tokens} temperature={temperature} num_ctx={num_ctx} "
            f"num_gpu={self.num_gpu} think={payload['think']}"
        )
        try:
            response = self._client.post(f"{self.base_url}/api/chat", json=payload)
        finally:
            self.last_elapsed = time.time() - started_at
        logger.info("OLLAMA HTTP TOOK %.2fs", self.last_elapsed)
        print(f"--- OLLAMA RESPONSE --- status={response.status_code} elapsed={self.last_elapsed:.2f}s")
        response.raise_for_status()
        return response.json()["message"]["content"]


class OpenAIProvider(AIProvider):
    """OpenAI chat-completions provider using httpx to avoid extra SDK deps."""

    _client = httpx.Client(timeout=httpx.Timeout(connect=15.0, read=120.0, write=15.0, pool=15.0))

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model
        self.last_elapsed: float = 0.0

    def complete(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 100,
        temperature: float = 0.0,
        num_ctx: int = 2048,  # noqa: ARG002
    ) -> str:
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        started_at = time.time()
        try:
            response = self._client.post(
                "https://api.openai.com/v1/chat/completions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )
        finally:
            self.last_elapsed = time.time() - started_at
        logger.info("OPENAI HTTP TOOK %.2fs", self.last_elapsed)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]


def get_provider(role: str = "sql") -> Optional[AIProvider]:
    """Return the configured AI provider for SQL or answer generation."""
    openai_key = (getattr(settings, "OPENAI_API_KEY", "") or "").strip()
    if openai_key:
        default_model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
        model = default_model
        if role == "answer":
            model = getattr(settings, "OPENAI_ANSWER_MODEL", "") or default_model
        logger.info("AI provider: OpenAI (%s) [role=%s]", model, role)
        print(f"=========================\nProvider: OpenAI\nModel: {model}\nRole: {role}\n=========================")
        return OpenAIProvider(api_key=openai_key, model=model)

    ollama_url = getattr(settings, "OLLAMA_URL", "") or ""
    if not ollama_url:
        logger.error("Neither OPENAI_API_KEY nor OLLAMA_URL is configured")
        return None

    default_model = getattr(settings, "OLLAMA_MODEL", "qwen3:8b")
    model = default_model
    if role == "answer":
        model = getattr(settings, "OLLAMA_ANSWER_MODEL", "") or default_model
    logger.info("AI provider: Ollama (%s @ %s) [role=%s]", model, ollama_url, role)
    print(
        "=========================\n"
        "Provider: Ollama\n"
        f"URL: {ollama_url}\n"
        f"Model: {model}\n"
        f"Role: {role}\n"
        f"OLLAMA_MODEL setting: {getattr(settings, 'OLLAMA_MODEL', None)!r}\n"
        f"OLLAMA_ANSWER_MODEL setting: {getattr(settings, 'OLLAMA_ANSWER_MODEL', None)!r}\n"
        "========================="
    )
    return OllamaProvider(
        base_url=ollama_url,
        model=model,
        num_gpu=getattr(settings, "OLLAMA_NUM_GPU", None),
    )


def handle_chat(
    db: Session,
    user_message: str,
    requesting_user_id: int,
    language: str = "en",
    display_question: Optional[str] = None,
) -> ChatResponse:
    """Main AI assistant pipeline used by the FastAPI endpoint."""
    language = language if language in ("en", "fr") else "en"
    display_question = (display_question or user_message).strip()
    started_at = time.time()

    max_turns = getattr(settings, "AI_MAX_HISTORY_TURNS", conversation_memory.DEFAULT_MAX_TURNS)
    history = conversation_memory.get_history(requesting_user_id, max_turns=max_turns)
    history_messages = _history_to_messages(history)
    history_summary = conversation_memory.get_context_summary(requesting_user_id, max_turns=max_turns)
    last_sql = conversation_memory.get_last_sql(requesting_user_id)

    intent_result = classify_intent(display_question, has_history=bool(history))
    logger.info(
        "AI intent | user_id=%d | intent=%s | confidence=%.2f | reason=%s",
        requesting_user_id,
        intent_result.intent.value,
        intent_result.confidence,
        intent_result.reason,
    )

    provider = get_provider(role="sql")
    sql_model = getattr(provider, "model", "n/a") if provider else "n/a"
    answer_model_setting = getattr(settings, "OLLAMA_ANSWER_MODEL", "") or getattr(settings, "OLLAMA_MODEL", "n/a")
    print(
        "=========================\n"
        f"Provider: {'OpenAI' if getattr(settings, 'OPENAI_API_KEY', '') else 'Ollama'}\n"
        f"Model: {sql_model}\n"
        f"Answer Model: {answer_model_setting}\n"
        "========================="
    )
    if provider is None and intent_result.intent == Intent.GENERAL_CHAT:
        answer = deterministic_general_answer(display_question, language)
        _remember_turn(requesting_user_id, display_question, answer, intent=Intent.GENERAL_CHAT.value)
        _log(requesting_user_id, display_question, None, started_at, intent=Intent.GENERAL_CHAT.value)
        return ChatResponse(answer=answer, sql=None, rows=None)

    if provider is None:
        return ChatResponse(answer=_msg("no_provider", language), sql=None, rows=None, error="no_provider")

    if intent_result.intent == Intent.GENERAL_CHAT:
        return _handle_general_chat(
            provider=provider,
            requesting_user_id=requesting_user_id,
            question=display_question,
            language=language,
            started_at=started_at,
        )

    return _handle_sql_chat(
        db=db,
        provider=provider,
        requesting_user_id=requesting_user_id,
        user_message=user_message,
        display_question=display_question,
        language=language,
        started_at=started_at,
        history_messages=history_messages,
        history_summary=history_summary,
        last_sql=last_sql,
    )


def _handle_general_chat(
    *,
    provider: AIProvider,
    requesting_user_id: int,
    question: str,
    language: str,
    started_at: float,
) -> ChatResponse:
    if can_answer_general_deterministically(question):
        answer = deterministic_general_answer(question, language)
        _remember_turn(requesting_user_id, question, answer, intent=Intent.GENERAL_CHAT.value)
        _log(requesting_user_id, question, None, started_at, intent=Intent.GENERAL_CHAT.value)
        return ChatResponse(answer=answer, sql=None, rows=None)

    try:
        answer_provider = get_provider(role="answer") or provider
        answer = ResponseGenerator(answer_provider).general_answer(language=language, question=question)
    except Exception:
        logger.exception("General AI answer failed; using deterministic fallback")
        answer = deterministic_general_answer(question, language)

    _remember_turn(requesting_user_id, question, answer, intent=Intent.GENERAL_CHAT.value)
    _log(requesting_user_id, question, None, started_at, intent=Intent.GENERAL_CHAT.value)
    return ChatResponse(answer=answer, sql=None, rows=None)


def _handle_sql_chat(
    *,
    db: Session,
    provider: AIProvider,
    requesting_user_id: int,
    user_message: str,
    display_question: str,
    language: str,
    started_at: float,
    history_messages: list[dict[str, str]],
    history_summary: str,
    last_sql: str,
) -> ChatResponse:
    timing: dict[str, float] = {}
    try:
        generation = SQLGenerator(provider).generate(
            question=user_message,
            language=language,
            history_messages=history_messages,
            history_summary=history_summary,
            last_sql=last_sql,
            timing=timing,
        )
    except Exception as exc:
        logger.exception("LLM SQL generation failed")
        _print_timing(timing, started_at, execution=0.0, answer=0.0)
        return ChatResponse(answer=_msg("llm_unreachable", language), sql=None, rows=None, error=str(exc))

    if generation.sql is None:
        answer = build_clarification_answer(language, generation.description) or _msg("clarify", language)
        _remember_turn(requesting_user_id, display_question, answer, intent=Intent.INVENTORY_SQL.value)
        _log(requesting_user_id, user_message, generation.raw_sql, started_at, intent=Intent.INVENTORY_SQL.value)
        _print_timing(timing, started_at, execution=0.0, answer=0.0)
        return ChatResponse(answer=answer, sql=None, rows=None, error=generation.error)

    clean_sql = _normalize_enum_ilike(generation.sql)
    logger.info("FINAL SQL: %s", clean_sql)

    exec_started = time.time()
    try:
        rows = SQLExecutor().execute(db, clean_sql)
    except Exception as exc:
        db.rollback()
        execution_time = time.time() - exec_started
        logger.exception("SQL execution error for user %d | SQL: %s", requesting_user_id, clean_sql)
        _log(requesting_user_id, user_message, clean_sql, started_at, intent=Intent.INVENTORY_SQL.value)
        _print_timing(timing, started_at, execution=execution_time, answer=0.0)
        return ChatResponse(answer=_msg("execution_failed", language), sql=clean_sql, rows=None, error=str(exc))
    execution_time = time.time() - exec_started

    answer_provider = get_provider(role="answer") or provider
    response_generator = ResponseGenerator(answer_provider)
    answer_started = time.time()
    try:
        if rows:
            answer = response_generator.answer_from_rows(
                language=language,
                question=display_question,
                sql=clean_sql,
                rows=rows,
                history_messages=history_messages,
            )
        else:
            answer = response_generator.empty_result_answer(
                language=language,
                question=display_question,
                sql=clean_sql,
                history_summary=history_summary,
            )
    except Exception:
        logger.exception("Answer synthesis failed; using deterministic fallback")
        answer = fallback_format_rows(rows, language)
    answer_time = time.time() - answer_started

    _remember_turn(
        requesting_user_id,
        display_question,
        answer,
        sql=clean_sql,
        row_preview=preview_rows(rows),
        intent=Intent.INVENTORY_SQL.value,
    )
    _log(requesting_user_id, user_message, clean_sql, started_at, intent=Intent.INVENTORY_SQL.value)
    _print_timing(timing, started_at, execution=execution_time, answer=answer_time)
    return ChatResponse(answer=answer.strip(), sql=clean_sql, rows=rows)


def _print_timing(timing: dict[str, float], started_at: float, execution: float, answer: float) -> None:
    """Print the AI Timing breakdown requested for performance diagnosis.

    `Ollama` below is specifically the SQL-generation model call(s) (summed
    across retry attempts, if any). The answer-synthesis model call has its
    own separate timer (`Answer`) since it may use a different model/provider.
    """
    prompt_ms = timing.get("prompt_build", 0.0) * 1000
    ollama_s = timing.get("ollama_sql", 0.0)
    validation_ms = timing.get("validation", 0.0) * 1000
    execution_ms = execution * 1000
    total_s = time.time() - started_at
    print(
        "=========================\n"
        "AI Timing\n"
        f"Prompt: {prompt_ms:.0f} ms\n"
        f"Ollama: {ollama_s:.1f} s\n"
        f"Validation: {validation_ms:.0f} ms\n"
        f"Execution: {execution_ms:.0f} ms\n"
        f"Answer: {answer:.1f} s\n"
        f"Total: {total_s:.1f} s\n"
        "========================="
    )


def _history_to_messages(history: list[tuple[str, str]]) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    for past_question, past_answer in history:
        messages.append({"role": "user", "content": past_question})
        messages.append({"role": "assistant", "content": past_answer})
    return messages


def _normalize_enum_ilike(sql: str) -> str:
    """Preserve compatibility with earlier enum text-casting behavior."""
    clean_sql = re.sub(r"\bcategory\s+ILIKE\b", "category::text ILIKE", sql, flags=re.IGNORECASE)
    clean_sql = re.sub(r"\bstatus\s+ILIKE\b", "status::text ILIKE", clean_sql, flags=re.IGNORECASE)
    return clean_sql


def _remember_turn(
    user_id: int,
    question: str,
    answer: str,
    sql: str = "",
    row_preview: str = "",
    intent: str = "",
) -> None:
    try:
        max_turns = getattr(settings, "AI_MAX_HISTORY_TURNS", conversation_memory.DEFAULT_MAX_TURNS)
        conversation_memory.add_turn(
            user_id,
            question,
            answer,
            max_turns=max_turns,
            sql=sql,
            row_preview=row_preview,
            intent=intent,
        )
    except Exception:
        logger.exception("Failed to update conversation memory for user %d", user_id)


def _log(user_id: int, question: str, sql: Optional[str], started_at: float, intent: str) -> None:
    elapsed = round(time.time() - started_at, 3)
    logger.info(
        "AI_AUDIT | user_id=%d | intent=%s | elapsed=%.3fs | sql=%s | question=%r",
        user_id,
        intent,
        elapsed,
        repr(sql),
        question,
    )