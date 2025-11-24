import uuid
import enum
from sqlalchemy import Column, String, Integer, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base


class SourceType(enum.Enum):
    YOUTUBE = "youtube"
    FILE = "file"


class Track(Base):
    __tablename__ = "tracks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey(
        "sessions.id", ondelete="CASCADE"), nullable=False)

    title = Column(String, nullable=False)
    duration = Column(Integer, nullable=False)  # in seconds
    source_type = Column(Enum(SourceType), nullable=False)
    source_url = Column(String, nullable=False)  # yt link or file path
    playback_url = Column(String, nullable=False)  # Direct stream from yt-dlp
    added_by = Column(String, nullable=True)  # Optional user identifier
    canonical_id = Column(String, nullable=True) # Video ID or File Hash

    session = relationship("Session")
