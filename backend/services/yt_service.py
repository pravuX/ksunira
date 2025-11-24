import yt_dlp
from pydantic import BaseModel, HttpUrl
import re


class YouTubeTrackInfo(BaseModel):
    title: str
    duration: int
    playback_url: HttpUrl


# Simple in-memory cache
_cache: dict[str, YouTubeTrackInfo] = {}


def clean_youtube_url(url: str) -> str:
    """Clean and normalize YouTube URL input."""
    # Strip whitespace
    url = url.strip()
    
    # Add https:// if missing
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    # Handle common YouTube URL formats
    # youtu.be/VIDEO_ID -> youtube.com/watch?v=VIDEO_ID
    url = re.sub(r'youtu\.be/([a-zA-Z0-9_-]+)', r'youtube.com/watch?v=\1', url)
    
    # Remove tracking parameters and timestamps
    url = re.sub(r'[&?]si=[^&]*', '', url)  # Remove si parameter
    url = re.sub(r'[&?]t=[^&]*', '', url)   # Remove timestamp
    url = re.sub(r'[&?]feature=[^&]*', '', url)  # Remove feature parameter
    url = re.sub(r'[&?]list=[^&]*', '', url)  # Remove playlist parameter
    
    # Ensure it's a valid YouTube domain
    if not re.search(r'(youtube\.com|youtu\.be)', url):
        raise ValueError("Invalid YouTube URL")
    
    return url


def extract_video_id(url: str) -> str | None:
    """Extracts the YouTube video ID from a URL."""
    # Regex for common YouTube URL formats
    # Supports:
    # - youtube.com/watch?v=VIDEO_ID
    # - youtu.be/VIDEO_ID
    # - youtube.com/embed/VIDEO_ID
    # - youtube.com/v/VIDEO_ID
    match = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', url)
    if match:
        return match.group(1)
    return None

def get_youtube_track_info(url: str) -> YouTubeTrackInfo | None:
    """Uses yt-dlp to extract metadata and direct audio URL from a Youtube video."""
    # Clean the URL first
    try:
        url = clean_youtube_url(url)
    except ValueError as e:
        print(f"Invalid URL: {e}")
        return None
    
    # Try to extract ID for cache lookup
    video_id = extract_video_id(url)
    if video_id and video_id in _cache:
        print(f"Cache hit for {video_id}")
        return _cache[video_id]

    ydl_opts = {
        "format": "bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            # For DASH formats, the URL is in 'url', for others it's often in 'url' at the top level
            playback_url = info.get("url")

            if not playback_url:
                # If the first pass didn't get the URL, try a more direct approach
                formats = info.get("formats", [info])
                best_audio = next((f for f in formats if f.get(
                    "acodec") != "none" and f.get("vcodec") == "none"), None)
                if best_audio:
                    playback_url = best_audio.get("url")
                else:
                    # Fallback for non-DASH streams or if best audio isn't obvious
                    playback_url = formats[0].get("url")

            if not playback_url:
                return None
            
            # Use the ID from info if we couldn't extract it from URL (unlikely for valid URLs)
            extracted_id = info.get("id") or video_id

            track_info = YouTubeTrackInfo(
                title=info.get("title", "Unknown Title"),
                duration=int(info.get("duration", 0)),
                playback_url=str(playback_url) # Convert playback_url to string
            )
            
            # Cache the result using the ID
            if extracted_id:
                _cache[extracted_id] = track_info
                
            return track_info

    except Exception as e:
        print(f"Error fetching YouTube info: {e}")
        return None


def search_youtube(query: str, max_results: int = 10) -> list[dict]:
    """
    Search YouTube for videos matching the query.
    Returns a list of search results with metadata.
    """
    try:
        # Use ytsearch prefix to search YouTube
        search_query = f"ytsearch{max_results}:{query}"
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,  # Don't download, just get metadata
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            result = ydl.extract_info(search_query, download=False)
            
            if not result or 'entries' not in result:
                return []
            
            search_results = []
            for entry in result['entries']:
                if not entry:
                    continue
                    
                search_results.append({
                    'video_id': entry.get('id', ''),
                    'title': entry.get('title', 'Unknown Title'),
                    'duration': entry.get('duration', 0),
                    'thumbnail_url': entry.get('thumbnail', ''),
                    'channel': entry.get('channel', entry.get('uploader', 'Unknown')),
                    'url': entry.get('url', f"https://youtube.com/watch?v={entry.get('id', '')}")
                })
            
            return search_results
            
    except Exception as e:
        print(f"Error searching YouTube: {e}")
        return []

