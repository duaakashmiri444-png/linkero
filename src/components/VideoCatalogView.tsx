import React, { useState } from 'react';
import { Video, User } from '../types';
import { VideoRail } from './VideoRail';
import { VideoCard } from './VideoCard';
import { LayoutGrid, Rows, Filter, Sparkles, CheckCircle2 } from 'lucide-react';

interface VideoCatalogViewProps {
  videos: Video[];
  user: User;
  onOpenVideo: (videoId: string) => void;
  onOpenWallet: () => void;
}

export const VideoCatalogView: React.FC<VideoCatalogViewProps> = ({
  videos,
  user,
  onOpenVideo,
  onOpenWallet
}) => {
  const [viewMode, setViewMode] = useState<'rails' | 'grid'>('rails');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [displayCount, setDisplayCount] = useState(12);

  // Filtered list for grid view or filtered rails
  const filteredVideos = videos.filter(v => {
    if (selectedCategory !== 'all' && v.category !== selectedCategory) return false;
    if (pricingFilter === 'free' && !v.isFree) return false;
    if (pricingFilter === 'paid' && v.isFree) return false;
    return true;
  });

  // Categorized collections for horizontal rails
  const continueWatchingVideos = user.watchHistory
    .map(w => videos.find(v => v.id === w.videoId))
    .filter((v): v is Video => !!v);

  const trendingVideos = videos.filter(v => v.isTrending);
  const newReleases = videos.filter(v => v.isNewRelease);
  const freeVideos = videos.filter(v => v.isFree);
  const premiumVideos = videos.filter(v => !v.isFree);

  // Rails per category are built from the actual category strings the products carry.
  const categories = Array.from(new Set(videos.map(v => v.category))).sort();
  const videosByCategory = categories.map(cat => ({
    category: cat,
    list: videos.filter(v => v.category === cat),
  }));

  const categoryPills = [
    { id: 'all', label: 'All Videos' },
    ...categories.map(cat => ({ id: cat, label: cat })),
  ];

  return (
    <div className="py-6 space-y-6">
      
      {/* Category Navigation Bar & View Mode Toggle */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-wrap items-center justify-between gap-4">
        
        {/* Category Pills — a row you swipe sideways on a phone, wrapping from tablet up */}
        <div className="flex w-full gap-1.5 overflow-x-auto overscroll-x-contain pb-1 text-xs sm:w-auto sm:flex-wrap sm:items-center sm:overflow-visible sm:pb-0">
          {categoryPills.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 px-3 py-1.5 rounded-xl font-semibold transition-all border text-left sm:w-auto ${selectedCategory === cat.id ? 'bg-purple-600 border-purple-500 text-white shadow-sm' : 'bg-[#121422] border-white/10 text-slate-400 hover:text-white'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Pricing filter & Grid/Rails view toggle */}
        <div className="flex items-center gap-3 text-xs">
          <select
            value={pricingFilter}
            onChange={e => setPricingFilter(e.target.value as any)}
            className="bg-[#121422] border border-white/10 text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500"
            aria-label="Filter by price"
          >
            <option value="all">Any Pricing</option>
            <option value="free">100% Free</option>
            <option value="paid">Credit Unlocks</option>
          </select>

          <div className="flex items-center bg-[#121422] border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('rails')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'rails' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Streaming Rails View"
              aria-label="Streaming Rails View"
            >
              <Rows className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Catalog Grid View"
              aria-label="Catalog Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* RAILS VIEW MODE: All 16+ Streaming Sections */}
      {viewMode === 'rails' && selectedCategory === 'all' && pricingFilter === 'all' ? (
        <div className="space-y-4">
          
          {/* 1. Continue Watching (if user has watch progress) */}
          {continueWatchingVideos.length > 0 && (
            <VideoRail
              title="Continue Watching"
              subtitle="Pick up right where you left off"
              videos={continueWatchingVideos}
              user={user}
              onOpenVideo={onOpenVideo}
            />
          )}

          {/* 2. Trending Videos */}
          <VideoRail
            title="Trending Videos"
            subtitle="Most streamed titles across all regions this week"
            videos={trendingVideos}
            user={user}
            onOpenVideo={onOpenVideo}
          />

          {/* 3. Free Videos */}
          <VideoRail
            title="Free to Watch"
            subtitle="Full videos streaming with zero credit deduction"
            videos={freeVideos}
            user={user}
            onOpenVideo={onOpenVideo}
          />

          {/* 4. New Releases */}
          <VideoRail
            title="New Releases"
            subtitle="Fresh drops and recent additions"
            videos={newReleases}
            user={user}
            onOpenVideo={onOpenVideo}
          />

          {/* 5. Premium Videos */}
          <VideoRail
            title="Premium Videos"
            subtitle="Credit-unlock videos"
            videos={premiumVideos}
            user={user}
            onOpenVideo={onOpenVideo}
          />

          {/* 6. One rail per real category present in the catalogue */}
          {videosByCategory.map(group => (
            <VideoRail
              key={group.category}
              title={group.category}
              subtitle={`${group.list.length} title${group.list.length === 1 ? '' : 's'} in ${group.category}`}
              videos={group.list}
              user={user}
              onOpenVideo={onOpenVideo}
            />
          ))}

        </div>
      ) : (
        /* GRID VIEW MODE (or when category filter is selected) */
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-3">
            <span>
              Showing {filteredVideos.slice(0, displayCount).length} of {filteredVideos.length} videos
            </span>
          </div>

          {filteredVideos.length === 0 ? (
            <div className="text-center py-20 bg-[#121422]/60 border border-white/10 rounded-3xl p-8 space-y-2">
              <p className="text-slate-400 text-sm">No videos match this filter combination.</p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setPricingFilter('all');
                }}
                className="text-xs text-purple-400 hover:text-purple-300 font-bold"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {filteredVideos.slice(0, displayCount).map(video => (
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

              {displayCount < filteredVideos.length && (
                <div className="text-center pt-6">
                  <button
                    onClick={() => setDisplayCount(prev => prev + 8)}
                    className="bg-[#141626] hover:bg-white/10 border border-white/15 text-white font-semibold px-6 py-3 rounded-xl text-xs transition-colors"
                  >
                    Load More Videos ({filteredVideos.length - displayCount} remaining) ↓
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
};
