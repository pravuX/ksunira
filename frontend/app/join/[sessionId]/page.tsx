'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { addTrackToQueue, getQueue, uploadTrack, searchYouTube, YouTubeSearchResult, joinSession, type QueueItem, API_BASE_URL } from '@/lib/api';
import toast from 'react-hot-toast';
import Queue from '@/components/Queue';

import PlayerControls from '@/components/PlayerControls';
import confetti from 'canvas-confetti';
import { useWebSocket } from '@/lib/websocket';

// Helper to format seconds to MM:SS
const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// A simple component to add a track
function AddTrackForm({ sessionId, userId, theme = 'blue' }: { sessionId: string; userId: string | null; theme?: 'purple' | 'blue' }) {
  const [mode, setMode] = useState<'url' | 'search'>('search');
  const [url, setUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || isAdding) return;
    setIsAdding(true);
    try {
      await addTrackToQueue(sessionId, url, userId || undefined);
      setUrl('');
    } catch (error) {
      console.error(error);
      toast.error("Could not add the track. Please check the URL and try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery || isSearching) return;
    setIsSearching(true);
    try {
      const results = await searchYouTube(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error(error);
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFromSearch = async (result: YouTubeSearchResult) => {
    setIsAdding(true);
    try {
      await addTrackToQueue(sessionId, result.url, userId || undefined);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error(error);
      toast.error("Could not add the track.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isAdding) return;
    
    setIsAdding(true);
    try {
      await uploadTrack(sessionId, file, userId || undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error(error);
      toast.error("Could not upload the file.");
    } finally {
      setIsAdding(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const activeBtnClass = theme === 'purple' 
    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
    : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg';

  return (
    <div className="mb-8 bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50">
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('search')}
          className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${mode === 'search' ? activeBtnClass : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'}`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search
          </span>
        </button>
        <button
          onClick={() => setMode('url')}
          className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${mode === 'url' ? activeBtnClass : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'}`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            URL
          </span>
        </button>
      </div>

      {/* Search Mode */}
      {mode === 'search' && (
        <>
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="flex-grow relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a song..."
                className="w-full bg-gray-700/50 text-white pl-10 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button type="submit" disabled={isSearching} className={`${theme === 'purple' ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'} text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-50 min-w-[100px] transition-all`}>
              {isSearching ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
              ) : 'Search'}
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-gray-700/30 rounded-xl p-3 max-h-96 overflow-y-auto space-y-2">
              {searchResults.map((result) => (
                <div key={result.video_id} className="flex items-center gap-3 p-3 bg-gray-800/40 hover:bg-gray-700/60 rounded-lg transition-all group">
                  <div className="flex-grow min-w-0">
                    <div className="font-semibold text-white truncate group-hover:text-blue-300 transition-colors">{result.title}</div>
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      <span className="truncate">{result.channel}</span>
                      <span>•</span>
                      <span>{formatDuration(result.duration)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAddFromSearch(result)}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-shrink-0 shadow-md hover:shadow-lg" 
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* URL Mode */}
      {mode === 'url' && (
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <div className="flex-grow relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter YouTube URL"
              className="w-full bg-gray-700/50 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
            />
          </div>
          <button type="submit" disabled={isAdding} className={`${theme === 'purple' ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'} text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-50 transition-all`}>
            {isAdding ? 'Adding...' : 'Add'}
          </button>
        </form>
      )}
      
      {/* File Upload */}
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-700/50">
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span className="text-gray-400 text-sm font-medium">Or upload MP3:</span>
        <input 
          type="file" 
          accept="audio/mp3,audio/mpeg"
          onChange={handleFileUpload}
          ref={fileInputRef}
          disabled={isAdding}
          className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600"
        />
      </div>
    </div>
  );
}


export default function GuestPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [queue, setQueue] = useState<QueueItem[]>([]);
  
  // User state
  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(true);
  
  // Guest player state (synced from host)
  const [currentTrack, setCurrentTrack] = useState<QueueItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const wsBaseUrl = API_BASE_URL.replace(/^http/, 'ws');
  const wsUrl = sessionId ? `${wsBaseUrl}/ws/session/${sessionId}` : null;
  const { isConnected, sendMessage, addMessageHandler } = useWebSocket(wsUrl);

  // Auto-join with stored nickname on mount
  useEffect(() => {
    const storedNickname = localStorage.getItem('ksunira_guest_nickname');
    const storedUserId = localStorage.getItem(`ksunira_user_id_${sessionId}`);
    
    if (storedUserId) {
      // User already joined this session, just use the stored ID
      setUserId(storedUserId);
      setNickname(storedNickname || 'Guest');
      setShowNicknamePrompt(false);
    } else if (storedNickname) {
      // Has nickname but not joined this session yet
      setNickname(storedNickname);
      setShowNicknamePrompt(false);
      // Auto-join with stored nickname
      joinSession(sessionId, storedNickname, false)
        .then(user => {
          setUserId(user.id);
          localStorage.setItem(`ksunira_user_id_${sessionId}`, user.id);
        })
        .catch(err => console.error("Failed to join:", err));
    }
  }, [sessionId]);

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    
    try {
      const user = await joinSession(sessionId, nickname.trim(), false);
      setUserId(user.id);
      localStorage.setItem('ksunira_guest_nickname', nickname.trim());
      localStorage.setItem(`ksunira_user_id_${sessionId}`, user.id);
      setShowNicknamePrompt(false);
    } catch (error) {
      console.error("Failed to join session:", error);
      toast.error("Failed to join session. Please try again.");
      return;
    }
    
    // Trigger confetti after successful join! 🎉
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#06b6d4']
      });
    }, 100);
  };

  // Fetch initial queue
  useEffect(() => {
    if (!sessionId) return;
    getQueue(sessionId, userId)
      .then(data => {
        setQueue(data);
        if (data.length > 0 && !currentTrack) {
           // We don't auto-play on guest, just show info
           setCurrentTrack(data[0]);
        }
      })
      .catch(err => console.error("Failed to fetch initial queue:", err));
  }, [sessionId, currentTrack, userId]);
  // Handle WS messages
  useEffect(() => {
    const handleMessage = (message: any) => {
      
      if (message.type === 'queue_update') {
        getQueue(sessionId, userId).then(data => {
          setQueue(data);
          // If queue is empty and we are not playing, clear the player
          if (data.length === 0 && !isPlaying) {
             setCurrentTrack(null);
          }
        });
      } else if (message.type === 'track_started') {
        // Host started a new track
        const { track_id, title, duration: trackDuration } = message.payload;
        setDuration(trackDuration);
        setCurrentTime(0);
        setProgress(0);
        setIsPlaying(true); // Assume playing when track starts
        
        // Construct a temporary QueueItem for display
        // We don't have the full track object, but we have enough for NowPlaying
        const newTrack: QueueItem = {
          id: track_id,
          position: -1, // Not in queue
          votes: 0,
          track: {
            id: track_id, // This might be wrong if track_id is QueueItem.id, but for display it's fine
            title: title,
            duration: trackDuration,
            source_type: 'youtube', // Assumption
            source_url: '', // Guest doesn't need this
            playback_url: '', // Guest doesn't need this
          }
        };
        setCurrentTrack(newTrack);
      } else if (message.type === 'track_progress') {
        // Host is broadcasting progress
        const { currentTime: hostTime, duration: hostDuration } = message.payload;
        setCurrentTime(hostTime);
        setDuration(hostDuration);
        if (hostDuration > 0) {
          setProgress((hostTime / hostDuration) * 100);
        }
      } else if (message.type === 'skip') {
        // Host skipped, we wait for queue update or handle optimistically
      } else if (message.type === 'pause') {
        setIsPlaying(false);
        // If paused and queue is empty, it might mean the playlist finished
        // But we can't be sure. Let's rely on the queue_update or a specific event.
        // Actually, if we receive a queue_update with empty list, and we are NOT playing, we should clear.
      } else if (message.type === 'resume') {
        setIsPlaying(true);
      } else if (message.type === 'seek') {
        const time = message.payload.time;
        setCurrentTime(time);
        if (duration > 0) {
            setProgress((time / duration) * 100);
        }
      } else if (message.type === 'volume_change') {
        // Host changed volume, sync it
        const newVolume = message.payload.volume;
        setVolume(newVolume);
      } else if (message.type === 'clear_player') {
        // Host explicitly cleared the player
        setIsPlaying(false);
        setCurrentTrack(null);
        setProgress(0);
        setCurrentTime(0);
        setDuration(0);
      } else if (message.type === 'state_update') {
        if (message.payload.volume !== undefined) {
          setVolume(message.payload.volume);
        }
        if (message.payload.isPlaying !== undefined) {
          setIsPlaying(message.payload.isPlaying);
        }
        if (message.payload.currentTrack) {
          const { track_id, title, duration: trackDuration, playback_url } = message.payload.currentTrack;
          const newTrack: QueueItem = {
            id: track_id,
            position: -1,
            votes: 0,
            track: {
              id: track_id,
              title: title,
              duration: trackDuration,
              source_type: 'youtube',
              source_url: '', // Not provided in state_update message
              playback_url: playback_url,
            }
          };
          setCurrentTrack(newTrack);
          setDuration(trackDuration);
        } else if (message.payload.currentTrack === null) {
          setCurrentTrack(null);
          setDuration(0);
        }
        if (message.payload.currentTime !== undefined) {
          setCurrentTime(message.payload.currentTime);
        }
        if (message.payload.duration && message.payload.currentTime !== undefined) {
          setProgress((message.payload.currentTime / message.payload.duration) * 100);
        }
      }
    };
    return addMessageHandler(handleMessage);
  }, [sessionId, addMessageHandler, currentTrack, duration, userId, isPlaying]); // Added isPlaying to dependencies

  // Request initial state from host when connected
  useEffect(() => {
    if (isConnected) {
      sendMessage('request_state', {});
    }
  }, [isConnected, sendMessage]);

  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Guest mirrors host volume but can also control it
  const [volume, setVolume] = useState(100);

  const onSeek = (time: number) => {
    // Guest seeks -> send request to host with throttling
    setCurrentTime(time);
    setProgress((time / duration) * 100);
    
    // Throttle to prevent spam
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }
    seekTimeoutRef.current = setTimeout(() => {
      sendMessage('seek', { time });
    }, 100); // 100ms debounce
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    sendMessage('volume_change', { volume: newVolume });
  };

  const togglePlayPause = () => {
    // Guest controls -> send request to host
    const newState = !isPlaying;
    setIsPlaying(newState);
    sendMessage(newState ? 'resume' : 'pause', {});
  };

  const skipTrack = () => {
    sendMessage('skip', {});
  };

  // Clear UI when queue is empty
  useEffect(() => {
    if (!currentTrack && queue.length === 0) {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentTrack, queue]);

  if (!sessionId) {
    return <div className="p-8">Loading session...</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
      {/* Nickname Prompt Modal */}
      {showNicknamePrompt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 sm:p-8 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/30">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Join the Party! 🎉</h2>
            <p className="text-gray-400 mb-6 text-sm sm:text-base">Enter your nickname to join this session</p>
            <form onSubmit={handleNicknameSubmit}>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your nickname"
                className="w-full bg-gray-700/50 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4 border border-gray-600 text-sm sm:text-base"
                autoFocus
                maxLength={20}
              />
              <button
                type="submit"
                disabled={!nickname.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                Join Session
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6 sm:mb-8 bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-blue-500/20">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">
            K Sunira?
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Guest Mode</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={isConnected ? 'Connected' : 'Disconnected'}></div>
      </div>

      <PlayerControls 
        isPlaying={isPlaying} 
        onPlayPause={togglePlayPause} 
        onSkip={skipTrack}
        progress={progress}
        duration={duration}
        currentTime={currentTime}
        onSeek={onSeek}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        theme="blue"
        title={currentTrack?.track.title}
      />

      {/* No Player Component for Guest */}

      <AddTrackForm sessionId={sessionId} userId={userId} theme="blue" />

      <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">Up Next</h2>
      <Queue items={queue} sessionId={sessionId} userId={userId} theme="blue" />
      </div>
    </main>
  );
}
