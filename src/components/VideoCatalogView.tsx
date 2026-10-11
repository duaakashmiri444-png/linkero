import React, { useEffect, useState } from 'react';
import { Video, User } from '../types';
import { VideoCard } from './VideoCard';
import { CatalogueSection } from './CatalogueSection';
import { store } from '../services/store';

interface VideoCatalogViewProps {
  videos: Video[];
  user: User;
  onOpenVideo: (videoId: string) => void;
}

const anchorFor = (name: string) => `shelf-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export const VideoCatalogView: React.FC<VideoCatalogViewProps> = ({ videos, user, onOpenVideo }) => {
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'newest' | 'price_low' | 'price_high'>('featured');
  const [activeShelf, setActiveShelf] = useState<string>('');

  const pageSize = store.getSectionSize();
  const categories = Array.from(new Set(videos.map(v => v.category))).sort();

  const ordered = (list: Video[]) => {
    if (sortBy === 'price_low') return [...list].sort((a, b) => a.creditPrice - b.creditPrice);
    if (sortBy === 'price_high') return [...list].sort((a, b) => b.creditPrice - a.creditPrice);
    if (sortBy === 'newest') return [...list].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return [...list].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.creditPrice - a.creditPrice);
  };

  const shelves = categories
    .map(category => ({
      category,
      anchor: anchorFor(category),
      list: ordered(
        videos.filter(v => {
          if (v.category !== category) return false;
          if (pricingFilter === 'free') return v.isFree;
          if (pricingFilter === 'paid') return !v.isFree;
          return true;
        })
      )
    }))
    .filter(group => group.list.length > 0);

  // The pinned bar has to say which shelf the shopper is actually looking at.
  useEffect(() => {
    const probe = 160;
    const onScroll = () => {
      let current = '';
      for (const shelf of shelves) {
        const el = document.getElementById(shelf.anchor);
        if (el && el.getBoundingClientRect().top <= probe) current = shelf.anchor;
      }
      setActiveShelf(prev => (prev === current ? prev : current));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [shelves.map(s => s.anchor).join('|'), pricingFilter, sortBy]);

  const jump = (anchor: string) => {
    const el = document.getElementById(anchor);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="py-6 space-y-5">

      {/* Pinned category bar: jump to a shelf, and it lights up as you scroll past them. */}
      <div className="sticky top-[73px] z-30 bg-[#090a12]/95 backdrop-blur-xl border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 flex flex-wrap items-center gap-2">
          <div className="flex w-full gap-1.5 overflow-x-auto overscroll-x-contain text-xs sm:w-auto sm:flex-wrap sm:items-center sm:overflow-visible">
            {shelves.map(group => (
              <button
                key={group.anchor}
                onClick={() => jump(group.anchor)}
                className={`shrink-0 px-3 py-1.5 rounded-xl font-semibold transition-all border text-left ${
                  activeShelf === group.anchor
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-[#121422] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {group.category}
                <span className="ml-1.5 text-[10px] opacity-70 tabular-nums">{group.list.length}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs ml-auto">
            <select
              value={pricingFilter}
              onChange={e => setPricingFilter(e.target.value as 'all' | 'free' | 'paid')}
              className="bg-[#121422] border border-white/10 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
              aria-label="Filter by price"
            >
              <option value="all">Any Pricing</option>
              <option value="free">100% Free</option>
              <option value="paid">Credit Unlocks</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="bg-[#121422] border border-white/10 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
              aria-label="Sort videos"
            >
              <option value="featured">Featured First</option>
              <option value="newest">Recently Added</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {shelves.length === 0 ? (
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center py-20 bg-[#121422]/60 border border-white/10 rounded-3xl p-8 space-y-2">
            <p className="text-slate-400 text-sm">No videos in this price range yet.</p>
            <button
              onClick={() => setPricingFilter('all')}
              className="text-xs text-purple-400 hover:text-purple-300 font-bold"
            >
              Show every video
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-8">
          {shelves.map((group, i) => (
            <CatalogueSection
              key={group.category}
              title={group.category}
              items={group.list}
              pageSize={pageSize}
              anchor={group.anchor}
              ordinal={i + 1}
              pinned={false}
              renderItem={video => (
                <VideoCard
                  video={video}
                  onOpen={onOpenVideo}
                  isUnlocked={video.isFree || user.unlockedVideoIds.includes(video.id)}
                  watchProgress={user.watchHistory.find(w => w.videoId === video.id)}
                  isFavorite={user.favorites.includes(video.id)}
                />
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};
