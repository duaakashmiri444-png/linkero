import React, { useRef } from 'react';
import { Video, User } from '../types';
import { VideoCard } from './VideoCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface VideoRailProps {
  title: string;
  videos: Video[];
  user: User;
  onOpenVideo: (videoId: string) => void;
  onViewAll?: () => void;
}

export const VideoRail: React.FC<VideoRailProps> = ({
  title,
  videos,
  user,
  onOpenVideo,
  onViewAll
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (videos.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -650 : 650;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-5 relative">
      {/* Rail Header */}
      <div className="flex items-end justify-between mb-3 px-4 md:px-8">
        <h2 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
          {title}
        </h2>

        <div className="flex items-center gap-2">
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors mr-2"
            >
              See all ({videos.length}) →
            </button>
          )}
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all disabled:opacity-30"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all disabled:opacity-30"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrolling Video Rail */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-4 overflow-x-auto no-scrollbar px-4 md:px-8 pb-3 pt-1 scroll-smooth"
      >
        {videos.map(video => {
          const isUnlocked = video.isFree || user.unlockedVideoIds.includes(video.id);
          const watchHistory = user.watchHistory.find(w => w.videoId === video.id);
          const isFavorite = user.favorites.includes(video.id);

          return (
            <VideoCard
              key={video.id}
              video={video}
              onOpen={onOpenVideo}
              isUnlocked={isUnlocked}
              watchProgress={watchHistory}
              isFavorite={isFavorite}
              rail
            />
          );
        })}
      </div>
    </section>
  );
};
