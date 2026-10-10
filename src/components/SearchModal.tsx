import React, { useState, useMemo } from 'react';
import { Video, DigitalPack, User } from '../types';
import { VideoCard } from './VideoCard';
import { PackCard } from './PackCard';
import { Search, X, Filter, SlidersHorizontal } from 'lucide-react';

interface SearchModalProps {
  videos: Video[];
  packs: DigitalPack[];
  user: User;
  onClose: () => void;
  onOpenVideo: (videoId: string) => void;
  onOpenPack: (packId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  videos,
  packs,
  user,
  onClose,
  onOpenVideo,
  onOpenPack
}) => {
  const [query, setQuery] = useState('');
  const [contentType, setContentType] = useState<'all' | 'videos' | 'packs'>('all');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'views' | 'price_low' | 'price_high'>('relevance');

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Filter videos
    const matchedVideos = contentType === 'packs' ? [] : videos.filter(v => {
      if (pricingFilter === 'free' && !v.isFree) return false;
      if (pricingFilter === 'paid' && v.isFree) return false;
      if (categoryFilter !== 'all' && v.category !== categoryFilter) return false;

      if (!q) return true;
      const haystack = `${v.title} ${v.description} ${v.category} ${v.creator.name} ${v.tags.join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });

    // Filter packs
    const matchedPacks = contentType === 'videos' ? [] : packs.filter(p => {
      if (pricingFilter === 'free' && p.creditPrice > 0) return false;
      if (pricingFilter === 'paid' && p.creditPrice === 0) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;

      if (!q) return true;
      const haystack = `${p.title} ${p.description} ${p.platform} ${p.category} ${p.includedItems.join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });

    return {
      videos: matchedVideos,
      packs: matchedPacks,
      totalCount: matchedVideos.length + matchedPacks.length
    };
  }, [query, contentType, pricingFilter, categoryFilter, sortBy, videos, packs]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-3 sm:p-6 md:p-8 overflow-hidden">
      
      {/* Top Search Header Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center gap-3 pb-4 border-b border-white/10 shrink-0">
        <div className="flex-1 flex items-center bg-[#141626] border border-white/15 focus-within:border-purple-500 rounded-2xl px-4 py-3 transition-colors">
          <Search className="w-5 h-5 text-purple-400 mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Search videos, creators, categories, MEGA packs, Telegram channels..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="bg-transparent text-sm md:text-base text-white placeholder-slate-400 focus:outline-none w-full"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-3 text-slate-400 hover:text-white rounded-2xl bg-[#141626] border border-white/10 transition-colors shrink-0"
          aria-label="Close search"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Chips Bar */}
      <div className="max-w-5xl w-full mx-auto py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-white/10">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Content Type Filter */}
          {(['all', 'videos', 'packs'] as const).map(type => (
            <button
              key={type}
              onClick={() => setContentType(type)}
              className={`px-3 py-1.5 rounded-xl capitalize font-semibold transition-all border ${contentType === type ? 'bg-purple-600 border-purple-500 text-white shadow-sm' : 'bg-[#141626] border-white/10 text-slate-400 hover:text-white'}`}
            >
              {type === 'all' ? 'All Formats' : type}
            </button>
          ))}

          {/* Pricing Filter */}
          {(['all', 'free', 'paid'] as const).map(price => (
            <button
              key={price}
              onClick={() => setPricingFilter(price)}
              className={`px-3 py-1.5 rounded-xl capitalize font-semibold transition-all border ${pricingFilter === price ? 'bg-purple-950/60 border-purple-500 text-purple-300' : 'bg-[#141626] border-white/10 text-slate-400 hover:text-white'}`}
            >
              {price === 'all' ? 'Any Price' : price === 'free' ? 'Free Only' : 'Premium'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 tabular-nums">
            {searchResults.totalCount} result{searchResults.totalCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Scrollable Results */}
      <div className="max-w-5xl w-full mx-auto flex-1 overflow-y-auto py-6 space-y-8">
        
        {searchResults.totalCount === 0 ? (
          <div className="text-center py-20 bg-[#121422]/60 border border-white/10 rounded-3xl p-8 space-y-2">
            <p className="text-slate-300 text-base font-semibold">No results found for "{query}"</p>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              Try searching by topic like "Pakistani", "Indian", "ABACS", "MEGA", or "Dance".
            </p>
          </div>
        ) : (
          <>
            {/* Matching Videos Section */}
            {searchResults.videos.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Videos ({searchResults.videos.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {searchResults.videos.map(video => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onOpen={id => {
                        onClose();
                        onOpenVideo(id);
                      }}
                      isUnlocked={video.isFree || user.unlockedVideoIds.includes(video.id)}
                      isFavorite={user.favorites.includes(video.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Matching Digital Packs Section */}
            {searchResults.packs.length > 0 && (
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Digital Packs ({searchResults.packs.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.packs.map(pack => (
                    <PackCard
                      key={pack.id}
                      pack={pack}
                      onOpen={id => {
                        onClose();
                        onOpenPack(id);
                      }}
                      isUnlocked={user.unlockedPackIds.includes(pack.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>

    </div>
  );
};
