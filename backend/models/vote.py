import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime

from core.database import Base

class Vote(Base):
    __tablename__ = "votes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    queue_item_id = Column(UUID(as_uuid=True), ForeignKey("queue.id", ondelete="CASCADE"), nullable=False)
    vote_value = Column(Integer, nullable=False)  # 1 for upvote, -1 for downvote
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="user_votes")
    queue_item = relationship("Queue", backref="track_votes")

    # Ensure one vote per user per queue item
    __table_args__ = (
        UniqueConstraint('user_id', 'queue_item_id', name='uq_user_queue_vote'),
    )
