import React, { useState } from 'react';
import { DigitalPack, User } from '../types';
import { PackCard } from './PackCard';
import { Cloud, HardDrive, Send, MessageCircle, Package, Sparkles, PlayCircle } from 'lucide-react';

/** Not a delivery platform — a shelf for packs whose contents include videos that play here. */
const VIDEO_PACKS_TAB = 'video-packs';

interface MarketplaceProps {
  packs: DigitalPack[];
  user: User;
  onOpenPack: (packId: string) => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ packs, user, onOpenPack }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price_low' | 'price_high' | 'sales'>('featured');

  const videoPacks = packs.filter(p => p.videoCount > 0);

  const filteredPacks = packs.filter(p => {
    if (selectedPlatform === VIDEO_PACKS_TAB) {
      if (p.videoCount === 0) return false;
    } else if (selectedPlatform !== 'all' && !p.platforms.includes(selectedPlatform)) {
      return false;
    }
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    return true;
  });

  const sortedPacks = [...filteredPacks].sort((a, b) => {
    if (sortBy === 'price_low') return a.creditPrice - b.creditPrice;
    if (sortBy === 'price_high') return b.creditPrice - a.creditPrice;
    if (sortBy === 'sales') return b.salesCount - a.salesCount;
    return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
  });

  const PLATFORM_META: Record<string, { icon: typeof Cloud }> = {
    MEGA: { icon: Cloud },
    'Google Drive': { icon: HardDrive },
    Telegram: { icon: Send },
    WhatsApp: { icon: MessageCircle },
    'Inbuilt Player': { icon: Package },
    'Direct Link': { icon: Cloud },
    Dropbox: { icon: HardDrive },
  };

  const countFor = (id: string) => packs.filter(p => p.platforms.includes(id)).length;

  // The delivery platforms this site supports are always on the shelf, so narrowing to Telegram or
  // MEGA never "disappears" between uploads. Their counts stay real, and an empty one says so.
  const platformIds = [...new Set([...Object.keys(PLATFORM_META), ...packs.flatMap(p => p.platforms)])];

  const platformTabs = [
    { id: 'all', name: 'All Platforms', icon: Package, desc: `${packs.length} pack(s)` },
    { id: VIDEO_PACKS_TAB, name: 'Video Packs', icon: PlayCircle, desc: `${videoPacks.length} playable` },
    ...platformIds.map(id => ({
      id,
      name: id,
      icon: PLATFORM_META[id]?.icon ?? Cloud,
      desc: countFor(id) === 0 ? 'No packs yet' : `${countFor(id)} pack(s)`,
    })),
  ];

  const categoryTabs = ['all', ...Array.from(new Set(packs.map(p => p.category)))];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      
      {/* Marketplace Header */}
      <div className="rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-[#171529] via-[#121322] to-purple-950/40 border border-white/10 space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          DIGITAL ARCHIVES & PACKS
        </div>
        <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
          Digital Pack Marketplace
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
          Archives, documents and bundles — some served straight from this server, some handed over as MEGA, Google Drive, Telegram or WhatsApp links.
          {' '}<span className="text-white font-semibold">Video Packs</span> hold clips the seller attached here: unlock one and every clip plays inside this site, like your own gallery, and can still be saved.
          Unlocking a pack reveals exactly what the seller attached, and nothing before payment.
        </p>
      </div>

      {/* Platform Tabs — one row you swipe sideways on a phone, grid from tablet up */}
      <div className="-mx-1 flex gap-2.5 overflow-x-auto overscroll-x-contain px-1 pb-2 snap-x snap-mandatory sm:mx-0 sm:snap-none sm:grid sm:grid-cols-3 sm:px-0 sm:pb-0 sm:overflow-visible lg:grid-cols-4">
        {platformTabs.map(plat => {
          const Icon = plat.icon;
          const isActive = selectedPlatform === plat.id;
          return (
            <button
              key={plat.id}
              onClick={() => setSelectedPlatform(plat.id)}
              className={`w-[45vw] max-w-[180px] shrink-0 snap-start p-3 rounded-2xl border text-left transition-all flex flex-col justify-between sm:w-auto sm:max-w-none sm:shrink sm:snap-none ${isActive ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-950/50 text-white' : 'bg-[#121422] border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
              </div>
              <div>
                <div className="font-bold text-xs text-white truncate">{plat.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{plat.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Topic Filter Pills & Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex w-full gap-1.5 overflow-x-auto overscroll-x-contain pb-1 sm:w-auto sm:flex-wrap sm:items-center sm:overflow-visible sm:pb-0">
          {categoryTabs.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border text-left sm:w-auto ${selectedCategory === cat ? 'bg-purple-600 border-purple-500 text-white shadow-sm' : 'bg-[#121422] border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
            >
              {cat === 'all' ? 'All Topics' : cat}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="bg-[#121422] border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 shrink-0"
          aria-label="Sort marketplace"
        >
          <option value="featured">Featured First</option>
          <option value="sales">Most Popular</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
        </select>
      </div>

      {/* Grid of Pack Cards */}
      {sortedPacks.length === 0 ? (
        <div className="text-center py-16 bg-[#121422]/60 border border-white/10 rounded-2xl p-8 space-y-2">
          <p className="text-slate-400 text-sm">
            {selectedPlatform === VIDEO_PACKS_TAB
              ? 'No pack here has videos in it yet. Publish one from the admin panel with clips under "Videos buyers watch in-site".'
              : selectedPlatform === 'all'
                ? 'No digital packs in the catalog yet.'
                : `Nothing is delivered through ${selectedPlatform} right now. Add a ${selectedPlatform} link to a pack from the admin panel and it appears here.`}
          </p>
          <button
            onClick={() => {
              setSelectedPlatform('all');
              setSelectedCategory('all');
            }}
            className="text-xs text-purple-400 hover:text-purple-300 font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPacks.map(pack => (
            <PackCard
              key={pack.id}
              pack={pack}
              onOpen={onOpenPack}
              isUnlocked={user.unlockedPackIds.includes(pack.id)}
            />
          ))}
        </div>
      )}

    </div>
  );
};
