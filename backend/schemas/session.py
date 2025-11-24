import uuid
from pydantic import BaseModel
from datetime import datetime

# Base model for common attributes


class SessionBase(BaseModel):
    pass

# Schema for creating a new session (no input needed from user) (i.e. request)


class SessionCreate(SessionBase):
    pass

# Schema for the data we return to the client (i.e. response)


class Session(SessionBase):
    id: uuid.UUID
    host_secret: str
    created_at: datetime
    active: bool

    class Config:
        orm_mode = True  # Allows Pydantic to read data from ORM models
