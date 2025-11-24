import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.user import User as UserModel
from schemas.user import User as UserSchema, UserCreate
from core.database import get_db

router = APIRouter()


@router.post("/sessions/{session_id}/users", response_model=UserSchema)
async def join_session(
    session_id: uuid.UUID,
    user_data: UserCreate,
    is_host: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    Join a session with a nickname.
    Creates a new user entry for this session.
    """
    new_user = UserModel(
        session_id=session_id,
        nickname=user_data.nickname,
        is_host=is_host
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Convert to dict and stringify UUIDs
    return UserSchema(
        id=str(new_user.id),
        session_id=str(new_user.session_id),
        nickname=new_user.nickname,
        is_host=new_user.is_host,
        joined_at=new_user.joined_at
    )


@router.get("/sessions/{session_id}/users", response_model=list[UserSchema])
async def get_session_users(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all users in a session.
    """
    query = select(UserModel).where(UserModel.session_id == session_id)
    result = await db.execute(query)
    users = result.scalars().all()
    
    # Convert UUIDs to strings
    return [
        UserSchema(
            id=str(user.id),
            session_id=str(user.session_id),
            nickname=user.nickname,
            is_host=user.is_host,
            joined_at=user.joined_at
        )
        for user in users
    ]
