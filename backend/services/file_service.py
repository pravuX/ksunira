import os
import uuid
import shutil
from fastapi import UploadFile
import aiofiles

STATIC_DIR = "static"

import hashlib

async def save_upload_file(session_id: uuid.UUID, file: UploadFile) -> tuple[str, str]:
    """
    Saves an uploaded file to static/sessions/{session_id}/{filename}.
    Returns a tuple of (relative_path, sha256_hash).
    """
    session_dir = os.path.join(STATIC_DIR, "sessions", str(session_id))
    os.makedirs(session_dir, exist_ok=True)
    
    # Generate a safe filename (or keep original if safe)
    # For simplicity and to avoid collisions, prepend a UUID
    file_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(session_dir, safe_filename)
    
    sha256_hash = hashlib.sha256()
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        while content := await file.read(1024 * 1024):  # Read 1MB chunks
            sha256_hash.update(content)
            await out_file.write(content)
            
    # Return the URL path and the hash
    return f"/static/sessions/{session_id}/{safe_filename}", sha256_hash.hexdigest()
