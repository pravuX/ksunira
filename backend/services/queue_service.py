import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from models.session import Session as SessionModel
from models.track import Track as TrackModel, SourceType
from models.queue import Queue as QueueModel
from models.user import User as UserModel
from schemas.queue import QueueItem
from services import yt_service
from core.websocket_manager import manager

async def _add_track_to_db_and_queue(session_id: uuid.UUID, track: TrackModel, db: AsyncSession) -> QueueModel:
    """Helper to add a track to the database and queue, and broadcast update."""
    
    # Check for duplicates in the active queue
    if track.canonical_id:
        # Check if this track ID is already in the queue for this session
        # We need to join Queue -> Track
        query = (
            select(QueueModel)
            .join(QueueModel.track)
            .where(
                QueueModel.session_id == session_id,
                TrackModel.canonical_id == track.canonical_id
            )
        )
        result = await db.execute(query)
        existing_item = result.scalar_one_or_none()
        
        if existing_item:
            raise ValueError("This track is already in the queue!")

    db.add(track)
    await db.flush()

    # Find the next position in the queue
    max_pos_result = await db.execute(select(func.max(QueueModel.position)).where(QueueModel.session_id == session_id))
    max_pos = max_pos_result.scalar_one_or_none()
    next_position = (max_pos + 1) if max_pos is not None else 0

    # Create a new Queue record
    new_queue_item = QueueModel(
        session_id=session_id,
        track_id=track.id,
        position=next_position
    )
    db.add(new_queue_item)
    await db.flush()
    new_queue_item_id = new_queue_item.id

    # Commit to the database
    await db.commit()

    # Reload to get relationships
    query = (
        select(QueueModel)
        .where(QueueModel.id == new_queue_item_id)
        .options(selectinload(QueueModel.track))
    )
    result = await db.execute(query)
    final_queue_item = result.scalar_one()

    # Broadcast queue update
    message = {
        "type": "queue_update",
        "payload": QueueItem.model_validate(final_queue_item).model_dump(mode="json")
    }
    await manager.broadcast(message, session_id)

    return final_queue_item


async def _get_user_nickname(user_id: str | None, db: AsyncSession) -> str | None:
    """Helper to get user nickname from user_id."""
    if not user_id:
        return None
    try:
        user_uuid = uuid.UUID(user_id)
        result = await db.execute(select(UserModel).where(UserModel.id == user_uuid))
        user = result.scalar_one_or_none()
        return user.nickname if user else None
    except (ValueError, AttributeError):
        return None


async def add_track_to_queue(session_id: uuid.UUID, source_url: str, user_id: str | None, db: AsyncSession) -> QueueModel:
    """
    Adds a YouTube track to the queue.
    """
    # Verify that the session exists
    session = await db.get(SessionModel, session_id)
    if not session:
        raise ValueError("Session not found")

    # Get track info from YouTube
    track_info = yt_service.get_youtube_track_info(source_url)
    if not track_info:
        raise ValueError("Could not fetch YouTube track info")

    # Extract video ID for canonical_id
    video_id = yt_service.extract_video_id(source_url)

    # Get user nickname
    added_by = await _get_user_nickname(user_id, db)

    # Create a new Track record
    new_track = TrackModel(
        session_id=session_id,
        title=track_info.title,
        duration=track_info.duration,
        source_type=SourceType.YOUTUBE,
        source_url=source_url,
        playback_url=str(track_info.playback_url),  # Ensure it's a string
        added_by=added_by,
        canonical_id=video_id
    )
    
    return await _add_track_to_db_and_queue(session_id, new_track, db)

async def get_queue(session_id: uuid.UUID, user_id: str | None, db: AsyncSession):
    query = (
        select(QueueModel)
        .where(QueueModel.session_id == session_id)
        .options(selectinload(QueueModel.track))
        .order_by(QueueModel.position)
    )
    result = await db.execute(query)
    queue_items = result.scalars().all()

    # If user_id is provided, fetch their votes
    user_votes_map = {}
    if user_id:
        try:
            user_uuid = uuid.UUID(user_id)
            vote_query = select(VoteModel).where(
                VoteModel.user_id == user_uuid,
                VoteModel.queue_item_id.in_([item.id for item in queue_items])
            )
            vote_result = await db.execute(vote_query)
            user_votes = vote_result.scalars().all()
            user_votes_map = {vote.queue_item_id: vote.vote_value for vote in user_votes}
        except ValueError:
            pass

    # Convert to Pydantic models and populate user_vote
    pydantic_items = []
    for item in queue_items:
        pydantic_item = QueueItem.model_validate(item)
        pydantic_item.user_vote = user_votes_map.get(item.id)
        pydantic_items.append(pydantic_item)

    return pydantic_items

