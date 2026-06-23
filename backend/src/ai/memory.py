"""
memory.py

Lightweight, in-process conversation memory for the AI Inventory Assistant.

Why this exists
----------------
To feel like ChatGPT, the assistant needs to remember the last few turns of
a conversation (e.g. "show me electronics" → "which of those are
available?"). The original `rag-chatbot-master` reference project used
LangChain's `ConversationBufferMemory` for this. Pulling in the full
LangChain dependency stack just for an in-memory message buffer is not
justified here, so this module reimplements the same idea — a small ring
buffer of (question, answer) pairs per user — with zero new dependencies
and zero database schema changes.

Design notes
------------
- Keyed by `user_id` (already available on every authenticated request).
- Bounded size (`maxlen`) so memory usage can never grow unbounded.
- TTL-based expiry so a stale browser tab doesn't resurrect a week-old
  conversation.
- Thread-safe via a single module-level lock (the buffers themselves are
  tiny, so contention is not a concern).
- Process-local: in a multi-worker / multi-pod deployment, conversation
  memory is per-process. This is a deliberate, documented trade-off (see
  CHANGES.md) to avoid introducing new infrastructure (e.g. Redis) for a
  "nice-to-have" continuity feature. If/when QStock adopts a shared cache,
  swapping the storage backend here is a localized change.
"""

import threading
import time
from collections import deque
from typing import Deque, Dict, List, Tuple

# (question, answer) pairs
_HistoryEntry = Tuple[str, str]

_LOCK = threading.Lock()
_STORE: Dict[int, Deque[_HistoryEntry]] = {}
_LAST_SEEN: Dict[int, float] = {}

DEFAULT_MAX_TURNS = 6
DEFAULT_TTL_SECONDS = 30 * 60  # 30 minutes of inactivity


def get_history(
    user_id: int,
    max_turns: int = DEFAULT_MAX_TURNS,
    ttl_seconds: int = DEFAULT_TTL_SECONDS,
) -> List[_HistoryEntry]:
    """Return the recent (question, answer) history for a user, oldest first."""
    with _LOCK:
        _expire_if_stale(user_id, ttl_seconds)
        buf = _STORE.get(user_id)
        if not buf:
            return []
        return list(buf)[-max_turns:]


def add_turn(
    user_id: int,
    question: str,
    answer: str,
    max_turns: int = DEFAULT_MAX_TURNS,
) -> None:
    """Record one (question, answer) turn for a user."""
    if not question or not answer:
        return
    with _LOCK:
        buf = _STORE.get(user_id)
        if buf is None or buf.maxlen != max_turns:
            buf = deque(buf or [], maxlen=max_turns)
            _STORE[user_id] = buf
        buf.append((question, answer))
        _LAST_SEEN[user_id] = time.time()


def clear(user_id: int) -> None:
    """Drop all stored history for a user (e.g. on explicit 'reset' action)."""
    with _LOCK:
        _STORE.pop(user_id, None)
        _LAST_SEEN.pop(user_id, None)


def _expire_if_stale(user_id: int, ttl_seconds: int) -> None:
    last_seen = _LAST_SEEN.get(user_id)
    if last_seen is not None and (time.time() - last_seen) > ttl_seconds:
        _STORE.pop(user_id, None)
        _LAST_SEEN.pop(user_id, None)
