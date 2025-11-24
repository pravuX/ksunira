'use client';

interface NowPlayingProps {
  title: string;
  theme?: 'purple' | 'blue';
}

export default function NowPlaying({ title, theme = 'purple' }: NowPlayingProps) {
  const gradient = theme === 'purple' ? 'from-purple-500 to-pink-500' : 'from-blue-500 to-cyan-500';
  const iconColor = theme === 'purple' ? 'text-purple-400' : 'text-blue-400';

  return (
    <div className="text-center mb-8 relative group">
      <div className={`absolute -inset-1 bg-gradient-to-r ${gradient} rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200`}></div>
      <div className="relative bg-gray-800/80 backdrop-blur-xl p-8 rounded-2xl border border-gray-700/50 shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className={`absolute -inset-4 bg-gradient-to-r ${gradient} rounded-full blur-lg opacity-40 animate-pulse`}></div>
            <div className="relative bg-gray-900 p-4 rounded-full border border-gray-700 shadow-xl">
              <svg className={`w-12 h-12 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          </div>
          <div className="space-y-2 max-w-full">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Now Playing</h2>
            <div className="text-2xl sm:text-3xl font-bold text-white truncate px-4 leading-tight">
              {title}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
