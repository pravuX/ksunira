from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

# Create an async engine
engine = create_async_engine(settings.DATABASE_URL, echo=True)

# Create a sessionmaker for creating async sessions
AsyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession
)

# Base class for our models
Base = declarative_base()

# Dependency to get a DB session in API routes


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
