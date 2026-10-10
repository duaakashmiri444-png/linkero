import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Video, User } from '../types';
import { store } from '../services/store';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Bookmark, 
  Share2, 
  Flag, 
  Coins, 
  X, 
  Clock, 
  CheckCircle,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

interface VideoPlayerModalProps {
  videoId: string;
  onClose: () => void;
  onOpenWallet: () => void;
  onSelectVideo: (videoId: string) => void;
  onOpenReport: (targetId: string, title: string, type: 'video') => void;
  onToast: (msg: string) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  videoId,
  onClose,
  onOpenWallet,
  onSelectVideo,
  onOpenReport,
  onToast
}) => {
  const [video, setVideo] = useState<Video | undefined>(store.getVideo(videoId));
  const [user, setUser] = useState<User>(store.getUser());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [previewExceeded, setPreviewExceeded] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Playback resolution: the ONLY source of a stream URL is store.getStreamUrl (authorised
  // /content/:id/access call). No sample-clip fallbacks exist any more.
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [resumeAt, setResumeAt] = useState(0);
  const [isLoadingStream, setIsLoadingStream] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return store.subscribe(() => {
      setUser(store.getUser());
      setVideo(store.getVideo(videoId));
    });
  }, [videoId]);

  const loadPlayback = useCallback(async () => {
    setIsLoadingStream(true);
    const result = await store.getStreamUrl(videoId);
    setStreamUrl(result.url);
    setAccessMessage(result.url ? null : result.message);
    setResumeAt(result.url ? result.resumeAt : 0);
    setIsLoadingStream(false);
    return result;
  }, [videoId]);

  useEffect(() => {
    setPreviewExceeded(false);
    setUnlockError(null);
    setCurrentTime(0);
    setIsPlaying(false);
    void loadPlayback();
  }, [loadPlayback]);

  if (!video) return null;

  // The server-supplied free demo (products.demo_url) plays until its own clip ends —
  // there is no client-side per-video trim any more.
  const isPreview = !streamUrl && !!video.previewUrl;
  const playableUrl = streamUrl ?? (video.previewUrl || null);
  const isBlocked = !isLoadingStream && !playableUrl;
  const isUnlocked = !!streamUrl || video.isFree || store.ownsVideo(video.id);
  const isFavorite = store.isFavorite(video.id);
  const relatedVideos = store.getVideos().filter(v => v.id !== video.id && (v.category === video.category || v.isTrending)).slice(0, 4);

  // Time update handler
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Save watch progress every ~5 seconds or on significant intervals
    if (Math.floor(time) % 5 === 0 && duration > 0) {
      store.saveWatchProgress(video.id, time, duration);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || video.durationSeconds);
    if (resumeAt > 0 && resumeAt < (videoRef.current.duration || video.durationSeconds)) {
      videoRef.current.currentTime = resumeAt;
      setCurrentTime(resumeAt);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Playback error:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const targetTime = Number(e.target.value);
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (playerContainerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        playerContainerRef.current.requestFullscreen();
      }
    }
  };

  const handleUnlock = async () => {
    setIsUnlocking(true);
    setUnlockError(null);

    const result = await store.unlockVideo(video.id);
    setIsUnlocking(false);

    if (result.success) {
      setPreviewExceeded(false);
      onToast(result.message);
      const playback = await loadPlayback();
      if (playback.url) {
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => undefined);
          }
        }, 300);
      }
    } else {
      setUnlockError(result.message);
      onToast(result.message);
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    onToast('Video link copied to clipboard!');
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#10121f] border border-white/15 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-[#0c0e18]">
          <div className="flex items-center gap-2 truncate pr-4">
            <span className="text-xs font-bold text-purple-400 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded">
              {video.category}
            </span>
            <span className="text-white text-sm font-semibold truncate">{video.title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Video Player Container */}
          <div
            ref={playerContainerRef}
            className="relative aspect-video w-full bg-black rounded-xl md:rounded-2xl overflow-hidden border border-white/10 shadow-inner group"
          >
            {isLoadingStream ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300 z-20">
                <Clock className="w-7 h-7 animate-pulse text-purple-400" />
                <span className="text-xs font-semibold">Checking your access…</span>
              </div>
            ) : playableUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={playableUrl}
                  poster={video.thumbnail}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => {
                    setIsPlaying(false);
                    if (isPreview) setPreviewExceeded(true);
                  }}
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={togglePlay}
                  playsInline
                />

                {/* Free preview banner (only when playing the server-provided demo clip) */}
                {isPreview && !previewExceeded && (
                  <div className="absolute top-3 left-3 right-3 bg-black/75 backdrop-blur-md border border-purple-500/40 rounded-xl px-3 py-2 flex items-center justify-between text-xs z-20">
                    <div className="flex items-center gap-2 text-purple-200">
                      <Clock className="w-4 h-4 text-purple-400 animate-pulse" />
                      <span>
                        Preview Mode: <strong className="text-white">free demo clip</strong>
                      </span>
                    </div>
                    <button
                      onClick={handleUnlock}
                      disabled={isUnlocking}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1 rounded-lg text-[11px] transition-colors"
                    >
                      {isUnlocking ? 'Unlocking…' : `Unlock (${video.creditPrice} CR)`}
                    </button>
                  </div>
                )}

                {/* Preview Ended Paywall Overlay */}
                {previewExceeded && isPreview && (
                  <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-fadeIn">
                    <div className="w-14 h-14 rounded-full bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 mb-3">
                      <Coins className="w-7 h-7" />
                    </div>
                    <h3 className="font-display font-bold text-xl md:text-2xl text-white mb-1">
                      Preview Finished
                    </h3>
                    <p className="text-slate-300 text-xs md:text-sm max-w-md mb-4 leading-relaxed">
                      You've watched the free preview clip. Unlock the full {video.duration} video to continue watching.
                    </p>

                    <div className="bg-[#171a2d] border border-white/10 rounded-xl p-3 mb-4 w-full max-w-sm flex items-center justify-between text-xs">
                      <span className="text-slate-300">Unlock Price:</span>
                      <span className="text-purple-300 font-bold text-sm tabular-nums">{video.creditPrice} Credits</span>
                    </div>

                    <div className="bg-[#171a2d] border border-white/10 rounded-xl p-3 mb-5 w-full max-w-sm flex items-center justify-between text-xs">
                      <span className="text-slate-300">Your Current Balance:</span>
                      <span className="text-white font-bold text-sm tabular-nums">{user.walletBalance} Credits</span>
                    </div>

                    {unlockError && (
                      <div className="flex items-center gap-1.5 text-rose-400 text-xs mb-3">
                        <AlertCircle className="w-4 h-4" />
                        <span>{unlockError}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {user.walletBalance >= video.creditPrice ? (
                        <button
                          onClick={handleUnlock}
                          disabled={isUnlocking}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-purple-900/40 transition-all"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          {isUnlocking ? 'Unlocking...' : `Unlock & Watch (${video.creditPrice} Credits)`}
                        </button>
                      ) : (
                        <button
                          onClick={onOpenWallet}
                          className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all"
                        >
                          <Coins className="w-4 h-4" />
                          Add Credits ({video.creditPrice - user.walletBalance} more needed)
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = 0;
                            setPreviewExceeded(false);
                          }
                        }}
                        className="bg-white/10 hover:bg-white/15 text-slate-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Replay Preview
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom Bottom Player Control Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-6 flex flex-col gap-2 z-20">
                  
                  {/* Progress Seek Bar */}
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={duration || video.durationSeconds}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center justify-between text-white text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={togglePlay}
                        className="p-1 hover:text-purple-400 transition-colors"
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                      </button>

                      <button
                        onClick={toggleMute}
                        className="p-1 hover:text-purple-400 transition-colors"
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>

                      <span className="text-[11px] font-mono text-slate-300 tabular-nums">
                        {formatSeconds(currentTime)} / {formatSeconds(duration || video.durationSeconds)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Playback speed toggle */}
                      <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-md border border-white/10 text-[11px]">
                        {[0.75, 1, 1.25, 1.5, 2].map(speed => (
                          <button
                            key={speed}
                            onClick={() => handleSpeedChange(speed)}
                            className={`px-1 py-0.5 rounded ${playbackSpeed === speed ? 'text-purple-300 font-bold' : 'text-slate-400 hover:text-white'}`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={toggleFullscreen}
                        className="p-1 hover:text-purple-400 transition-colors"
                        aria-label="Toggle Fullscreen"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* No stream and no preview clip — show the server's honest reason, never a fake clip */
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0c0e18]">
                <div className="w-14 h-14 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-3">
                  <Coins className="w-7 h-7" />
                </div>
                <h3 className="font-display font-bold text-lg md:text-xl text-white mb-1">
                  {video.title}
                </h3>
                <p className="text-slate-300 text-xs md:text-sm max-w-md mb-4 leading-relaxed">
                  {accessMessage ?? 'Unlock this item to watch.'}
                </p>

                {unlockError && (
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs mb-3">
                    <AlertCircle className="w-4 h-4" />
                    <span>{unlockError}</span>
                  </div>
                )}

                {!video.isFree && (
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {user.walletBalance >= video.creditPrice ? (
                      <button
                        onClick={handleUnlock}
                        disabled={isUnlocking}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-purple-900/40 transition-all"
                      >
                        <Coins className="w-4 h-4" />
                        {isUnlocking ? 'Unlocking...' : `Unlock (${video.creditPrice} Credits)`}
                      </button>
                    ) : (
                      <button
                        onClick={onOpenWallet}
                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all"
                      >
                        <Coins className="w-4 h-4" />
                        Top Up Credits
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Video Metadata & Actions Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left 8 Cols: Title, Description, Tags */}
            <div className="md:col-span-8 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1.5">
                  <span className="text-purple-300 font-semibold">{video.category}</span>
                  <span>·</span>
                  <span>Published {video.publishedAt}</span>
                  <span>·</span>
                  <span>★ {video.rating.toFixed(1)} rating</span>
                  <span>·</span>
                  <span>{video.views.toLocaleString()} views</span>
                </div>
                <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
                  {video.title}
                </h2>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed">
                {video.description}
              </p>

              {/* Category tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {video.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-[11px] font-medium text-slate-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right 4 Cols: Purchase / Unlock Status & Quick Actions */}
            <div className="md:col-span-4 space-y-4">
              
              {/* Entitlement Card */}
              <div className="p-4 rounded-xl bg-[#14172a] border border-white/15 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Access Status
                </div>

                {video.isFree ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <CheckCircle className="w-5 h-5" />
                    <span>Free Video Access</span>
                  </div>
                ) : isUnlocked ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                      <CheckCircle className="w-5 h-5 text-purple-400" />
                      <span>Unlocked & In Library</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {video.access?.is_lifetime
                        ? 'Lifetime access. Watch anytime without paying again.'
                        : video.access?.expires_at
                          ? `Access until ${new Date(video.access.expires_at).toLocaleDateString()}.`
                          : 'Purchased access granted.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">Unlock Price:</span>
                      <span className="text-purple-300 font-bold text-base tabular-nums">
                        {video.creditPrice} Credits
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Your Balance:</span>
                      <span className="text-white font-semibold tabular-nums">{user.walletBalance} Credits</span>
                    </div>

                    {user.walletBalance >= video.creditPrice ? (
                      <button
                        onClick={handleUnlock}
                        disabled={isUnlocking}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-900/30 transition-all"
                      >
                        <Coins className="w-4 h-4" />
                        {isUnlocking ? 'Unlocking...' : `Unlock Full Video (${video.creditPrice} CR)`}
                      </button>
                    ) : (
                      <button
                        onClick={onOpenWallet}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                      >
                        <Coins className="w-4 h-4" />
                        Top Up Credits to Unlock
                      </button>
                    )}
                  </div>
                )}

                {/* Quick actions buttons */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                  <button
                    onClick={async () => {
                      const fav = await store.toggleFavorite(video.id);
                      onToast(fav ? 'Added to Watchlist' : 'Removed from Watchlist');
                    }}
                    className={`flex items-center gap-1.5 p-1.5 rounded-lg transition-colors ${isFavorite ? 'text-purple-400 font-bold' : 'hover:text-white'}`}
                  >
                    <Bookmark className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
                    <span>Watchlist</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 p-1.5 hover:text-white transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>

                  <button
                    onClick={() => onOpenReport(video.id, video.title, 'video')}
                    className="flex items-center gap-1.5 p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Related Videos Section */}
          {relatedVideos.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <h3 className="font-bold text-sm text-white mb-3">Related Videos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {relatedVideos.map(rel => (
                  <div
                    key={rel.id}
                    onClick={() => onSelectVideo(rel.id)}
                    className="group cursor-pointer rounded-xl overflow-hidden bg-[#141624] border border-white/5 hover:border-purple-500/40 transition-all p-2"
                  >
                    <div className="aspect-video w-full rounded-lg overflow-hidden relative mb-1.5">
                      <img
                        src={rel.thumbnail}
                        alt={rel.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-1 right-1 text-[9px] bg-black/80 px-1.5 py-0.2 rounded font-mono text-white">
                        {rel.duration}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                      {rel.title}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
                      <span>{rel.category}</span>
                      <span className="font-bold text-purple-300">
                        {rel.isFree ? 'FREE' : `${rel.creditPrice} CR`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
