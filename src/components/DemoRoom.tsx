import React, { useState } from 'react';
import { Video, DigitalPack, User } from '../types';
import { VideoCard } from './VideoCard';
import { Sparkles } from 'lucide-react';

interface DemoRoomProps {
  videos: Video[];
  packs: DigitalPack[];
  user: User;
  onOpenVideo: (videoId: string) => void;
  onOpenPack: (packId: string) => void;
}

export const DemoRoom: React.FC<DemoRoomProps> = ({
  videos,
  user,
  onOpenVideo
}) => {
  const [filterType, setFilterType] = useState<'all' | 'free' | 'preview'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'newest' | 'price_low' | 'price_high' | 'views'>('featured');

  // Categories are whatever the published products actually carry.
  const categories = Array.from(new Set(videos.map(v => v.category))).sort();

  // Demo videos:
  // - free videos
  // - paid videos that ship a server-provided preview clip (products.demo_url)
  const demoVideos = videos.filter(v => {
    // Type filter
    if (filterType === 'free' && !v.isFree) return false;
    if (filterType === 'preview' && (v.isFree || !v.previewUrl)) return false;

    // Category filter
    if (selectedCategory !== 'all' && v.category !== selectedCategory) return false;

    return true;
  });

  // Sort
  const sortedVideos = [...demoVideos].sort((a, b) => {
    if (sortBy === 'price_low') return a.creditPrice - b.creditPrice;
    if (sortBy === 'price_high') return b.creditPrice - a.creditPrice;
    if (sortBy === 'views') return b.views - a.views;
    if (sortBy === 'newest') return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="relative rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-purple-950/60 via-[#141525] to-pink-950/40 border border-purple-500/30 overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            WATCH BEFORE YOU UNLOCK
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
            The Demo Room
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Test and preview content risk-free. Free videos stream completely without deductions. Paid previews showcase the real demo clip before purchasing.
          </p>
        </div>
      </div>

      {/* Filter and sorting controls */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Segmented demo type filter tabs */}
          <div className="flex items-center gap-1 bg-[#121422] border border-white/10 p-1 rounded-xl">
            {[
              { id: 'all', label: 'All Demos' },
              { id: 'free', label: '100% Free Videos' },
              { id: 'preview', label: 'Paid Video Previews' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as 'all' | 'free' | 'preview')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterType === tab.id ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Secondary filter & sort controls */}
          <div className="flex items-center gap-3">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-[#121422] border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
              aria-label="Filter category"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-[#121422] border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
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
          <p className="text-slate-400 text-sm">No demos matched this filter combination.</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {sortedVideos.map(video => {
            const isUnlocked = video.isFree || user.unlockedVideoIds.includes(video.id);
            const watchHistory = user.watchHistory.find(w => w.videoId === video.id);
            const isFavorite = user.favorites.includes(video.id);

            return (
              <div key={video.id} className="w-full">
                <VideoCard
                  video={video}
                  onOpen={onOpenVideo}
                  isUnlocked={isUnlocked}
                  watchProgress={watchHistory}
                  isFavorite={isFavorite}
                />
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
