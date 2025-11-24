'use client';

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onSkip: () => void;
  progress: number;
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  theme?: 'purple' | 'blue';
}

export default function PlayerControls({ 
  isPlaying, 
  onPlayPause, 
  onSkip, 
  progress, 
  duration, 
  currentTime, 
  onSeek,
  volume,
  onVolumeChange,
  theme = 'purple',
  title
}: PlayerControlsProps & { title?: string }) {
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    onSeek(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    onVolumeChange(newVolume);
  };

  // Theme-based colors
  const progressColor = theme === 'purple' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500';
  const buttonHover = theme === 'purple' ? 'hover:bg-purple-500/20' : 'hover:bg-blue-500/20';
  const playButtonGradient = theme === 'purple' ? 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' : 'from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600';
  
  // Dynamic thumb colors for volume slider
  const thumbFromColor = theme === 'purple' ? 'from-purple-500' : 'from-blue-500';
  const thumbToColor = theme === 'purple' ? 'to-pink-500' : 'to-cyan-500';

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 mb-8 flex flex-col items-center text-center">
      
      {/* NOW PLAYING Header */}
      <h3 className={`text-xs font-bold tracking-widest mb-2 ${theme === 'purple' ? 'text-purple-400' : 'text-blue-400'}`}>
        NOW PLAYING
      </h3>

      {/* Song Title */}
      <div className="mb-6 w-full overflow-hidden">
        <h2 className="text-xl sm:text-2xl font-bold text-white truncate px-4">
          {title || "Waiting for tracks..."}
        </h2>
      </div>

      {/* Progress Bar */}
      <div className="w-full mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden group cursor-pointer">
           {/* Seek Input (invisible but clickable) */}
           <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={currentTime} 
            onChange={handleSeekChange}
            className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10`}
          />
          <div 
            className={`absolute top-0 left-0 h-full ${progressColor} transition-all duration-300 ease-out rounded-full`}
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </div>
      </div>

      {/* Controls (Play/Pause, Skip) */}
      <div className="flex items-center justify-center gap-8 mb-6">
        {/* Previous Button (Visual only for now, or maybe restart?) */}
        <button className={`text-gray-600 cursor-not-allowed p-2 rounded-full`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button 
          onClick={onPlayPause}
          className={`text-white transform hover:scale-110 transition-all p-4 rounded-full ${buttonHover}`}
        >
          {isPlaying ? (
            <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 9v6m4-6v6" />
            </svg>
          ) : (
            <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
          )}
        </button>

        <button 
          onClick={onSkip}
          className={`text-gray-400 hover:text-white transition-colors p-2 rounded-full ${buttonHover}`}
          title="Skip Track"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3 w-full max-w-xs">
        <button 
          onClick={() => onVolumeChange(volume === 0 ? 100 : 0)}
          className="text-gray-400 hover:text-white transition-colors flex items-center justify-center h-8 w-8"
        >
          {volume === 0 ? (
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
             </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
        <div className="relative w-full h-2 flex items-center">
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className={`w-full h-2 bg-gray-700/50 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-gradient-to-r
              [&::-webkit-slider-thumb]:${thumbFromColor}
              [&::-webkit-slider-thumb]:${thumbToColor}
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-moz-range-thumb]:w-4
              [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-gradient-to-r
              [&::-moz-range-thumb]:${thumbFromColor}
              [&::-moz-range-thumb]:${thumbToColor}
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer
              [&::-moz-range-thumb]:shadow-lg`}
            style={{
              background: theme === 'purple' 
                ? `linear-gradient(to right, rgb(168 85 247) 0%, rgb(236 72 153) ${volume}%, rgb(55 65 81 / 0.5) ${volume}%, rgb(55 65 81 / 0.5) 100%)`
                : `linear-gradient(to right, rgb(59 130 246) 0%, rgb(6 182 212) ${volume}%, rgb(55 65 81 / 0.5) ${volume}%, rgb(55 65 81 / 0.5) 100%)`
            }}
          />
        </div>
        <span className="text-sm text-gray-400 min-w-[3rem] text-right">{volume}%</span>
      </div>
    </div>
  );
}
