import uuid
from pydantic import BaseModel, HttpUrl
from models.track import SourceType


class TrackCreate(BaseModel):
    """Schema for the data we expect when a user adds a track"""
    source_url: HttpUrl


class TrackBase(BaseModel):
    """Schema for track details"""
    id: uuid.UUID
    title: str
    duration: int
    source_type: SourceType
    playback_url: str # Can be relative path for files
    added_by: str | None = None

    class Config:
        from_attributes = True


class Track(TrackBase):
    session_id: uuid.UUID
    source_url: str # Can be relative path for files
    added_by: str | None = None
    canonical_id: str | None = None
