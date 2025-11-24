import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from schemas.queue import QueueItem, QueueList
from core.database import get_db
from schemas.track import TrackCreate
from services import queue_service


router = APIRouter()


@router.post("/sessions/{session_id}/queue", response_model=QueueItem, status_code=status.HTTP_201_CREATED)
async def add_track_to_queue(
    session_id: uuid.UUID,
    track_request: TrackCreate,
    user_id: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Adds a track to a session's queue.
    """
    try:
        return await queue_service.add_track_to_queue(session_id, str(track_request.source_url), user_id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/sessions/{session_id}/queue", response_model=QueueList)
async def get_queue(
    session_id: uuid.UUID, 
    user_id: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the current queue for a given session, ordered by position.
    """
    queue_items = await queue_service.get_queue(session_id, user_id, db)
    return {"items": queue_items}


@router.post("/sessions/{session_id}/queue/pop", response_model=QueueItem | None)
async def pop_queue(session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Removes the first item from the queue and returns it to be played.
    """
    popped_item = await queue_service.pop_next_track(session_id, db)
    if not popped_item:
        raise HTTPException(status_code=404, detail="Queue is empty")
    return popped_item

from fastapi import UploadFile, File, Form
from services import file_service
import mutagen
from mutagen.mp3 import MP3

@router.post("/sessions/{session_id}/queue/upload", response_model=QueueItem)
async def upload_track(
    session_id: uuid.UUID,
    file: UploadFile = File(...),
    user_id: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    # Validate content type
    if file.content_type not in ["audio/mpeg", "audio/mp3"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only MP3 files are allowed.")

    # Save file
    file_path, file_hash = await file_service.save_upload_file(session_id, file)
    
    # Check if a track with this hash already exists in the session
    # This prevents storing duplicate files
    from models import Track
    from sqlalchemy import select
    
    query = select(Track).where(
        Track.session_id == session_id,
        Track.canonical_id == file_hash
    )
    result = await db.execute(query)
    existing_track = result.scalar_one_or_none()
    
    if existing_track:
        # Duplicate file found!
        # Delete the newly uploaded file to save space
        import os
        abs_path = file_path.lstrip("/")
        if os.path.exists(abs_path):
            os.remove(abs_path)
            
        # Use the existing track's path and metadata
        file_path = existing_track.source_url
        title = existing_track.title
        duration = existing_track.duration
        # We can update title if needed, but let's keep it simple for now
        # or maybe we want to use the new title?
        # For now, let's just proceed with adding it to the queue
        # The queue service will handle the "already in queue" check
        
    else:
        # New file, validate metadata
        # Get metadata (duration)
        # We need the absolute path for mutagen
        # file_path is relative: /static/sessions/...
        # We assume run from backend root
        abs_path = file_path.lstrip("/")
        
        duration = 0
        title = file.filename
        
        try:
            audio = MP3(abs_path)
            duration = int(audio.info.length)
            # Try to get title from tags
            if audio.tags and 'TIT2' in audio.tags:
                 title = str(audio.tags['TIT2'])
        except Exception as e:
            print(f"Error reading metadata: {e}")
            # Delete the invalid file
            import os
            if os.path.exists(abs_path):
                os.remove(abs_path)
            raise HTTPException(status_code=400, detail="Invalid audio file. Could not read metadata.")
        
    # Add to queue
    try:
        return await queue_service.add_file_to_queue(session_id, title, file_path, duration, file_hash, user_id, db)
    except ValueError as e:
        # If it was a new file upload (no existing_track) and adding to queue failed,
        # we should clean up the uploaded file to prevent orphans.
        
        if not existing_track:
             import os
             abs_path = file_path.lstrip("/")
             if os.path.exists(abs_path):
                os.remove(abs_path)
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sessions/{session_id}/queue/{queue_item_id}/vote", response_model=QueueItem)
async def vote_on_track(
    session_id: uuid.UUID,
    queue_item_id: uuid.UUID,
    vote_data: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    Vote on a track in the queue.
    vote: +1 for upvote, -1 for downvote
    """
    vote = vote_data.get("vote", 0)
    if vote not in [-1, 1]:
        raise HTTPException(status_code=400, detail="Vote must be -1 or 1")
    
    user_id = vote_data.get("user_id")
    # We could also get it from a dependency if we had auth, but for now we trust the client sends it
    # Actually, let's enforce it.
    if not user_id:
         raise HTTPException(status_code=400, detail="User ID is required")

    try:
        queue_item = await queue_service.vote_track(session_id, queue_item_id, vote, user_id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    if not queue_item:
        raise HTTPException(status_code=404, detail="Track not found in queue")
    return queue_item
