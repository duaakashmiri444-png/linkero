import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Video, User } from '../types';
import { store } from '../services/store';
import { classifySource, destinationLabel, embedFrameUrl, formatDuration } from '../services/mappers';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle,
  Clock,
  Coins,
  ExternalLink,
  Flag,
  Image as ImageIcon,
  Info,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCw,
  RotateCcw,
  Share2,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  AlertTriangle,
} from 'lucide-react';

interface VideoPlayerModalProps {
  videoId: string;
  onClose: () => void;
  onOpenWallet: () => void;
  onSelectVideo: (videoId: string) => void;
  onOpenReport: (targetId: string, title: string, type: 'video') => void;
  onToast: (msg: string) => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const HIDE_AFTER_MS = 3200;
const SKIP_SECONDS = 10;

type StageKind = 'FILE' | 'EMBED' | 'PHOTO' | 'DESTINATION' | 'NONE';

/** Wraps the element in real fullscreen, then falls back to the native video player on iOS. */
async function enterFullscreen(stage: HTMLElement | null, video: HTMLVideoElement | null): Promise<boolean> {
  const stageAny = stage as HTMLElement & { webkitEnterFullscreen?: () => void };
  const videoAny = video as HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitSupportsFullscreen?: boolean };
  try {
    if (typeof stageAny.requestFullscreen === 'function') {
      await stageAny.requestFullscreen({ navigationUI: 'hide' });
      return true;
    }
    if (typeof stageAny.webkitEnterFullscreen === 'function') {
      stageAny.webkitEnterFullscreen();
      return true;
    }
  } catch {
    /* fall through to the native video player */
  }
  if (typeof videoAny?.webkitEnterFullscreen === 'function') {
    videoAny.webkitEnterFullscreen();
    return true;
  }
  return false;
}

async function exitFullscreen(): Promise<void> {
  const doc = document as Document & { webkitExitFullscreen?: () => void };
  try {
    if (typeof doc.exitFullscreen === 'function' && doc.fullscreenElement) await doc.exitFullscreen();
    else if (typeof doc.webkitExitFullscreen === 'function') doc.webkitExitFullscreen();
  } catch {
    /* the browser drops fullscreen on its own */
  }
}

