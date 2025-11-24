from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import engine, Base
from api import session as session_api, queue as queue_api, websockets as ws_api, search as search_api, users as users_api

from models import Session, Track, Queue, User

app = FastAPI(title="K Sunira? - Shared Party Music Player API")

# TODO:
# For development, we allow everything.
# For production, we replace this with the frontend's domain.
origins = ["*"]
# origins = [
#     "http://localhost:3000",
#     "http://127.0.0.1:3000",
#     "http://192.168.1.68:3000",
#     "*"
# ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Include the API router
from fastapi.staticfiles import StaticFiles
import os

# Include the API router
app.include_router(session_api.router, prefix="/api", tags=["Sessions"])
app.include_router(queue_api.router, prefix="/api", tags=["Queue"])
app.include_router(search_api.router, prefix="/api", tags=["Search"])
app.include_router(users_api.router, prefix="/api", tags=["Users"])
app.include_router(ws_api.router, tags=["WebSockets"])

# Create static directory if it doesn't exist
os.makedirs("static", exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.on_event("startup")
async def startup():
    # Create database tables on startup
    async with engine.begin() as conn:
        # Use this for development to drop and recreate tables
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@app.get("/")
async def root():
    return {"message": "Welcome to K Sunira? - the Shared Party Music Player API!"}
