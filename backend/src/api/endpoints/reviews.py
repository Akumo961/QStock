"""
API endpoints for managing reviews/feedback for borrowed items.
Employees can submit reviews after returning items.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime, timedelta

# Imports directs - pas via d'autres modules pour éviter les cercles
from src.core.database import get_db
from src.models.review import Review
from src.models.transaction import Transaction
from src.models.user import User
from src.models.item import Item

# Schémas
from pydantic import BaseModel, ConfigDict, Field, validator
from datetime import datetime


# Définir les schémas ici ou les importer directement
# Option 1: Définir les schémas dans ce fichier (plus simple pour éviter les imports circulaires)
# Option 2: Importer depuis src.schemas.review_schema (si pas de cercle)

# ========= SCHÉMAS =========
class ReviewBase(BaseModel):
    """Base Review schema"""
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: Optional[str] = Field(None, max_length=500, description="Optional comment")
    item_condition: Optional[str] = Field(None, description="Condition of item: good, fair, poor, damaged, missing")

    @validator('rating')
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v

    @validator('item_condition')
    def validate_condition(cls, v):
        if v is not None:
            allowed = ['good', 'fair', 'poor', 'damaged', 'missing']
            if v not in allowed:
                raise ValueError(f'Condition must be one of: {", ".join(allowed)}')
        return v


class ReviewCreate(ReviewBase):
    """Schema for creating a review"""
    transaction_id: int = Field(..., description="ID of the transaction being reviewed")


class ReviewUpdate(BaseModel):
    """Schema for updating a review"""
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=500)
    item_condition: Optional[str] = None


class ReviewInDB(ReviewBase):
    """Schema for review from database"""
    id: int
    transaction_id: int
    user_id: int
    item_id: int
    user_name: str
    item_name: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ReviewResponse(ReviewInDB):
    """Full review response"""
    pass


class ReviewSummary(BaseModel):
    """Summary statistics for reviews"""
    total_reviews: int
    average_rating: float
    rating_distribution: dict
    condition_breakdown: dict
    recent_reviews: List[ReviewInDB]


# ========= ROUTER =========
router = APIRouter(
    tags=["reviews"],
    responses={404: {"description": "Review not found"}}
)


# ========= ENDPOINTS =========

@router.post("/", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
        review: ReviewCreate,
        db: Session = Depends(get_db)
):
    """
    Create a new review for a transaction.

    - **transaction_id**: ID of the completed transaction
    - **rating**: 1-5 rating
    - **comment**: Optional text feedback
    - **item_condition**: Condition of item (good, fair, poor, damaged, missing)
    """
    # Vérifier si la transaction existe
    transaction = db.query(Transaction).filter(Transaction.id == review.transaction_id).first()
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    # Vérifier si la transaction est déjà retournée (pour pouvoir la reviewer)
    if not transaction.return_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot review an item that hasn't been returned yet"
        )

    # Vérifier si une review existe déjà pour cette transaction
    existing_review = db.query(Review).filter(Review.transaction_id == review.transaction_id).first()
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A review already exists for this transaction"
        )

    # Récupérer les infos utilisateur et objet
    user = db.query(User).filter(User.id == transaction.user_id).first()
    item = db.query(Item).filter(Item.id == transaction.item_id).first()

    # Créer la review
    db_review = Review(
        transaction_id=review.transaction_id,
        user_id=transaction.user_id,
        item_id=transaction.item_id,
        rating=review.rating,
        comment=review.comment,
        item_condition=review.item_condition,
        created_at=datetime.now()
    )

    try:
        db.add(db_review)
        db.commit()
        db.refresh(db_review)

        # Ajouter les noms pour la réponse
        response = ReviewInDB(
            **db_review.__dict__,
            user_name=user.full_name if user else "Unknown",
            item_name=item.name if item else "Unknown"
        )

        return response
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating review: {str(e)}"
        )


@router.get("/", response_model=List[ReviewInDB])
async def get_all_reviews(
        skip: int = Query(0, ge=0, description="Number of reviews to skip"),
        limit: int = Query(100, ge=1, le=1000, description="Number of reviews to return"),
        item_id: Optional[int] = Query(None, description="Filter by item ID"),
        user_id: Optional[int] = Query(None, description="Filter by user ID"),
        min_rating: Optional[int] = Query(None, ge=1, le=5, description="Minimum rating"),
        condition: Optional[str] = Query(None, description="Filter by item condition"),
        db: Session = Depends(get_db)
):
    """
    Get all reviews with optional filters.
    """
    query = db.query(Review)

    # Appliquer les filtres
    if item_id:
        query = query.filter(Review.item_id == item_id)
    if user_id:
        query = query.filter(Review.user_id == user_id)
    if min_rating:
        query = query.filter(Review.rating >= min_rating)
    if condition:
        query = query.filter(Review.item_condition == condition)

    # Pagination
    reviews = query.order_by(desc(Review.created_at)).offset(skip).limit(limit).all()

    # Enrichir avec les noms
    result = []
    for review in reviews:
        user = db.query(User).filter(User.id == review.user_id).first()
        item = db.query(Item).filter(Item.id == review.item_id).first()
        result.append(ReviewInDB(
            **review.__dict__,
            user_name=user.full_name if user else "Unknown",
            item_name=item.name if item else "Unknown"
        ))

    return result


@router.get("/summary", response_model=ReviewSummary)
async def get_review_summary(
        days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
        db: Session = Depends(get_db)
):
    """
    Get summary statistics for reviews.
    """
    # Date limite
    since_date = datetime.now() - timedelta(days=days)

    # Requête de base
    reviews_query = db.query(Review).filter(Review.created_at >= since_date)
    total_reviews = reviews_query.count()

    if total_reviews == 0:
        return ReviewSummary(
            total_reviews=0,
            average_rating=0.0,
            rating_distribution={},
            condition_breakdown={},
            recent_reviews=[]
        )

    # Moyenne des notes
    avg_rating = db.query(Review.rating).filter(Review.created_at >= since_date).all()
    average_rating = sum(r[0] for r in avg_rating) / total_reviews

    # Distribution des notes
    rating_dist = {}
    for i in range(1, 6):
        count = db.query(Review).filter(
            Review.rating == i,
            Review.created_at >= since_date
        ).count()
        if count > 0:
            rating_dist[str(i)] = count

    # Breakdown des conditions
    condition_breakdown = {}
    conditions = ['good', 'fair', 'poor', 'damaged', 'missing']
    for condition in conditions:
        count = db.query(Review).filter(
            Review.item_condition == condition,
            Review.created_at >= since_date
        ).count()
        if count > 0:
            condition_breakdown[condition] = count

    # Reviews récentes
    recent = reviews_query.order_by(desc(Review.created_at)).limit(10).all()
    recent_reviews = []
    for review in recent:
        user = db.query(User).filter(User.id == review.user_id).first()
        item = db.query(Item).filter(Item.id == review.item_id).first()
        recent_reviews.append(ReviewInDB(
            **review.__dict__,
            user_name=user.full_name if user else "Unknown",
            item_name=item.name if item else "Unknown"
        ))

    return ReviewSummary(
        total_reviews=total_reviews,
        average_rating=round(average_rating, 2),
        rating_distribution=rating_dist,
        condition_breakdown=condition_breakdown,
        recent_reviews=recent_reviews
    )


@router.get("/{review_id}", response_model=ReviewInDB)
async def get_review_by_id(
        review_id: int,
        db: Session = Depends(get_db)
):
    """
    Get a specific review by ID.
    """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )

    user = db.query(User).filter(User.id == review.user_id).first()
    item = db.query(Item).filter(Item.id == review.item_id).first()

    return ReviewInDB(
        **review.__dict__,
        user_name=user.full_name if user else "Unknown",
        item_name=item.name if item else "Unknown"
    )


@router.get("/transaction/{transaction_id}", response_model=ReviewInDB)
async def get_review_by_transaction(
        transaction_id: int,
        db: Session = Depends(get_db)
):
    """
    Get review associated with a specific transaction.
    """
    review = db.query(Review).filter(Review.transaction_id == transaction_id).first()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No review found for this transaction"
        )

    user = db.query(User).filter(User.id == review.user_id).first()
    item = db.query(Item).filter(Item.id == review.item_id).first()

    return ReviewInDB(
        **review.__dict__,
        user_name=user.full_name if user else "Unknown",
        item_name=item.name if item else "Unknown"
    )


@router.get("/user/{user_id}", response_model=List[ReviewInDB])
async def get_reviews_by_user(
        user_id: int,
        skip: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=100),
        db: Session = Depends(get_db)
):
    """
    Get all reviews submitted by a specific user.
    """
    # Vérifier si l'utilisateur existe
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    reviews = db.query(Review).filter(
        Review.user_id == user_id
    ).order_by(desc(Review.created_at)).offset(skip).limit(limit).all()

    result = []
    for review in reviews:
        item = db.query(Item).filter(Item.id == review.item_id).first()
        result.append(ReviewInDB(
            **review.__dict__,
            user_name=user.full_name,
            item_name=item.name if item else "Unknown"
        ))

    return result


@router.get("/item/{item_id}", response_model=List[ReviewInDB])
async def get_reviews_by_item(
        item_id: int,
        skip: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=100),
        db: Session = Depends(get_db)
):
    """
    Get all reviews for a specific item.
    """
    # Vérifier si l'item existe
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    reviews = db.query(Review).filter(
        Review.item_id == item_id
    ).order_by(desc(Review.created_at)).offset(skip).limit(limit).all()

    result = []
    for review in reviews:
        user = db.query(User).filter(User.id == review.user_id).first()
        result.append(ReviewInDB(
            **review.__dict__,
            user_name=user.full_name if user else "Unknown",
            item_name=item.name
        ))

    return result


@router.put("/{review_id}", response_model=ReviewInDB)
async def update_review(
        review_id: int,
        review_update: ReviewUpdate,
        db: Session = Depends(get_db)
):
    """
    Update an existing review.
    """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )

    # Mettre à jour seulement les champs fournis
    update_data = review_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(review, field, value)

    review.updated_at = datetime.now()

    try:
        db.commit()
        db.refresh(review)

        user = db.query(User).filter(User.id == review.user_id).first()
        item = db.query(Item).filter(Item.id == review.item_id).first()

        return ReviewInDB(
            **review.__dict__,
            user_name=user.full_name if user else "Unknown",
            item_name=item.name if item else "Unknown"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating review: {str(e)}"
        )


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
        review_id: int,
        db: Session = Depends(get_db)
):
    """
    Delete a review (admin only - à implémenter avec authentification).
    """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )

    try:
        db.delete(review)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting review: {str(e)}"
        )

    return None


@router.get("/stats/item/{item_id}")
async def get_item_review_stats(
        item_id: int,
        db: Session = Depends(get_db)
):
    """
    Get review statistics for a specific item.
    """
    # Vérifier si l'item existe
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    reviews = db.query(Review).filter(Review.item_id == item_id).all()

    if not reviews:
        return {
            "item_id": item_id,
            "item_name": item.name,
            "total_reviews": 0,
            "average_rating": None,
            "condition_report": {}
        }

    avg_rating = sum(r.rating for r in reviews) / len(reviews)

    # Compter les conditions
    condition_counts = {}
    for review in reviews:
        if review.item_condition:
            condition_counts[review.item_condition] = condition_counts.get(review.item_condition, 0) + 1

    return {
        "item_id": item_id,
        "item_name": item.name,
        "total_reviews": len(reviews),
        "average_rating": round(avg_rating, 2),
        "condition_report": condition_counts
    }