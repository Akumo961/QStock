"""Intent detection for the QStock assistant."""

from dataclasses import dataclass
from enum import Enum
import re


class Intent(str, Enum):
    INVENTORY_SQL = "inventory_sql"
    GENERAL_CHAT = "general_chat"


@dataclass(frozen=True)
class IntentResult:
    intent: Intent
    confidence: float
    reason: str


_DATA_ACTION_RE = re.compile(
    r"\b("
    r"show|list|find|search|which|who|what|when|where|how many|count|"
    r"compare|statistics|stats|highest|lowest|most|least|borrowed|available|"
    r"maintenance|overdue|stock|inventory|items?|users?|transactions?|requests?"
    r")\b",
    re.IGNORECASE,
)

_GENERAL_RE = re.compile(
    r"\b("
    r"what can you do|help|explain|how do you work|what is low stock|"
    r"what does low stock mean|what is available|what does available mean|"
    r"inventory status|statuses|status mean|examples?"
    r")\b",
    re.IGNORECASE,
)

_FOLLOW_UP_RE = re.compile(
    r"\b("
    r"only|those|ones|them|that|these|available|borrowed|dell|hp|apple|"
    r"lenovo|maintenance|overdue|current|now|this month|which are|who has"
    r")\b",
    re.IGNORECASE,
)


def classify_intent(message: str, has_history: bool = False) -> IntentResult:
    """Classify whether a message needs live SQL retrieval or general chat."""
    text = " ".join((message or "").strip().split())
    lowered = text.lower()

    if not text:
        return IntentResult(Intent.GENERAL_CHAT, 1.0, "empty message")

    has_data_action = bool(_DATA_ACTION_RE.search(lowered))
    is_general = bool(_GENERAL_RE.search(lowered))

    if is_general and not has_data_action:
        return IntentResult(Intent.GENERAL_CHAT, 0.92, "general assistant question")

    if is_general and not any(token in lowered for token in ("item", "user", "borrow", "how many", "show", "list", "which")):
        return IntentResult(Intent.GENERAL_CHAT, 0.74, "general inventory concept")

    if has_data_action:
        return IntentResult(Intent.INVENTORY_SQL, 0.9, "asks for live inventory data")

    if has_history and _FOLLOW_UP_RE.search(lowered):
        return IntentResult(Intent.INVENTORY_SQL, 0.78, "follow-up to previous data question")

    return IntentResult(Intent.GENERAL_CHAT, 0.62, "no live data request detected")