/** Landscape lock is a progressive enhancement — most iPhones simply rotate with the device. */
async function lockLandscape(): Promise<boolean> {
  const orientation = screen?.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
  if (!orientation?.lock) return false;
  try {
    await orientation.lock('landscape');
    return true;
  } catch {
    return false;
  }
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
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [resumeAt, setResumeAt] = useState(0);
  const [isLoadingStream, setIsLoadingStream] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedTo, setBufferedTo] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [previewExceeded, setPreviewExceeded] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const [chromeVisible, setChromeVisible] = useState(true);
  const [activity, setActivity] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrubRatio, setScrubRatio] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [tapHint, setTapHint] = useState<{ text: string; side: 'left' | 'right' } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pokeRef = useRef(0);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const savedAtRef = useRef(0);

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
    setPlaybackError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setScrubRatio(null);
    void loadPlayback();
  }, [loadPlayback]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      setIsFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const poke = useCallback(() => {
    const now = Date.now();
    if (now - pokeRef.current < 200) return;
    pokeRef.current = now;
    setActivity(a => a + 1);
  }, []);

  const chromeLocked = !isPlaying || speedOpen || drawerOpen || isScrubbing || previewExceeded || Boolean(playbackError);

  useEffect(() => {
    setChromeVisible(true);
    if (chromeLocked) return;
    const id = window.setTimeout(() => setChromeVisible(false), HIDE_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [activity, chromeLocked]);

  // Playback resolution: the ONLY source of a stream URL is store.getStreamUrl (authorised
  // /content/:id/access call). No sample-clip fallbacks exist any more.
  const stage = useMemo<{ kind: StageKind; src: string; isPreview: boolean }>(() => {
    const fromStream = classifySource(streamUrl);
    if (fromStream !== 'NONE' && streamUrl) {
      return { kind: fromStream as StageKind, src: streamUrl, isPreview: false };
    }
    if (!isLoadingStream && video?.previewUrl) {
      return { kind: 'FILE', src: video.previewUrl, isPreview: true };
    }
    if (!isLoadingStream && video && video.previewKind !== 'NONE' && video.previewSource) {
      return { kind: video.previewKind as StageKind, src: video.previewSource, isPreview: true };
    }
    return { kind: 'NONE', src: '', isPreview: true };
  }, [isLoadingStream, streamUrl, video]);

  if (!video) return null;

  const isPreview = stage.isPreview;
  const hasTimeline = stage.kind === 'FILE';
  const isUnlocked = !isPreview && stage.kind !== 'NONE';
  const isFavorite = store.isFavorite(video.id);
  const total = duration || video.durationSeconds || 0;
  const relatedVideos = store.getVideos().filter(v => v.id !== video.id && (v.category === video.category || v.isTrending)).slice(0, 6);
  const chromeHidden = !chromeVisible && isPlaying && !drawerOpen;

  const seekTo = (time: number) => {
    const el = videoRef.current;
    if (!el) return;
    const clamped = Math.min(Math.max(0, time), el.duration || total || 0);
    el.currentTime = clamped;
    setCurrentTime(clamped);
    poke();
  };

  const skip = (delta: number) => {
    const el = videoRef.current;
    if (!el) return;
    seekTo(el.currentTime + delta);
    setTapHint({ text: `${delta > 0 ? `+${delta}` : delta}s`, side: delta > 0 ? 'right' : 'left' });
    window.setTimeout(() => setTapHint(null), 650);
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
          setPlaybackError('Your browser blocked autoplay. Press play to start the stream.');
        });
    } else {
      el.pause();
      setIsPlaying(false);
    }
    poke();
  };

  const applyVolume = (next: number) => {
    const el = videoRef.current;
    const value = Math.min(1, Math.max(0, next));
    if (el) {
      el.volume = value;
      el.muted = value === 0;
    }
    setVolume(value);
    setIsMuted(value === 0);
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
    poke();
  };

  const applySpeed = (next: number) => {
    const el = videoRef.current;
    if (el) el.playbackRate = next;
    setSpeed(next);
    setSpeedOpen(false);
    poke();
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await exitFullscreen();
      return;
    }
    const entered = await enterFullscreen(stageRef.current, videoRef.current);
    if (!entered) {
      onToast('Your browser handles fullscreen itself — expand the video from its native controls.');
      return;
    }
    const locked = await lockLandscape();
    if (!locked && window.innerHeight > window.innerWidth) {
      onToast('Rotating to landscape is your phone’s choice — turn it sideways for a full-width view.');
    }
  };

  const rotateLandscape = async () => {
    if (!document.fullscreenElement) {
      const entered = await enterFullscreen(stageRef.current, videoRef.current);
      if (!entered) {
        onToast('This browser needs its native fullscreen button to rotate the video.');
        return;
      }
    }
    const locked = await lockLandscape();
    onToast(locked ? 'Locked to landscape.' : 'Turn your phone sideways — this browser keeps rotation under your control.');
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
        window.setTimeout(() => videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => undefined), 300);
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

  const ratioFromEvent = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const handleKeyboard = (event: React.KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === ' ' || key === 'k') {
      event.preventDefault();
      if (hasTimeline) togglePlay();
    } else if (key === 'arrowright' || key === 'l') skip(SKIP_SECONDS);
    else if (key === 'arrowleft' || key === 'j') skip(-SKIP_SECONDS);
    else if (key === 'arrowup') applyVolume(volume + 0.1);
    else if (key === 'arrowdown') applyVolume(volume - 0.1);
    else if (key === 'm') toggleMute();
    else if (key === 'f') void toggleFullscreen();
    else if (key === 'i') setDrawerOpen(open => !open);
    else if (key === 'escape') (drawerOpen || speedOpen ? (setDrawerOpen(false), setSpeedOpen(false)) : onClose());
    poke();
  };

  const shownTime = scrubRatio !== null ? scrubRatio * total : currentTime;
  const progressRatio = total > 0 ? Math.min(1, currentTime / total) : 0;
  const bufferedRatio = total > 0 ? Math.min(1, bufferedTo / total) : 0;

  const unlockOrTopUp = (label: string, className: string) =>
    user.walletBalance >= video.creditPrice ? (
      <button
        onClick={handleUnlock}
        disabled={isUnlocking}
        className={`flex items-center justify-center gap-2 font-bold transition-all ${className}`}
      >
        <Coins className="w-4 h-4" />
        {isUnlocking ? 'Unlocking…' : label}
      </button>
    ) : (
      <button
        onClick={onOpenWallet}
        className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all"
      >
        <Coins className="w-4 h-4" />
        Top up to unlock
      </button>
    );

  return (
    <div
      ref={stageRef}
      tabIndex={0}
      onKeyDown={handleKeyboard}
      onMouseMove={poke}
      onFocus={poke}
      className={`fixed inset-0 z-50 bg-black outline-none ${chromeHidden ? 'cursor-none' : ''}`}
    >
      {/* ---------- media layer ---------- */}
      {stage.kind === 'FILE' && (
        <video
          ref={videoRef}
          key={stage.src}
          src={stage.src}
          poster={video.thumbnail}
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-contain"
          onClick={togglePlay}
          onDoubleClick={event => {
            const width = window.innerWidth;
            skip(event.clientX < width / 2 ? -SKIP_SECONDS : SKIP_SECONDS);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => {
            setIsBuffering(false);
            setPlaybackError(null);
          }}
          onTimeUpdate={() => {
            const el = videoRef.current;
            if (!el || isScrubbing) return;
            setCurrentTime(el.currentTime);
            if (isScrubbing) return;
            // Only an actual entitlement earns a place in Continue Watching — never a free preview.
            if (!isPreview && Math.abs(el.currentTime - savedAtRef.current) >= 5) {
              savedAtRef.current = el.currentTime;
              void store.saveWatchProgress(video.id, el.currentTime, el.duration || total);
            }
          }}
          onProgress={() => {
            const el = videoRef.current;
            if (el && el.buffered.length) setBufferedTo(el.buffered.end(el.buffered.length - 1));
          }}
          onLoadedMetadata={() => {
            const el = videoRef.current;
            if (!el) return;
            setDuration(el.duration || video.durationSeconds);
            applySpeed(el.playbackRate);
            if (resumeAt > 0 && resumeAt < (el.duration || 0)) {
              el.currentTime = resumeAt;
              setCurrentTime(resumeAt);
            }
            if (!previewExceeded) el.play().catch(() => setIsPlaying(false));
          }}
          onVolumeChange={() => {
            const el = videoRef.current;
            if (!el) return;
            setVolume(el.volume);
            setIsMuted(el.muted);
          }}
          onEnded={() => {
            setIsPlaying(false);
            if (isPreview) setPreviewExceeded(true);
          }}
          onError={(e) => {
            setIsBuffering(false);
            const code = e.currentTarget.error?.code;
            setPlaybackError(
              code === 3 || code === 4
                ? 'Your device cannot decode this file.'
                : code === 2
                  ? 'The connection dropped while loading.'
                  : isPreview
                    ? 'This preview could not be streamed.'
                    : 'This file could not be streamed.'
            );
          }}
        />
      )}

      {stage.kind === 'EMBED' && (
        <iframe
          src={embedFrameUrl(stage.src)}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0 bg-black"
        />
      )}

      {stage.kind === 'PHOTO' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <img src={stage.src} alt={video.title} className="max-h-full max-w-full object-contain" />
        </div>
      )}

      {(stage.kind === 'DESTINATION' || stage.kind === 'NONE') && !isLoadingStream && (
        <div className="absolute inset-0 flex items-center justify-center px-5 py-24">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-500/40 bg-purple-600/15 text-purple-300">
              {stage.kind === 'DESTINATION' ? <ExternalLink className="h-8 w-8" /> : <Coins className="h-8 w-8" />}
            </div>
            <h2 className="font-display text-xl font-bold text-white sm:text-2xl">{video.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {stage.kind === 'DESTINATION'
                ? `${destinationLabel(stage.src)} link — not a streamable file.`
                : (accessMessage ?? 'Unlock this item to watch.')}
            </p>

            {stage.kind === 'DESTINATION' && (
              <a
                href={stage.src}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/15"
              >
                <ExternalLink className="h-4 w-4" />
                Open {destinationLabel(stage.src)}
              </a>
            )}

            {stage.kind === 'NONE' && !video.isFree && !isPreview && (
              <div className="mt-4">{unlockOrTopUp(`Unlock (${video.creditPrice} Credits)`, 'rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm text-white shadow-lg shadow-purple-900/40')}</div>
            )}
            {stage.kind === 'NONE' && !video.isFree && isPreview && (
              <div className="mt-4">{unlockOrTopUp(`Unlock now (${video.creditPrice} CR)`, 'rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm text-white shadow-lg shadow-purple-900/40')}</div>
            )}
          </div>
        </div>
      )}

      {isLoadingStream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <span className="text-sm font-semibold text-slate-300">Checking your access…</span>
        </div>
      )}

      {/* ---------- centre state badges ---------- */}
      {hasTimeline && isBuffering && !playbackError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-white/85" />
        </div>
      )}

      {hasTimeline && !isPlaying && !isBuffering && !playbackError && !previewExceeded && (
        <button
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/25 backdrop-blur-sm transition hover:scale-105 hover:bg-purple-600/80">
            <Play className="ml-1 h-9 w-9 fill-white text-white" />
          </span>
        </button>
      )}

      {tapHint && (
        <div className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${tapHint.side === 'left' ? 'left-6' : 'right-6'}`}>
          <div className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-sm font-bold text-white ring-1 ring-white/20">
            {tapHint.side === 'left' ? <SkipBack className="h-4 w-4" /> : <SkipForward className="h-4 w-4" />}
            {tapHint.text}
          </div>
        </div>
      )}

      {playbackError && hasTimeline && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-5">
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-white/15 bg-[#0d0f1a]/95 p-5 text-center backdrop-blur">
            <AlertTriangle className="h-7 w-7 text-amber-400" />
            <p className="text-sm leading-relaxed text-slate-200">{playbackError}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => {
                  setPlaybackError(null);
                  videoRef.current?.load();
                  void loadPlayback();
                }}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-500"
              >
                <RotateCcw className="h-4 w-4" />
                Try again
              </button>
              <a
                href={stage.src}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
              >
                Open file directly
              </a>
            </div>
          </div>
        </div>
      )}

      {previewExceeded && isPreview && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/88 px-5 py-24 backdrop-blur-sm">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-500/50 bg-purple-600/25 text-purple-300">
              <Coins className="h-8 w-8" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white">Preview finished</h2>
            <p className="mt-2 text-sm text-slate-400">
              That was the preview.{video.duration ? ` Full stream: ${video.duration}.` : ''}
            </p>
            <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-[#14172a] p-4 text-left text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Unlock price</span>
                <span className="font-bold tabular-nums text-purple-300">{video.creditPrice} Credits</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Your balance</span>
                <span className="font-bold tabular-nums text-white">{user.walletBalance} Credits</span>
              </div>
            </div>
            {unlockError && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-rose-400">
                <AlertTriangle className="h-4 w-4" />
                {unlockError}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {unlockOrTopUp(
                user.walletBalance >= video.creditPrice ? `Unlock & watch (${video.creditPrice} CR)` : 'Add credits',
                'rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 text-sm text-white shadow-lg shadow-purple-900/40 hover:from-purple-500 hover:to-pink-500'
              )}
              <button
                onClick={() => {
                  const el = videoRef.current;
                  if (el) {
                    el.currentTime = 0;
                    void el.play().catch(() => undefined);
                  }
                  setPreviewExceeded(false);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/15"
              >
                <RotateCcw className="h-4 w-4" />
                Replay preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- top chrome ---------- */}
      <div
        className={`absolute inset-x-0 top-0 bg-gradient-to-b from-black/85 via-black/45 to-transparent px-3 pb-14 pt-3 transition-opacity duration-300 sm:px-6 sm:pt-5 ${
          chromeHidden ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={onClose}
            aria-label="Close player"
            className="shrink-0 rounded-full bg-black/45 p-2 text-white ring-1 ring-white/15 transition hover:bg-black/70"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded bg-purple-500/25 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-200 ring-1 ring-purple-500/40">
                {video.category}
              </span>
              {isPreview && !video.isFree && (
                <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-200">
                  Preview
                </span>
              )}
              {isUnlocked && (
                <span className="flex shrink-0 items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30">
                  <CheckCircle className="h-3 w-3" />
                  Unlocked
                </span>
              )}
            </div>
            <h1 className="mt-1 truncate font-display text-lg font-bold leading-tight text-white sm:text-2xl">{video.title}</h1>
          </div>
          <button
            onClick={() => setDrawerOpen(open => !open)}
            aria-label="Details"
            className={`shrink-0 rounded-full p-2 ring-1 transition ${
              drawerOpen ? 'bg-purple-600 text-white ring-purple-400' : 'bg-black/45 text-white ring-white/15 hover:bg-black/70'
            }`}
          >
            <Info className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* ---------- bottom chrome ---------- */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/92 via-black/55 to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16 transition-opacity duration-300 sm:px-6 sm:pb-6 ${
          chromeHidden && !drawerOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        {stage.kind === 'PHOTO' && (
          <p className="mb-3 flex items-center gap-2 text-sm text-slate-300">
            <ImageIcon className="h-4 w-4 text-purple-300" />
            The seller attached a photo as the preview for this listing.
          </p>
        )}
        {stage.kind === 'EMBED' && (
          <p className="mb-3 text-sm text-slate-300">Embedded preview supplied by the seller — controls belong to the provider.</p>
        )}

        {isPreview && !video.isFree && !previewExceeded && hasTimeline && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-purple-500/40 bg-black/70 px-3 py-2 backdrop-blur">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-purple-200">
              <Clock className="h-4 w-4 animate-pulse text-purple-400" />
              Free preview clip
            </span>
            {unlockOrTopUp(`Unlock · ${video.creditPrice} CR`, 'rounded-lg bg-purple-600 px-3.5 py-1.5 text-[13px] text-white hover:bg-purple-500')}
          </div>
        )}

        {hasTimeline && (
          <>
            {/* scrub bar */}
            <div
              ref={barRef}
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.round(total)}
              aria-valuenow={Math.round(shownTime)}
              tabIndex={-1}
              onPointerDown={event => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setIsScrubbing(true);
                const ratio = ratioFromEvent(event.clientX);
                setScrubRatio(ratio);
                seekTo(ratio * total);
              }}
              onPointerMove={event => {
                const ratio = ratioFromEvent(event.clientX);
                setScrubRatio(prev => (prev === null && !isScrubbing ? null : ratio));
                if (isScrubbing) seekTo(ratio * total);
              }}
              onPointerLeave={() => setScrubRatio(null)}
              onPointerUp={event => {
                event.currentTarget.releasePointerCapture(event.pointerId);
                setIsScrubbing(false);
                setScrubRatio(null);
              }}
              className="group/bar relative -mx-1 flex h-8 cursor-pointer touch-none items-center px-1"
            >
              <div className="relative h-1.5 w-full rounded-full bg-white/25 transition-all group-hover/bar:h-2.5">
                <div className="absolute inset-y-0 left-0 rounded-full bg-white/35" style={{ width: `${bufferedRatio * 100}%` }} />
                <div className="absolute inset-y-0 left-0 rounded-full bg-purple-500" style={{ width: `${progressRatio * 100}%` }} />
                {scrubRatio !== null && (
                  <div className="absolute inset-y-0 left-0 rounded-full bg-purple-400" style={{ width: `${scrubRatio * 100}%` }} />
                )}
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-lg transition-opacity group-hover/bar:opacity-100"
                  style={{ left: `${(scrubRatio ?? progressRatio) * 100}%` }}
                />
              </div>
              {scrubRatio !== null && total > 0 && (
                <span
                  className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-md bg-black/85 px-1.5 py-0.5 font-mono text-[12px] tabular-nums text-white ring-1 ring-white/15"
                  style={{ left: `${scrubRatio * 100}%` }}
                >
                  {formatDuration(scrubRatio * total)}
                </span>
              )}
            </div>

            {/* control row */}
            <div className="mt-1 flex items-center gap-1.5 text-white sm:gap-3">
              <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="rounded-full p-2 transition hover:bg-white/10">
                {isPlaying ? <Pause className="h-7 w-7 fill-white" /> : <Play className="h-7 w-7 fill-white" />}
              </button>

              <button onClick={() => skip(-SKIP_SECONDS)} aria-label="Back 10 seconds" className="rounded-full p-2 transition hover:bg-white/10">
                <SkipBack className="h-6 w-6" />
              </button>
              <button onClick={() => skip(SKIP_SECONDS)} aria-label="Forward 10 seconds" className="rounded-full p-2 transition hover:bg-white/10">
                <SkipForward className="h-6 w-6" />
              </button>

              <div className="hidden items-center gap-2 sm:flex">
                <button onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'} className="rounded-full p-2 transition hover:bg-white/10">
                  {isMuted || volume === 0 ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={event => applyVolume(Number(event.target.value))}
                  aria-label="Volume"
                  className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/30 accent-purple-500"
                />
              </div>

              <span className="ml-1 font-mono text-[13px] tabular-nums text-slate-200">
                {formatDuration(shownTime)} <span className="text-slate-500">/ {formatDuration(total)}</span>
              </span>

              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                <div className="relative">
                  <button
                    onClick={() => setSpeedOpen(open => !open)}
                    className="rounded-full border border-white/20 px-2.5 py-1 text-[13px] font-bold tabular-nums text-white transition hover:bg-white/10"
                  >
                    {speed}x
                  </button>
                  {speedOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-24 rounded-xl border border-white/15 bg-[#12141f] p-1.5 shadow-2xl">
                      {SPEEDS.map(option => (
                        <button
                          key={option}
                          onClick={() => applySpeed(option)}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] tabular-nums transition ${
                            option === speed ? 'bg-purple-600 font-bold text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {option}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={rotateLandscape} aria-label="Rotate to landscape fullscreen" className="rounded-full p-2 transition hover:bg-white/10">
                  <RotateCw className="h-6 w-6" />
                </button>
                <button onClick={() => void toggleFullscreen()} aria-label="Toggle fullscreen" className="rounded-full p-2 transition hover:bg-white/10">
                  {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---------- details drawer ---------- */}
      {drawerOpen && (
        <div className="absolute inset-0 z-30 flex justify-end">
          <button aria-label="Close details" onClick={() => setDrawerOpen(false)} className="flex-1 bg-black/60" />
          <aside className="flex h-full w-[min(440px,92vw)] flex-col border-l border-white/10 bg-[#0b0d17]/97 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-sm font-bold uppercase tracking-wider text-slate-400">Details</span>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close details" className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <div>
                <h2 className="font-display text-xl font-bold text-white">{video.title}</h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-400">
                  <span className="font-semibold text-purple-300">{video.category}</span>
                  {video.duration && (
                    <>
                      <span>·</span>
                      <span>{video.duration}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{video.views.toLocaleString()} views</span>
                  {video.ratingCount > 0 && (
                    <>
                      <span>·</span>
                      <span>★ {video.rating.toFixed(1)} ({video.ratingCount})</span>
                    </>
                  )}
                </div>
              </div>

              <p className="text-sm leading-relaxed text-slate-300">{video.description || 'No description supplied.'}</p>

              {video.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {video.tags.map(tag => (
                    <span key={tag} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[13px] text-slate-300">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-3 rounded-2xl border border-white/15 bg-[#14172a] p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Access</div>
                {video.isFree ? (
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                    <CheckCircle className="h-5 w-5" />
                    Free video — no credits needed
                  </div>
                ) : isUnlocked ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-purple-300">
                      <CheckCircle className="h-5 w-5 text-purple-400" />
                      Unlocked &amp; in your library
                    </div>
                    <p className="text-[13px] text-slate-400">
                      {video.access?.is_lifetime
                        ? 'Lifetime access. Watch anytime without paying again.'
                        : video.access?.expires_at
                          ? `Available until ${new Date(video.access.expires_at).toLocaleDateString()}.`
                          : 'Purchased access granted.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">Unlock price</span>
                      <span className="font-bold tabular-nums text-purple-300">{video.creditPrice} Credits</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-slate-400">Your balance</span>
                      <span className="font-semibold tabular-nums text-white">{user.walletBalance} Credits</span>
                    </div>
                    {unlockOrTopUp(`Unlock full video (${video.creditPrice} CR)`, 'w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 text-sm text-white hover:from-purple-500 hover:to-pink-500')}
                    {unlockError && <p className="text-[13px] text-rose-400">{unlockError}</p>}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-white/10 pt-3 text-[13px]">
                  <button
                    onClick={async () => {
                      const fav = await store.toggleFavorite(video.id);
                      onToast(fav ? 'Added to Watchlist' : 'Removed from Watchlist');
                    }}
                    className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition ${isFavorite ? 'font-bold text-purple-400' : 'text-slate-300 hover:text-white'}`}
                  >
                    <Bookmark className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
                    Watchlist
                  </button>
                  <button onClick={handleShare} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-slate-300 transition hover:text-white">
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                  <button
                    onClick={() => onOpenReport(video.id, video.title, 'video')}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-slate-400 transition hover:text-rose-400"
                  >
                    <Flag className="h-4 w-4" />
                    Report
                  </button>
                </div>
              </div>

              {relatedVideos.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">More like this</div>
                  <div className="space-y-2">
                    {relatedVideos.map(rel => (
                      <button
                        key={rel.id}
                        onClick={() => {
                          setDrawerOpen(false);
                          onSelectVideo(rel.id);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-[#12141f] p-2 text-left transition hover:border-purple-500/40 hover:bg-white/5"
                      >
                        <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-black">
                          {rel.thumbnail ? <img src={rel.thumbnail} alt="" className="h-full w-full object-cover" /> : null}
                          {rel.duration && (
                            <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 font-mono text-[11px] text-white">{rel.duration}</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white">{rel.title}</span>
                          <span className="mt-0.5 flex items-center justify-between text-[12px] text-slate-400">
                            <span>{rel.category}</span>
                            <span className="font-bold text-purple-300">{rel.isFree ? 'FREE' : `${rel.creditPrice} CR`}</span>
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
