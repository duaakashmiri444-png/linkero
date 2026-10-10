import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles, 
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
  const [video, setVideo] = useState<Video | undefined>(store.getVideos().find(v => v.id === videoId));
  const [user, setUser] = useState<User>(store.getUser());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [previewExceeded, setPreviewExceeded] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return store.subscribe(() => {
      setUser(store.getUser());
      setVideo(store.getVideos().find(v => v.id === videoId));
    });
  }, [videoId]);

  useEffect(() => {
    // Check if initial resume progress exists
    const progress = user.watchHistory.find(w => w.videoId === videoId);
    if (progress && videoRef.current) {
      videoRef.current.currentTime = progress.progressSeconds;
      setCurrentTime(progress.progressSeconds);
    }
    setPreviewExceeded(false);
    setUnlockError(null);
  }, [videoId]);

  if (!video) return null;

  const isUnlocked = video.isFree || user.unlockedVideoIds.includes(video.id);
  const previewLimit = video.previewTrimSeconds || 20;
  const isFavorite = user.favorites.includes(video.id);
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

    // Check preview limit for paid locked videos
    if (!isUnlocked && !video.isFree && time >= previewLimit) {
      videoRef.current.pause();
      setIsPlaying(false);
      setPreviewExceeded(true);
      onToast(`Preview limit (${previewLimit}s) reached. Unlock full video to continue.`);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || video.durationSeconds);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (previewExceeded && !isUnlocked) {
      onToast(`Please unlock the video to watch beyond the ${previewLimit}s preview.`);
      return;
    }
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
    
    // If not unlocked and seeking past preview limit
    if (!isUnlocked && !video.isFree && targetTime > previewLimit) {
      onToast(`Preview mode only allows viewing the first ${previewLimit} seconds.`);
      videoRef.current.currentTime = previewLimit - 1;
      return;
    }

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

  const handleUnlock = () => {
    setIsUnlocking(true);
    setUnlockError(null);

    // Call store atomic unlock
    const result = store.unlockVideo(video.id);
    setIsUnlocking(false);

    if (result.success) {
      setPreviewExceeded(false);
      onToast(result.message);
      // Auto-resume playback
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play();
          setIsPlaying(true);
        }
      }, 300);
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

  const remainingPreviewSeconds = Math.max(0, Math.ceil(previewLimit - currentTime));

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
            <video
              ref={videoRef}
              src={video.videoUrl}
              poster={video.thumbnail}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
              playsInline
            />

            {/* Preview Countdown Banner Overlay (only shown for locked preview videos) */}
            {!isUnlocked && !video.isFree && !previewExceeded && (
              <div className="absolute top-3 left-3 right-3 bg-black/75 backdrop-blur-md border border-purple-500/40 rounded-xl px-3 py-2 flex items-center justify-between text-xs z-20">
                <div className="flex items-center gap-2 text-purple-200">
                  <Clock className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span>
                    Preview Mode: <strong className="text-white">{remainingPreviewSeconds}s remaining</strong> of {previewLimit}s preview
                  </span>
                </div>
                <button
                  onClick={handleUnlock}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1 rounded-lg text-[11px] transition-colors"
                >
                  Unlock ({video.creditPrice} CR)
                </button>
              </div>
            )}

            {/* Preview Ended Paywall Overlay */}
            {previewExceeded && !isUnlocked && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-fadeIn">
                <div className="w-14 h-14 rounded-full bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 mb-3">
                  <Coins className="w-7 h-7" />
                </div>
                <h3 className="font-display font-bold text-xl md:text-2xl text-white mb-1">
                  Preview Finished
                </h3>
                <p className="text-slate-300 text-xs md:text-sm max-w-md mb-4 leading-relaxed">
                  You've watched the free {previewLimit}-second preview clip. Unlock the full {video.duration} video to continue watching uninterrupted.
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

          </div>

          {/* Video Metadata & Actions Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left 8 Cols: Title, Description, Tags, Creator */}
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

              {/* Creator Card */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-700 to-pink-600 flex items-center justify-center font-bold text-white text-sm">
                  {video.creator.avatar}
                </div>
                <div>
                  <div className="font-semibold text-sm text-white flex items-center gap-1.5">
                    {video.creator.name}
                    {video.creator.verified && (
                      <span className="text-purple-400 text-xs">✓</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{video.creator.handle}</div>
                </div>
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
                      Permanent ownership granted. Watch anytime without paying again.
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
                    onClick={() => {
                      const fav = store.toggleFavorite(video.id);
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

              {/* Linked Digital Pack Teaser if this is a master demo */}
              {video.linkedPackId && (
                <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs space-y-2">
                  <div className="font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Full Pack Available in Marketplace
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    This video is the master demo for a complete digital archive.
                  </p>
                </div>
              )}

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