async def pop_next_track(session_id: uuid.UUID, db: AsyncSession) -> QueueItem | None:
    """Removes the first item from the queue and returns it (or the next one)."""
    # Get the first item
    query = (
        select(QueueModel)
        .where(QueueModel.session_id == session_id)
        .order_by(QueueModel.position)
        .limit(1)
    )
    result = await db.execute(query)
    first_item = result.scalar_one_or_none()

    if not first_item:
        return None

    # Capture the full object data we need before deletion
    # We need to make sure the track relationship is loaded
    query_full = (
        select(QueueModel)
        .where(QueueModel.id == first_item.id)
        .options(selectinload(QueueModel.track))
    )
    result_full = await db.execute(query_full)
    full_item = result_full.scalar_one()
    
    # Convert to Pydantic model BEFORE deletion to preserve data
    popped_data = QueueItem.model_validate(full_item)

    # Delete associated votes first to avoid foreign key constraint issues
    print(f"Deleting votes for queue item: {full_item.id}")
    vote_delete_query = select(VoteModel).where(VoteModel.queue_item_id == full_item.id)
    vote_result = await db.execute(vote_delete_query)
    votes_to_delete = vote_result.scalars().all()
    for vote in votes_to_delete:
        await db.delete(vote)
    
    # Remove the queue item
    print(f"Popping track: {full_item.id} - {full_item.track.title}")
    await db.delete(full_item)
    await db.commit()
    print("Track popped and committed.")

    # Broadcast update
    message = {
        "type": "queue_update",
        "payload": {}
    }
    await manager.broadcast(message, session_id)
    
    # Return the Pydantic model
    return popped_data

async def add_file_to_queue(
    session_id: uuid.UUID, 
    title: str, 
    file_path: str, 
    duration: int, 
    file_hash: str,
    user_id: str | None,
    db: AsyncSession
) -> QueueModel:
    """
    Adds an uploaded file track to the queue.
    """
    # Verify that the session exists
    session = await db.get(SessionModel, session_id)
    if not session:
        raise ValueError("Session not found")

    # Get user nickname
    added_by = await _get_user_nickname(user_id, db)

    # Create Track
    new_track = TrackModel(
        session_id=session_id,
        title=title,
        duration=duration,
        source_type=SourceType.FILE,
        source_url=file_path,
        playback_url=file_path, # For files, source and playback are the same (relative path)
        added_by=added_by,
        canonical_id=file_hash
    )
    
    return await _add_track_to_db_and_queue(session_id, new_track, db)

from models.vote import Vote as VoteModel

async def vote_track(session_id: uuid.UUID, queue_item_id: uuid.UUID, vote: int, user_id: str | None, db: AsyncSession):
    """
    Votes on a track.
    vote: 1 (upvote) or -1 (downvote)
    user_id: ID of the user voting
    """
    if not user_id:
        # If no user ID, we can't track votes properly. 
        # For now, we'll just allow it but not record a Vote record (legacy behavior)
        # OR we could reject it. Let's reject it to enforce the new rule.
        raise ValueError("User ID is required to vote")

    user_uuid = uuid.UUID(user_id)

    # Find the queue item
    query = select(QueueModel).where(
        QueueModel.session_id == session_id,
        QueueModel.id == queue_item_id
    )
    result = await db.execute(query)
    queue_item = result.scalar_one_or_none()
    
    if not queue_item:
        return None

    # Check if user has already voted
    vote_query = select(VoteModel).where(
        VoteModel.user_id == user_uuid,
        VoteModel.queue_item_id == queue_item_id
    )
    vote_result = await db.execute(vote_query)
    existing_vote = vote_result.scalar_one_or_none()

    if existing_vote:
        if existing_vote.vote_value == vote:
            # Same vote -> Toggle off (remove vote)
            await db.delete(existing_vote)
            queue_item.votes -= vote
        else:
            # Changing vote (e.g. +1 to -1)
            net_change = vote - existing_vote.vote_value
            existing_vote.vote_value = vote
            queue_item.votes += net_change
    else:
        # New vote
        new_vote = VoteModel(
            user_id=user_uuid,
            queue_item_id=queue_item_id,
            vote_value=vote
        )
        db.add(new_vote)
        queue_item.votes += vote

    await db.commit()
    
    # Reorder the queue based on votes (highest votes first)
    # Get all queue items for this session
    all_items_query = (
        select(QueueModel)
        .where(QueueModel.session_id == session_id)
        .order_by(QueueModel.votes.desc(), QueueModel.position)
    )
    result = await db.execute(all_items_query)
    all_items = result.scalars().all()
    
    # Update positions based on vote order
    for idx, item in enumerate(all_items):
        item.position = idx
    
    await db.commit()
    
    # Broadcast update
    message = {
        "type": "queue_update",
        "payload": {} 
    }
    await manager.broadcast(message, session_id)
    
    # Reload the item to ensure we have the latest state
    query = (
        select(QueueModel)
        .where(QueueModel.id == queue_item_id)
        .options(selectinload(QueueModel.track))
    )
    result = await db.execute(query)
    updated_item = result.scalar_one()
    
    # Convert to Pydantic and set user_vote
    # Since we just voted, we know the state!
    pydantic_item = QueueItem.model_validate(updated_item)
    
    # If we deleted the vote (toggle off), user_vote is None (or 0)
    # If we added/changed vote, it's 'vote'
    # Wait, if we toggled off, 'vote' variable is still the input (+1 or -1).
    # We need to know if we deleted it.
    
    # Re-check vote status for this user to be sure
    vote_check_query = select(VoteModel).where(
        VoteModel.user_id == user_uuid,
        VoteModel.queue_item_id == queue_item_id
    )
    vote_check_result = await db.execute(vote_check_query)
    current_vote = vote_check_result.scalar_one_or_none()
    
    pydantic_item.user_vote = current_vote.vote_value if current_vote else None
    
    return pydantic_item
