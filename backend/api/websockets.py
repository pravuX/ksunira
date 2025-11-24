import uuid
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.websocket_manager import manager
from core.database import get_db

from models import Session
from services import queue_service

router = APIRouter()


@router.websocket("/ws/session/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    session = await db.get(Session, session_id)
    if not session:
        await websocket.close(code=1008)  # Policy Violation
        return

    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                payload = message.get("payload", {})

                if msg_type == "add_track":
                    url = payload.get("url")
                    if url:
                        await queue_service.add_track_to_queue(session_id, url, db)
                
                elif msg_type == "vote_track":
                    track_id = payload.get("track_id")
                    vote = payload.get("vote", 0)
                    user_id = payload.get("user_id")
                    if track_id and user_id:
                        await queue_service.vote_track(session_id, uuid.UUID(track_id), vote, user_id, db)

                elif msg_type in ["skip", "pause", "resume", "seek", "volume_change", "track_started", "track_progress", "clear_player", "request_state", "state_update"]:
                    # Relay control events to all clients
                    print(f"Broadcasting message: {msg_type}")
                    await manager.broadcast(message, session_id)

            except json.JSONDecodeError:
                pass
            except Exception as e:
                print(f"Error handling WS message: {e}")

    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
