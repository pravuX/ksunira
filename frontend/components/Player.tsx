'use client';

import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

interface PlayerProps {
  playbackUrl: string | null;
  onTrackEnd: () => void;
  onProgress: (currentTime: number, duration: number) => void;
  isPlaying: boolean;
  seekTime?: number | null;
  volume?: number; // 0-100
}

export default function Player({ playbackUrl, onTrackEnd, onProgress, isPlaying, seekTime, volume = 100 }: PlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      // Set volume when track changes
      audioRef.current.volume = volume / 100;
      
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, playbackUrl, volume]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Handle seeking
  useEffect(() => {
    if (audioRef.current && seekTime !== undefined && seekTime !== null) {
      const diff = Math.abs(audioRef.current.currentTime - seekTime);
      // Only seek if the difference is significant (> 0.5s) to avoid stuttering
      if (diff > 0.5) {
        audioRef.current.currentTime = seekTime;
      }
    }
  }, [seekTime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      onProgress(audio.currentTime, audio.duration);
    };

    const handleEnded = () => {
      onTrackEnd();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onProgress, onTrackEnd]);

  if (!playbackUrl) return null;

  const fullPlaybackUrl = playbackUrl.startsWith('/') 
    ? `${API_BASE_URL}${playbackUrl}` 
    : playbackUrl;

  return (
    <div className="hidden">
      <audio
        ref={audioRef}
        src={fullPlaybackUrl}
        autoPlay
        controls
      />
    </div>
  );
}
