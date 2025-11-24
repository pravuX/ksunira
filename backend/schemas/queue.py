import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import List

from .track import TrackBase


class QueueItem(BaseModel):
    """Schema returned from "add to queue" endpoint """
    id: uuid.UUID
    session_id: uuid.UUID
    position: int
    votes: int
    user_vote: int | None = None  # 1, -1, or None
    created_at: datetime
    track: TrackBase

    class Config:
        from_attributes = True


class QueueList(BaseModel):
    items: List[QueueItem]
