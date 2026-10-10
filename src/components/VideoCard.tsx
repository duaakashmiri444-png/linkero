import React from 'react';
import { Video } from '../types';
import { store } from '../services/store';
import { Play, Bookmark, Clock, CheckCircle } from 'lucide-react';

interface VideoCardProps {
  video: Video;
  onOpen: (videoId: string) => void;
  isUnlocked?: boolean;
  watchProgress?: { progressSeconds: number; durationSeconds: number };
  isFavorite?: boolean;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onOpen,
  isUnlocked,
  watchProgress,
  isFavorite
}) => {
  const percentWatched = watchProgress && watchProgress.durationSeconds > 0
    ? Math.min(100, Math.round((watchProgress.progressSeconds / watchProgress.durationSeconds) * 100))
    : 0;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    void store.toggleFavorite(video.id);
  };

  return (
    <div
      onClick={() => onOpen(video.id)}
      className="group relative w-full bg-[#121422] rounded-2xl overflow-hidden border border-white/[0.08] hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-950/40 cursor-pointer flex flex-col select-none"
    >
      {/* Thumbnail Aspect Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#0a0b12]">
        <img
          src={video.thumbnail}
          alt={video.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Dark Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121422] via-transparent to-black/30 pointer-events-none" />

        {/* Free / Credit Price Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          {video.isFree ? (
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/90 text-white px-2 py-0.5 rounded-md shadow-sm">
              FREE
            </span>
          ) : isUnlocked ? (
            <span className="text-[10px] font-black uppercase tracking-wider bg-purple-600/90 text-white px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              OWNED
            </span>
          ) : (
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-black/75 backdrop-blur-md text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md shadow-sm tabular-nums">
              {video.creditPrice} CR
            </span>
          )}

        </div>

        {/* Duration badge — hidden when the seller never recorded a length */}
        {video.duration && (
          <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 bg-black/80 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md tabular-nums">
            <Clock className="w-2.5 h-2.5 text-slate-400" />
            {video.duration}
          </div>
        )}

        {/* Watchlist toggle in top right */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg backdrop-blur-md transition-all ${isFavorite ? 'bg-purple-600 text-white' : 'bg-black/60 text-slate-300 hover:text-white hover:bg-black/80'}`}
          title={isFavorite ? 'Remove from Watchlist' : 'Add to Watchlist'}
          aria-label="Toggle Watchlist"
        >
          <Bookmark className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        {/* Center Hover Play Icon */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-xl shadow-purple-600/50 transform scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Continue Watching progress bar if partially watched */}
        {percentWatched > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 z-10">
            <div
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${percentWatched}%` }}
            />
          </div>
        )}
      </div>

      {/* Card Info Section */}
      <div className="p-3.5 flex flex-col flex-1 gap-1">
        <h3 className="font-semibold text-sm text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="text-purple-300/80 font-semibold">{video.category}</span>
          {video.ratingCount > 0 && <span aria-hidden="true">·</span>}
          {video.ratingCount > 0 && <span>★ {video.rating.toFixed(1)}</span>}
        </div>
      </div>
    </div>
  );
};
