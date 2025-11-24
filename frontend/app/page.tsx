'use client'; // This directive marks it as a Client Component

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSession, getSession, deleteSession, type Session } from '@/lib/api';
import toast from 'react-hot-toast';

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumableSession, setResumableSession] = useState<Session | null>(null);

  useEffect(() => {
    const checkStoredSession = async () => {
      const storedSessionId = localStorage.getItem('ksunira_session_id');
      const storedHostSecret = localStorage.getItem('ksunira_host_secret');
      console.log("Checking stored session:", storedSessionId, storedHostSecret);

      if (storedSessionId && storedHostSecret) {
        try {
          const session = await getSession(storedSessionId);
          console.log("Session fetched:", session);
          setResumableSession(session);
        } catch (e) {
          console.warn("Stored session invalid or expired", e);
          localStorage.removeItem('ksunira_session_id');
          localStorage.removeItem('ksunira_host_secret');
        }
      } else {
        console.log("No stored session found.");
      }
    };

    checkStoredSession();
  }, []);

  const handleCreateSession = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newSession: Session = await createSession();
      
      // Store in localStorage
      localStorage.setItem('ksunira_session_id', newSession.id);
      localStorage.setItem('ksunira_host_secret', newSession.host_secret);

      // On success, redirect to the host page for the new session
      router.push(`/host/${newSession.id}?secret=${newSession.host_secret}`);
    } catch (err) {
      setError('Failed to create a session. Is the backend server running?');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeSession = () => {
    if (resumableSession) {
      const secret = localStorage.getItem('ksunira_host_secret');
      router.push(`/host/${resumableSession.id}?secret=${secret}`);
    }
  };

  const handleEndSession = async () => {
    if (!resumableSession) return;
    if (!confirm("Are you sure you want to delete this session? This cannot be undone.")) return;
    
    try {
      await deleteSession(resumableSession.id);
      // Clear local storage
      localStorage.removeItem('ksunira_session_id');
      localStorage.removeItem('ksunira_host_secret');
      setResumableSession(null);
      toast.success("Session deleted!");
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete session");
    }
  };

  const handleStartNew = () => {
    localStorage.removeItem('ksunira_session_id');
    localStorage.removeItem('ksunira_host_secret');
    setResumableSession(null);
    handleCreateSession();
  };

  const [guestSessionId, setGuestSessionId] = useState('');

  const handleJoinAsGuest = () => {
    if (guestSessionId.trim()) {
      router.push(`/join/${guestSessionId.trim()}`);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Header with branding */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            K Sunira?
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 italic">What're you listening to?</p>
          <p className="text-xs sm:text-sm text-gray-400 mt-2">Shared Party Music Player</p>
        </div>

        {/* Main content cards */}
        <div className="space-y-4 sm:space-y-6">
          {resumableSession ? (
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl border border-purple-500/20">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-purple-300">Resume Your Session</h2>
              <div className="space-y-4">
                <div className="bg-gray-700/50 p-3 sm:p-4 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-400 mb-1">Session ID</p>
                  <p className="font-mono text-sm sm:text-lg text-white break-all">{resumableSession.id}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleResumeSession}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 sm:py-4 px-6 rounded-xl transition-colors shadow-lg"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                      </svg>
                      Resume Session
                    </span>
                  </button>
                  <button
                    onClick={handleEndSession}
                    className="bg-gray-700/50 hover:bg-red-600/80 text-gray-300 hover:text-white font-semibold py-3 sm:py-4 px-6 rounded-xl transition-all shadow-lg border border-gray-600 hover:border-red-500"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      End Session
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl border border-purple-500/20">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-purple-300">Start a New Session</h2>
              <button
                onClick={handleCreateSession}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 sm:py-5 px-8 rounded-xl transition-colors shadow-lg text-base sm:text-lg"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Party
                </span>
              </button>
            </div>
          )}

          {/* Join as Guest */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl border border-blue-500/20">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-blue-300">Join a Party</h2>
            <form onSubmit={handleJoinAsGuest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Enter Session ID
                </label>
                <input
                  type="text"
                  value={guestSessionId}
                  onChange={(e) => setGuestSessionId(e.target.value)}
                  placeholder="e.g., 3e4660dc-56d5..."
                  className="w-full bg-gray-700/50 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600 text-sm sm:text-base"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 sm:py-4 px-6 rounded-xl transition-colors shadow-lg"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Join as Guest
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 sm:mt-12 text-gray-500 text-xs sm:text-sm">
          <p>Share music, vote on tracks, and party together! 🎶</p>
        </div>
      </div>
    </main>
  );
}
