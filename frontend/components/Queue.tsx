'use client';

import { QueueItem, voteTrack } from '@/lib/api';
import { useState } from 'react';

interface QueueProps {
  items: QueueItem[];
  sessionId: string;
  userId: string | null;
  onVote?: () => void;
  theme?: 'purple' | 'blue';
}

export default function Queue({ items, sessionId, userId, onVote, theme = 'purple' }: QueueProps) {
  const [votingTrack, setVotingTrack] = useState<string | null>(null);

  const handleVote = async (trackId: string, vote: number) => {
    if (!userId) {
      console.error("Cannot vote without user ID");
      return;
    }
    setVotingTrack(trackId);
    try {
      await voteTrack(sessionId, trackId, vote, userId);
      if (onVote) onVote();
    } catch (error) {
      console.error('Failed to vote:', error);
    } finally {
      setVotingTrack(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800/30 rounded-2xl border border-gray-700/50">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        <p className="text-gray-400 text-lg">No tracks in queue yet</p>
        <p className="text-gray-500 text-sm mt-2">Add some music to get started!</p>
      </div>
    );
  }

  const hoverBorderColor = theme === 'purple' ? 'hover:border-purple-500/30' : 'hover:border-blue-500/30';
  const badgeColor = theme === 'purple' ? 'text-purple-400 bg-purple-500/10' : 'text-blue-400 bg-blue-500/10';
  const upvoteHover = theme === 'purple' ? 'hover:bg-purple-600/80' : 'hover:bg-blue-600/80';
  const downvoteHover = theme === 'purple' ? 'hover:bg-pink-600/80' : 'hover:bg-cyan-600/80';

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.id} className={`bg-gradient-to-r from-gray-800/50 to-gray-800/30 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-gray-700/50 ${hoverBorderColor} transition-all`}>
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-1 rounded flex-shrink-0 ${badgeColor}`}>#{index + 1}</span>
                <p className="font-semibold text-white text-sm sm:text-base truncate">{item.track.title}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {Math.floor(item.track.duration / 60)}:{(item.track.duration % 60).toString().padStart(2, '0')}
                </span>
                {item.track.added_by && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="truncate max-w-[120px] sm:max-w-none">{item.track.added_by}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => handleVote(item.id, 1)}
                disabled={votingTrack === item.id}
                className={`p-1.5 sm:p-2 rounded-lg transition-all disabled:opacity-50 group ${
                  item.user_vote === 1 
                    ? (theme === 'purple' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white') 
                    : `bg-gray-700/50 ${upvoteHover}`
                }`}
                title="Upvote"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              </button>
              <span className={`text-base sm:text-lg font-bold min-w-[2rem] sm:min-w-[2.5rem] text-center px-2 sm:px-3 py-1 rounded-lg text-sm sm:text-base ${
                item.user_vote 
                  ? (theme === 'purple' ? 'text-purple-300 bg-purple-900/30' : 'text-blue-300 bg-blue-900/30')
                  : 'text-white bg-gray-700/50'
              }`}>
                {item.votes}
              </span>
              <button
                onClick={() => handleVote(item.id, -1)}
                disabled={votingTrack === item.id}
                className={`p-1.5 sm:p-2 rounded-lg transition-all disabled:opacity-50 group ${
                  item.user_vote === -1 
                    ? (theme === 'purple' ? 'bg-pink-600 text-white' : 'bg-cyan-600 text-white') 
                    : `bg-gray-700/50 ${downvoteHover}`
                }`}
                title="Downvote"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
