import React, { useEffect, useRef, useState } from 'react';
import { Video, DigitalPack, User } from '../types';
import { VideoCard } from './VideoCard';
import { GRID_VIDEOS } from './CatalogueSection';
import { store } from '../services/store';
import { Sparkles } from 'lucide-react';

interface DemoRoomProps {
  videos: Video[];
  packs: DigitalPack[];
  user: User;
  onOpenVideo: (videoId: string) => void;
  onOpenPack: (packId: string) => void;
}

const TABS = [
  { id: 'all', label: 'All Demos' },
  { id: 'free', label: '100% Free' },
  { id: 'preview', label: 'Paid Previews' }
] as const;

type TabId = typeof TABS[number]['id'];

export const DemoRoom: React.FC<DemoRoomProps> = ({ videos, user, onOpenVideo }) => {
  const [filterType, setFilterType] = useState<TabId>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'newest' | 'price_low' | 'price_high' | 'views'>('featured');
  const [visible, setVisible] = useState(store.getSectionSize());
  const [pinned, setPinned] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const pageSize = store.getSectionSize();
  const categories = Array.from(new Set(videos.map(v => v.category))).sort();

  const filtered = videos.filter(v => {
    if (filterType === 'free' && !v.isFree) return false;
    if (filterType === 'preview' && (v.isFree || !v.previewUrl)) return false;
    if (selectedCategory !== 'all' && v.category !== selectedCategory) return false;
    return true;
  });

  const sortedVideos = [...filtered].sort((a, b) => {
    if (sortBy === 'price_low') return a.creditPrice - b.creditPrice;
    if (sortBy === 'price_high') return b.creditPrice - a.creditPrice;
    if (sortBy === 'views') return b.views - a.views;
    if (sortBy === 'newest') return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
  });

  const shown = sortedVideos.slice(0, Math.max(visible, pageSize));
  const remaining = sortedVideos.length - shown.length;

  // Watch the sentinel leave the top of the screen: that is the moment the bar is pinned, and it
  // shrinks itself so more demos stay visible while the shopper scrolls.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => setPinned(!entries[0].isIntersecting),
      { rootMargin: '-72px 0px 0px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => setVisible(pageSize), [filterType, selectedCategory, sortBy, pageSize]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">

      {/* Header Banner */}
      <div className="relative rounded-3xl p-5 sm:p-8 bg-gradient-to-r from-purple-950/60 via-[#141525] to-pink-950/40 border border-purple-500/30 overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            WATCH BEFORE YOU UNLOCK
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
            The Demo Room
          </h1>
        </div>
      </div>

      <div ref={sentinel} className="h-px" />

      {/* Pinned demo tabs — they tighten up once they are stuck to the top. */}
      <div
        className={`sticky top-[73px] z-30 -mx-4 px-4 md:mx-0 md:px-0 bg-[#090a12]/95 backdrop-blur-xl border-y border-white/[0.06] transition-all ${
          pinned ? 'py-1.5' : 'py-2.5'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex items-center gap-0.5 bg-[#121422] border border-white/10 ${pinned ? 'p-0.5 rounded-lg' : 'p-1 rounded-xl'}`}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`${pinned ? 'px-2.5 py-1 text-[11px] rounded-md' : 'px-3.5 py-1.5 text-xs rounded-lg'} font-semibold transition-all ${
                  filterType === tab.id ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={`flex items-center gap-2 ${pinned ? 'text-[10px]' : 'text-xs'} ml-auto text-slate-500 tabular-nums`}>
            <span>{shown.length} of {sortedVideos.length}</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className={`bg-[#121422] border border-white/10 text-white ${pinned ? 'px-2 py-1 text-[11px] rounded-lg' : 'px-3 py-1.5 rounded-xl'} focus:outline-none focus:border-purple-500`}
              aria-label="Filter category"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className={`bg-[#121422] border border-white/10 text-white ${pinned ? 'px-2 py-1 text-[11px] rounded-lg' : 'px-3 py-1.5 rounded-xl'} focus:outline-none focus:border-purple-500`}
              aria-label="Sort by"
            >
              <option value="featured">Featured First</option>
              <option value="newest">Recently Added</option>
              <option value="views">Most Popular</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of demo cards */}
      {sortedVideos.length === 0 ? (
        <div className="text-center py-16 bg-[#121422]/60 border border-white/10 rounded-2xl p-8 space-y-2">
          <p className="text-slate-400 text-sm">No demos matched this filter.</p>
          <button
            onClick={() => {
              setFilterType('all');
              setSelectedCategory('all');
            }}
            className="text-xs text-purple-400 hover:text-purple-300 font-bold"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <div className={`${GRID_VIDEOS}`}>
            {shown.map(video => (
              <div key={video.id} className="w-full">
                <VideoCard
                  video={video}
                  onOpen={onOpenVideo}
                  isUnlocked={video.isFree || user.unlockedVideoIds.includes(video.id)}
                  watchProgress={user.watchHistory.find(w => w.videoId === video.id)}
                  isFavorite={user.favorites.includes(video.id)}
                />
              </div>
            ))}
          </div>

          {remaining > 0 && (
            <button
              onClick={() => setVisible(prev => prev + pageSize)}
              className="w-full sm:w-auto bg-[#141626] hover:bg-white/10 border border-white/15 text-white font-semibold px-6 py-3 rounded-xl text-xs transition-colors"
            >
              Load {Math.min(remaining, pageSize)} more ({remaining} left)
            </button>
          )}
        </>
      )}
    </div>
  );
};
