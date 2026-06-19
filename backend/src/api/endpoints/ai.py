"""
ai.py  —  /api/ai  router

Exposes a single POST /api/ai/chat endpoint.
Reuses existing authentication (get_current_user) and DB session (get_db).
Does NOT modify any existing endpoint or model.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.core.security import get_current_user
from src.models.user import User
from src.ai.schemas import ChatRequest, ChatResponse
from src.ai import service as ai_service

router = APIRouter()


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Ask the AI inventory assistant a natural language question",
    description=(
        "Accepts a natural language question (English or French), generates a safe read-only SQL query, "
        "executes it against the inventory database, and returns a natural language answer in the requested language. "
        "Only authenticated users can access this endpoint."
    ),
)
async def chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatResponse:
    """
    AI chat endpoint.

    - Requires: valid Bearer token (any authenticated user).
    - Never executes INSERT / UPDATE / DELETE / DDL.
    - Results capped at 100 rows.
    - Query timeout: 30 seconds.
    - body.language ('en' or 'fr') controls the language of the answer,
      mirroring the frontend's existing LanguageContext.
    """
    return ai_service.handle_chat(
        db=db,
        user_message=body.message,
        requesting_user_id=current_user.id,
        language=body.language,
    )