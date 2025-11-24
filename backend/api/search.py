from fastapi import APIRouter, Query
from services import yt_service

router = APIRouter()


@router.get("/search/youtube")
async def search_youtube(q: str = Query(..., description="Search query")):
    """
    Search YouTube for videos.
    Returns a list of search results with metadata.
    """
    results = yt_service.search_youtube(q, max_results=10)
    return {"results": results}
