from src.ai.intent import Intent, classify_intent
from src.ai.query_templates import maybe_build_template_sql
from src.ai.sql_generator import SQLGenerator
from src.ai.sql_guard import validate_sql


class FakeProvider:
    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = []

    def complete(self, messages, max_tokens=100, temperature=0.0, num_ctx=2048):
        self.calls.append(
            {
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "num_ctx": num_ctx,
            }
        )
        return self.replies.pop(0)


def test_intent_routes_general_inventory_explanation_away_from_sql():
    result = classify_intent("Explain inventory status.", has_history=False)

    assert result.intent == Intent.GENERAL_CHAT


def test_intent_routes_follow_up_to_sql_when_history_exists():
    result = classify_intent("Only Dell ones.", has_history=True)

    assert result.intent == Intent.INVENTORY_SQL


def test_sql_guard_rejects_wildcard_selects():
    ok, reason = validate_sql("SELECT * FROM items LIMIT 100;")

    assert not ok
    assert "Wildcard" in reason


def test_sql_guard_rejects_unknown_tables():
    ok, reason = validate_sql("SELECT id FROM pg_user LIMIT 100;")

    assert not ok
    assert "unknown" in reason.lower() or "disallowed" in reason.lower()


def test_sql_generator_retries_after_validation_failure():
    provider = FakeProvider(
        [
            "SELECT * FROM items LIMIT 100;",
            "SELECT i.id, i.name FROM items AS i ORDER BY i.name LIMIT 100;",
        ]
    )

    result = SQLGenerator(provider).generate(
        question="Show items",
        language="en",
        history_messages=[],
        history_summary="",
        last_sql="",
    )

    assert result.sql == "SELECT i.id, i.name FROM items AS i ORDER BY i.name LIMIT 100"
    assert result.attempts == 2
    assert len(provider.calls) == 2


def test_template_handles_inventory_statistics_without_llm():
    template = maybe_build_template_sql("User Question:\nShow inventory statistics.")

    assert template is not None
    assert "COUNT(*) AS item_records" in template.sql
    assert "FROM items AS i" in template.sql


def test_sql_generator_uses_template_before_provider():
    provider = FakeProvider(["NO_SQL"])

    result = SQLGenerator(provider).generate(
        question="User Question:\nShow laptops.",
        language="en",
        history_messages=[],
        history_summary="",
        last_sql="",
    )

    assert result.sql is not None
    assert "FROM items AS i" in result.sql
    assert len(provider.calls) == 0
