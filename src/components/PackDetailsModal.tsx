import React, { useState, useEffect, useCallback } from 'react';
import { DigitalPack, MediaRow, PackVideo, User } from '../types';
import { store } from '../services/store';
import { formatDuration, humanBytes } from '../services/mappers';
import {
  X,
  Coins,
  CheckCircle,
  Cloud,
  HardDrive,
  Send,
  MessageCircle,
  Package,
  Download,
  ExternalLink,
  Flag,
  AlertCircle,
  Lock,
  Play,
  Film,
  Images,
  Pause,
} from 'lucide-react';

interface PackDetailsModalProps {
  packId: string;
  onClose: () => void;
  onOpenWallet: () => void;
  onSelectVideo?: (videoId: string) => void;
  onOpenReport: (targetId: string, title: string, type: 'pack') => void;
  onToast: (msg: string) => void;
}

/** What the inline player is showing right now. */
type NowPlaying =
  | { kind: 'demo'; title: string; url: string }
  | { kind: 'pack-video'; title: string; url: string; videoId: number };

export const PackDetailsModal: React.FC<PackDetailsModalProps> = ({
  packId,
  onClose,
  onOpenWallet,
  onOpenReport,
  onToast
}) => {
  const [pack, setPack] = useState<DigitalPack | undefined>(store.getPacks().find(p => p.id === packId));
  const [user, setUser] = useState<User>(store.getUser());
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [videos, setVideos] = useState<PackVideo[]>([]);
  const [files, setFiles] = useState<MediaRow[]>([]);
  const [photos, setPhotos] = useState<MediaRow[]>([]);
  const [clips, setClips] = useState<MediaRow[]>([]);
  const [deliverablesLoading, setDeliverablesLoading] = useState(false);
  const [filesMessage, setFilesMessage] = useState<string | null>(null);
  const [playing, setPlaying] = useState<NowPlaying | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomed, setZoomed] = useState<MediaRow | null>(null);

  const isUnlocked = store.ownsPack(packId);

  // Premium URLs come ONLY from the authorised server call; never from the pack payload.
  const loadDeliverables = useCallback(async (id: string) => {
    setDeliverablesLoading(true);
    setFilesMessage(null);
    const result = await store.getPackFiles(id);
    setVideos(result.videos);
    setFiles(result.files);
    setFilesMessage(result.message);
    setDeliverablesLoading(false);
  }, []);

  useEffect(() => {
    return store.subscribe(() => {
      setUser(store.getUser());
      setPack(store.getPacks().find(p => p.id === packId));
    });
  }, [packId]);

  // Preview photos are public, so a shopper sees them before spending anything.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await store.loadPackPreview(packId);
      if (cancelled) return;
      setPhotos(loaded.filter(m => m.media_type === 'DEMO_PHOTO'));
      setClips(loaded.filter(m => m.media_type === 'DEMO_VIDEO'));
    })();
    return () => {
      cancelled = true;
    };
  }, [packId]);

  useEffect(() => {
    if (isUnlocked) {
      loadDeliverables(packId);
    } else {
      setVideos([]);
      setFiles([]);
      setFilesMessage(null);
      setPlaying(null);
    }
  }, [isUnlocked, packId, loadDeliverables]);

  if (!pack) return null;

  const access = pack.access;
  const galleryPhotos = [...photos, ...clips];
  const masterDemoUrl = pack.demoUrl || clips.find(c => c.url)?.url || '';

  const handleUnlock = async () => {
    setIsUnlocking(true);
    setErrorMsg(null);

    const result = await store.unlockPack(pack.id);
    setIsUnlocking(false);

    if (result.success) {
      onToast(result.message);
    } else {
      setErrorMsg(result.message);
      onToast(result.message);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'MEGA':
        return <Cloud className="w-4 h-4 text-red-400" />;
      case 'Google Drive':
        return <HardDrive className="w-4 h-4 text-blue-400" />;
      case 'Telegram':
        return <Send className="w-4 h-4 text-sky-400" />;
      case 'WhatsApp':
        return <MessageCircle className="w-4 h-4 text-emerald-400" />;
      default:
        return <Package className="w-4 h-4 text-purple-400" />;
    }
  };

  const playDemo = () => {
    if (!masterDemoUrl) return;
    setPlaying({ kind: 'demo', title: `${pack.title} — master demo`, url: masterDemoUrl });
    setIsPlaying(true);
  };

  const playPackVideo = (video: PackVideo) => {
    setPlaying({ kind: 'pack-video', title: video.title, url: video.url, videoId: video.id });
    setIsPlaying(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="relative w-full max-w-5xl bg-[#10121f] border border-white/15 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/10 bg-[#0c0e18] shrink-0">
          <div className="flex items-center gap-2 truncate pr-4 min-w-0">
            <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-lg shrink-0">
              {getPlatformIcon(pack.platform)}
              <span>{pack.platform} Pack</span>
            </span>
            <span className="text-white text-sm font-semibold truncate">{pack.title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

            {/* Left: player / cover, then the preview photo reel */}
            <div className="md:col-span-5 space-y-3">
              <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 relative bg-[#0a0b12]">
                {playing ? (
                  <>
                    <video
                      key={playing.url}
                      src={playing.url}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full bg-black"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
                      <span className="bg-black/80 border border-white/10 px-2 py-0.5 rounded-lg text-[11px] font-bold text-white truncate">
                        {playing.kind === 'demo' ? 'MASTER DEMO' : 'IN THIS PACK'} · {playing.title}
                      </span>
                      <button
                        onClick={() => setPlaying(null)}
                        className="bg-black/80 border border-white/10 p-1 rounded-lg text-slate-300 hover:text-white shrink-0"
                        aria-label="Stop playing"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <img src={pack.coverImage} alt={pack.title} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 bg-black/80 px-2.5 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 border border-white/10">
                      {getPlatformIcon(pack.platform)}
                      <span>{pack.platform}</span>
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/80 px-2.5 py-1 rounded-lg text-xs font-bold text-purple-300 border border-purple-500/30">
                      {pack.videoCount > 0
                        ? `${pack.videoCount} video${pack.videoCount === 1 ? '' : 's'}${pack.fileCount > 0 ? ` + ${pack.fileCount} file${pack.fileCount === 1 ? '' : 's'}` : ''}`
                        : pack.totalBytes > 0
                          ? humanBytes(pack.totalBytes)
                          : `${pack.fileCount} file${pack.fileCount === 1 ? '' : 's'}`}
                    </div>
                  </>
                )}
              </div>

              {/* Master demo control */}
              {masterDemoUrl && !playing && (
                <button
                  onClick={playDemo}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Play className="w-4 h-4" />
                  Play master demo
                </button>
              )}
              {masterDemoUrl && playing?.kind === 'demo' && (
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-2"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pause demo' : 'Resume demo'}
                </button>
              )}

              {/* Scrollable preview photos reel — free to look at, no credits needed */}
              {galleryPhotos.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-[#0c0e18] p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-white">
                      <Images className="w-3.5 h-3.5 text-purple-400" />
                      What is inside
                    </span>
                    <span className="text-slate-500">{galleryPhotos.length} preview(s) · scroll →</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1.5 pr-1 snap-x">
                    {galleryPhotos.map(photo => {
                      const isClip = photo.media_type === 'DEMO_VIDEO';
                      return (
                        <button
                          key={photo.id}
                          onClick={() =>
                            isClip && photo.url
                              ? setPlaying({ kind: 'demo', title: photo.label || 'Demo clip', url: photo.url })
                              : setZoomed(photo)
                          }
                          className={`relative shrink-0 w-28 aspect-[4/3] rounded-xl overflow-hidden border snap-start transition-all ${
                            zoomed?.id === photo.id ? 'border-purple-500' : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          {isClip ? (
                            <video src={photo.url ?? ''} className="w-full h-full object-cover" muted preload="metadata" />
                          ) : (
                            <img
                              src={photo.url ?? ''}
                              alt={photo.caption || photo.label || pack.title}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          )}
                          <span className="absolute bottom-1 left-1 right-1 bg-black/80 rounded px-1 py-0.5 text-[9px] text-slate-200 truncate">
                            {isClip ? 'clip · ' : ''}
                            {photo.label || photo.caption || `Preview ${photo.sort_order}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right: meta, contents, unlock state */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1 flex-wrap">
                  <span className="text-purple-300 font-semibold">{pack.category}</span>
                  <span>·</span>
                  <span>{pack.fileCount} file{pack.fileCount === 1 ? '' : 's'}</span>
                  {pack.videoCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-400 font-semibold">
                        {pack.videoCount} video{pack.videoCount === 1 ? '' : 's'} playable in-site
                      </span>
                    </>
                  )}
                  {pack.totalBytes > 0 && (
                    <>
                      <span>·</span>
                      <span>{humanBytes(pack.totalBytes)}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>★ {pack.rating.toFixed(1)}</span>
                  <span>·</span>
                  <span>{pack.salesCount} sold</span>
                </div>
                <h2 className="font-display font-bold text-2xl text-white">{pack.title}</h2>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed">{pack.description}</p>

              {access?.is_expired && (
                <div className="flex items-center gap-1.5 text-amber-400 text-xs bg-amber-950/30 border border-amber-500/30 rounded-xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Your access to this pack has expired. Re-purchase to restore the delivery links.</span>
                </div>
              )}

              {isUnlocked ? (
                <div className="space-y-3">
                  {/* Videos that play right here */}
                  {videos.length > 0 && (
                    <div className="p-4 rounded-2xl bg-emerald-950/25 border border-emerald-500/30 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                        <Film className="w-4 h-4" />
                        <span>Videos in this pack</span>
                        <span className="text-[11px] font-normal text-slate-400">
                          — watch them here, no download needed
                        </span>
                      </div>
                      <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {videos.map(video => (
                          <li
                            key={video.id}
                            className={`flex items-center gap-2 bg-[#0b0c16] border rounded-xl px-3 py-2 ${
                              playing?.kind === 'pack-video' && playing.videoId === video.id
                                ? 'border-emerald-500/60'
                                : 'border-white/10'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{video.title}</p>
                              <p className="text-[11px] text-slate-400">
                                {video.durationSeconds > 0 ? formatDuration(video.durationSeconds) : 'Plays in the site player'}
                              </p>
                            </div>
                            <button
                              onClick={() => playPackVideo(video)}
                              className="shrink-0 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-lg text-[11px] transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Play
                            </button>
                            <a
                              href={video.url}
                              download
                              className="shrink-0 flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white font-semibold py-2 px-2.5 rounded-lg text-[11px] transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Save
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Downloadable deliverables */}
                  <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/50 space-y-3">
                    <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                      <CheckCircle className="w-5 h-5 text-purple-400" />
                      <span>Pack unlocked — your files</span>
                    </div>

                    {deliverablesLoading ? (
                      <p className="text-xs text-slate-300 flex items-center gap-2">
                        <span className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        Fetching your authorized download links…
                      </p>
                    ) : files.length > 0 ? (
                      <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {files.map((f, idx) => {
                          const name = f.label || f.caption || `File ${idx + 1}`;
                          const external = !!f.url && !f.url.startsWith('/uploads/');
                          const host = (f.url ?? '').replace(/^https?:\/\//i, '').split(/[/?#]/)[0];
                          return (
                            <li
                              key={f.id ?? idx}
                              className="flex items-center gap-2 bg-[#0b0c16] border border-white/10 rounded-xl px-3 py-2"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{name}</p>
                                <p className="text-[11px] text-slate-400 truncate">
                                  {external
                                    ? host || 'External destination'
                                    : `${humanBytes(f.size_bytes ?? 0)}${f.provider ? ` · ${f.provider}` : ''}`}
                                </p>
                              </div>
                              {f.url ? (
                                <a
                                  href={f.url}
                                  {...(external
                                    ? { target: '_blank', rel: 'noopener noreferrer' }
                                    : { download: true })}
                                  className="shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-2 px-3 rounded-lg text-[11px] transition-all"
                                >
                                  {external ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                                  {external ? 'Open' : 'Download'}
                                </a>
                              ) : (
                                <span className="shrink-0 text-[11px] text-slate-500">Link unavailable</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-300">
                        {filesMessage ||
                          (videos.length
                            ? 'This pack delivers its videos in the player above — no extra files attached.'
                            : 'No delivery files are attached to this pack yet. Please contact support.')}
                      </p>
                    )}

                    {access && (access.is_lifetime ? (
                      <p className="text-[11px] text-slate-400">Lifetime access.</p>
                    ) : access.expires_at ? (
                      <p className="text-[11px] text-slate-400">
                        Access valid until {new Date(access.expires_at).toLocaleString()}.
                      </p>
                    ) : null)}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2 text-xs text-slate-300">
                  <Lock className="w-4 h-4 text-purple-300 shrink-0" />
                  <span>
                    Locked — unlocking reveals{' '}
                    {pack.videoCount > 0 ? `the ${pack.videoCount} video${pack.videoCount === 1 ? '' : 's'} in the player` : 'the files'}
                    {pack.fileCount > 0
                      ? `${pack.videoCount > 0 ? ' and the ' : ''}${pack.fileCount} file${pack.fileCount === 1 ? '' : 's'}`
                      : ''}
                    {' '}and their download links.
                  </span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => onOpenReport(pack.id, pack.title, 'pack')}
                  className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report this pack or broken link</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky action bar — always visible while the body scrolls */}
        {!isUnlocked && (
          <div className="shrink-0 border-t border-white/10 bg-[#0c0e18] px-4 sm:px-6 py-3 space-y-2">
            {errorMsg && (
              <div className="flex items-center gap-1.5 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-baseline gap-4 mr-auto">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Unlock full pack</div>
                  <div className="text-xl font-black text-purple-300 tabular-nums leading-none">
                    {pack.creditPrice} <span className="text-xs font-semibold">Credits</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Your balance</div>
                  <div className="text-base font-bold text-white tabular-nums leading-none">{user.walletBalance}</div>
                </div>
              </div>

              {user.walletBalance >= pack.creditPrice ? (
                <button
                  onClick={handleUnlock}
                  disabled={isUnlocking}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-purple-900/40 transition-all"
                >
                  <Coins className="w-4 h-4" />
                  {isUnlocking ? 'Verifying on server...' : `Unlock Pack (${pack.creditPrice} Credits)`}
                </button>
              ) : (
                <button
                  onClick={onOpenWallet}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 transition-all"
                >
                  <Coins className="w-4 h-4" />
                  Top Up Credits ({pack.creditPrice - user.walletBalance} more needed)
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500">
              Credits are deducted atomically on the server · delivery links and streams release only after purchase
            </p>
          </div>
        )}

        {/* Photo lightbox */}
        {zoomed && (
          <div
            className="absolute inset-0 z-10 bg-black/95 flex items-center justify-center p-6"
            onClick={() => setZoomed(null)}
          >
            <button
              onClick={() => setZoomed(null)}
              className="absolute top-4 right-4 text-slate-300 hover:text-white"
              aria-label="Close preview"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={zoomed.url ?? ''}
              alt={zoomed.caption || zoomed.label || pack.title}
              className="max-w-full max-h-full rounded-xl border border-white/15 object-contain"
            />
            {(zoomed.label || zoomed.caption) && (
              <p className="absolute bottom-5 left-0 right-0 text-center text-xs text-slate-300">
                {zoomed.label || zoomed.caption}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
