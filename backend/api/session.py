import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from models.session import Session as SessionModel
from schemas.session import Session as SessionSchema, SessionCreate
from core.database import get_db

router = APIRouter()


@router.post("/sessions", response_model=SessionSchema, status_code=201)
async def create_session(
    session: SessionCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new session.
    A unique host_secret is generated and returned, which must be used by the host device.
    """
    new_session = SessionModel()
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return new_session


@router.get("/sessions/{session_id}", response_model=SessionSchema)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get session details by ID.
    """
    session = await db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    session = await db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Delete from DB (cascades to tracks and queue)
    await db.delete(session)
    await db.commit()
    
    # Delete static files
    import shutil
    import os
    session_dir = os.path.join("static", "sessions", str(session_id))
    if os.path.exists(session_dir):
        shutil.rmtree(session_dir)
        
    return None
