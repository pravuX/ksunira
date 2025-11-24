from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID


class UserCreate(BaseModel):
    nickname: str


class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    session_id: str
    nickname: str
    is_host: bool
    joined_at: datetime
