from fastapi import WebSocket
import uuid


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[uuid.UUID, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: uuid.UUID):
        """Accepts a new WebSocket connection and adds it to the session's list."""
        await websocket.accept()

        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: uuid.UUID):
        """Removes a WebSocket form the active connections list.."""
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            # If the session has no more connected users, clean it up
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast(self, message: dict, session_id: uuid.UUID):
        """Broadcasts a JSON message to all clients in a specific session."""
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                await connection.send_json(message)


manager = ConnectionManager()
