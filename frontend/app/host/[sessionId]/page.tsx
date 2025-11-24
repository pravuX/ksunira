'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { addTrackToQueue, getQueue, popQueue, uploadTrack, searchYouTube, YouTubeSearchResult, joinSession, type QueueItem, API_BASE_URL } from '@/lib/api';
import toast from 'react-hot-toast';
import Queue from '@/components/Queue';
import Player from '@/components/Player';

import PlayerControls from '@/components/PlayerControls';
import { useWebSocket } from '@/lib/websocket';
import { QRCodeSVG } from 'qrcode.react';

// A simple component to add a track seconds to MM:SS
const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// A simple component to add a track
function AddTrackForm({ sessionId, userId, theme = 'purple' }: { sessionId: string; userId: string | null; theme?: 'purple' | 'blue' }) {
  const [mode, setMode] = useState<'url' | 'search'>('search'); // Default to search mode
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
      // Clear input
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
                    <div className="font-semibold text-white truncate group-hover:text-purple-300 transition-colors">{result.title}</div>
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      <span className="truncate">{result.channel}</span>
                      <span>•</span>
                      <span>{formatDuration(result.duration)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAddFromSearch(result)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-shrink-0 shadow-md hover:shadow-lg" 
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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


export default function HostPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [queue, setQueue] = useState<QueueItem[]>([]);
  
  // User state
  const [userId, setUserId] = useState<string | null>(null);
  
  // QR Code modal state
  const [showQRCode, setShowQRCode] = useState(false);
  
  // Player State
  const [currentTrack, setCurrentTrack] = useState<QueueItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const wsBaseUrl = API_BASE_URL.replace(/^http/, 'ws');
  const wsUrl = sessionId ? `${wsBaseUrl}/ws/session/${sessionId}` : null;
  const { isConnected, sendMessage, addMessageHandler } = useWebSocket(wsUrl);

  // Fetch initial queue
  useEffect(() => {
    getQueue(sessionId, userId)
      .then(data => {
        setQueue(data);
        // If queue has items and nothing is playing, start the first one
        if (data.length > 0 && !currentTrack) {
          // In a real app, we might wait for user interaction to start playback (browser policy)
          // For now, we'll set it as current but maybe wait for play click
          setCurrentTrack(data[0]);
        }
      })
      .catch(err => console.error("Failed to fetch initial queue:", err));
  }, [sessionId, currentTrack, userId]); // Added currentTrack and userId to dependencies

  // Auto-join as host on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem(`ksunira_user_id_${sessionId}`);
    
    if (storedUserId) {
      // Host already joined this session, just use the stored ID
      setUserId(storedUserId);
    } else {
      // First time joining this session as host
      joinSession(sessionId, "Host", true)
        .then(user => {
          setUserId(user.id);
          localStorage.setItem(`ksunira_user_id_${sessionId}`, user.id);
        })
        .catch(err => console.error("Failed to join as host:", err));
    }
  }, [sessionId]);

  // Handle WS messages
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'queue_update') {
        getQueue(sessionId, userId).then(data => {
          setQueue(data);
          // We no longer auto-set currentTrack from queue update
          // because handleNextTrack sets it explicitly from the pop response.
        });
      } else if (message.type === 'skip') {
        console.log("Received skip message");
        handleNextTrack();
      } else if (message.type === 'pause') {
        setIsPlaying(false);
      } else if (message.type === 'resume') {
        setIsPlaying(true);
      } else if (message.type === 'seek') {
        // Handle seek from guests
        const time = message.payload.time;
        setCurrentTime(time);
        setProgress((time / duration) * 100);
        setSeekTime(time);
      } else if (message.type === 'volume_change') {
        const newVolume = message.payload.volume;
        setVolume(newVolume);
        localStorage.setItem('ksunira_volume', newVolume.toString());
      } else if (message.type === 'request_state') {
        // Guest requested state, send current volume and track info
        sendMessage('state_update', {
          volume: volume,
          currentTrack: currentTrack ? {
            track_id: currentTrack.track.id,
            title: currentTrack.track.title,
            duration: currentTrack.track.duration,
            playback_url: currentTrack.track.playback_url
          } : null,
          isPlaying: isPlaying,
          currentTime: currentTime,
          duration: duration
        });
      }
    };
    return addMessageHandler(handleMessage);
  }, [sessionId, addMessageHandler, currentTrack, duration, userId]);

  // Broadcast when track changes
  useEffect(() => {
    if (currentTrack) {
      sendMessage('track_started', {
        track_id: currentTrack.id,
        title: currentTrack.track.title,
        duration: currentTrack.track.duration,
      });
    }
  }, [currentTrack, sendMessage]);

  const isPoppingRef = useRef(false);

  const handleNextTrack = useCallback(async () => {
    console.log("handleNextTrack called");
    if (!queue || queue.length === 0) {
      setCurrentTrack(null);
      setIsPlaying(false);
      sendMessage('clear_player', {});
      return;
    }

    if (isPoppingRef.current) {
      console.log("Already popping queue, skipping...");
      return;
    }

    try {
      isPoppingRef.current = true;
      
      // Optimistically clear current track so the WS update knows we are ready for the next one
      setCurrentTrack(null);
      
      // Pop the next track from the server
      const nextTrack = await popQueue(sessionId);
      
      if (nextTrack) {
        setCurrentTrack(nextTrack);
        setIsPlaying(true);
      } else {
        // Queue was empty
        setIsPlaying(false);
        sendMessage('clear_player', {}); // Explicitly tell guests to clear
      }
    } catch (error) {
      console.error("Failed to pop next track:", error);
    } finally {
      isPoppingRef.current = false;
    }
  }, [queue, sessionId]);

  // Auto-play when queue has items and we are idle
  useEffect(() => {
    if (!currentTrack && !isPlaying && queue.length > 0) {
      handleNextTrack();
    }
  }, [queue, currentTrack, isPlaying, handleNextTrack]);

  const onTrackEnd = () => {
    handleNextTrack();
  };

  const onProgress = (curr: number, dur: number) => {
    setCurrentTime(curr);
    setDuration(dur);
    setProgress((curr / dur) * 100);
    
    // Broadcast progress to guests every second
    sendMessage("track_progress", { currentTime: curr, duration: dur });
  };

  const togglePlayPause = () => {
    if (!currentTrack && queue.length > 0) {
      handleNextTrack();
      return;
    }
    
    const newState = !isPlaying;
    setIsPlaying(newState);
    sendMessage(newState ? 'resume' : 'pause', {});
  };

  const skipTrack = () => {
    // Just broadcast skip - the WebSocket handler will call handleNextTrack
    sendMessage('skip', {});
  };

  const onSeek = (time: number) => {
    // Host seeks -> update local and broadcast
    // ... (existing seek logic)
    if (isPoppingRef.current) return; // Don't seek while popping? Actually seek is fine.
    
    // Immediately update local UI for responsiveness
    setCurrentTime(time);
    setProgress((time / duration) * 100);
    setSeekTime(time);
    
    // Throttle broadcast to prevent spam
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }
    seekTimeoutRef.current = setTimeout(() => {
      sendMessage('seek', { time });
    }, 100); // 100ms debounce
  };

  const [seekTime, setSeekTime] = useState<number | null>(null);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load volume from localStorage
  const [volume, setVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ksunira_volume');
      return saved ? parseFloat(saved) : 100;
    }
    return 100;
  });

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    localStorage.setItem('ksunira_volume', newVolume.toString());
    // Broadcast to guests
    sendMessage('volume_change', { volume: newVolume });
  };

  // Clear player when queue is empty and track ends
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
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
        {/* QR Code Modal */}
        {showQRCode && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowQRCode(false)}>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 sm:p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-purple-500/30" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Join the Party!</h2>
                <button onClick={() => setShowQRCode(false)} className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-white p-4 rounded-xl mb-4">
                <QRCodeSVG 
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${sessionId}`}
                  size={256}
                  level="H"
                  className="w-full h-auto"
                />
              </div>
              <p className="text-gray-400 text-sm text-center mb-2">Scan to join this session</p>
              <p className="text-gray-500 text-xs text-center font-mono break-all">{sessionId}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6 sm:mb-8 bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-purple-500/20">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              K Sunira?
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Host Mode</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowQRCode(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-2 rounded-lg transition-colors shadow-md"
              title="Show QR Code"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </button>
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={isConnected ? 'Connected' : 'Disconnected'}></div>
          </div>
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
        theme="purple"
        title={currentTrack?.track.title}
      />

      <Player 
        playbackUrl={currentTrack?.track.playback_url || null}
        isPlaying={isPlaying}
        onTrackEnd={onTrackEnd}
        onProgress={onProgress}
        seekTime={seekTime}
        volume={volume}
      />

      <AddTrackForm sessionId={sessionId} userId={userId} theme="purple" />

      <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">Up Next</h2>
      <Queue items={queue} sessionId={sessionId} userId={userId} theme="purple" />
      </div>
    </main>
  );
}
