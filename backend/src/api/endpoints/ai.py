from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.core.security import get_current_user
from src.models.user import User
from src.ai.schemas import ChatRequest, ChatResponse
from src.ai import service as ai_service

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatResponse:
    enriched_message = f"""
Authenticated User:
id={current_user.id}
name={current_user.full_name}
email={current_user.email}
department={current_user.department}
is_admin={current_user.is_admin}

User Question:
{body.message}
"""

    return ai_service.handle_chat(
        db=db,
        user_message=enriched_message,
        requesting_user_id=current_user.id,
        language=body.language,
    )