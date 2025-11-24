
// In production/LAN, we want to use the same host as the frontend
// If NEXT_PUBLIC_API_URL is set (e.g. via Docker), use that as a fallback or base
// But for client-side calls, we should prefer relative paths or the current origin if possible
// However, since backend is on a different port (8000) in dev/docker-compose, we need to handle that.

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // If we are in the browser
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    // If we are running on port 3000, backend is likely on 8000
    // This assumes standard docker-compose or local dev setup
    return `${protocol}//${hostname}:8000`;
  }
  // Server-side rendering fallback
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
};

export const API_BASE_URL = getApiBaseUrl();

// Define the shape of the Session object we expect from the backend
export interface Session {
  id: string;
  host_secret: string;
  created_at: string;
  active: boolean;
}

/**
 * Calls the backend API to create a new session.
 * @returns A promise that resolves to the newly created Session object.
 */
export async function createSession(): Promise<Session> {
  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to create session. Server responded with:", errorBody);
    throw new Error('Failed to create session');
  }

  return response.json();
}

/**
 * Fetches session details by ID.
 * @returns A promise that resolves to the Session object.
 */
export async function getSession(sessionId: string): Promise<Session> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch session');
  }
  return response.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete session');
  }
}

// YouTube Search
export interface YouTubeSearchResult {
  video_id: string;
  title: string;
  duration: number;
  thumbnail_url: string;
  channel: string;
  url: string;
}

export async function searchYouTube(query: string): Promise<YouTubeSearchResult[]> {
  const response = await fetch(`${API_BASE_URL}/api/search/youtube?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error('Failed to search YouTube');
  }
  const data = await response.json();
  return data.results.slice(0, 5); // Limit to top 5 results
}

// Users
export interface User {
  id: string;
  session_id: string;
  nickname: string;
  is_host: boolean;
  joined_at: string;
}

export async function joinSession(sessionId: string, nickname: string, isHost: boolean = false): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/users?is_host=${isHost}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname })
  });
  if (!response.ok) {
    throw new Error('Failed to join session');
  }
  return response.json();
}

// Define the shape of the Queue and Track objects
// These are used across the frontend
export interface Track {
  id: string;
  title: string;
  duration: number;
  source_type: string;
  source_url: string;
  playback_url: string;
  added_by?: string | null;
  canonical_id?: string;
}

export interface QueueItem {
  id: string;
  position: number;
  votes: number;
  user_vote?: number | null; // 1, -1, or null
  track: Track;
}

// Function to fetch the current queue
export async function getQueue(sessionId: string, userId?: string | null): Promise<QueueItem[]> {
  const url = new URL(`${API_BASE_URL}/api/sessions/${sessionId}/queue`);
  if (userId) {
    url.searchParams.append('user_id', userId);
  }
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch queue');
  }
  const data = await response.json();
  return data.items;
}

// Function to add a new track
export async function addTrackToQueue(sessionId: string, sourceUrl: string, userId?: string): Promise<QueueItem> {
  const url = new URL(`${API_BASE_URL}/api/sessions/${sessionId}/queue`);
  if (userId) {
    url.searchParams.append('user_id', userId);
  }
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_url: sourceUrl })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add track: ${errorText}`);
  }
  return response.json();
};

export async function uploadTrack(sessionId: string, file: File, userId?: string): Promise<QueueItem> {
  const formData = new FormData();
  formData.append('file', file);
  
  const url = new URL(`${API_BASE_URL}/api/sessions/${sessionId}/queue/upload`);
  if (userId) {
    url.searchParams.append('user_id', userId);
  }
  
  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData
  });
  if (!response.ok) {
    throw new Error('Failed to upload track');
  }
  return response.json();
};

// Function to pop the next track from the queue
export async function popQueue(sessionId: string): Promise<QueueItem | null> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/queue/pop`, {
    method: 'POST',
  });

  if (response.status === 404) {
    console.warn("Queue is empty, nothing to pop.");
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to pop queue: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Failed to pop queue: ${response.status} ${errorText}`);
  }
  
  return response.json();
}

// Function to vote on a track
export async function voteTrack(sessionId: string, trackId: string, vote: number, userId: string): Promise<QueueItem> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/queue/${trackId}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ vote, user_id: userId }),
  });

  if (!response.ok) {
    throw new Error('Failed to vote on track');
  }
  return response.json();
}
