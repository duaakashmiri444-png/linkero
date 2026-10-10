import React, { useState } from 'react';
import { DigitalPack, User } from '../types';
import { PackCard } from './PackCard';
import { Cloud, HardDrive, Send, MessageCircle, Package, Sparkles } from 'lucide-react';

interface MarketplaceProps {
  packs: DigitalPack[];
  user: User;
  onOpenPack: (packId: string) => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ packs, user, onOpenPack }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price_low' | 'price_high' | 'sales'>('featured');

  const filteredPacks = packs.filter(p => {
    if (selectedPlatform !== 'all' && p.platform !== selectedPlatform) return false;
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    return true;
  });

  const sortedPacks = [...filteredPacks].sort((a, b) => {
    if (sortBy === 'price_low') return a.creditPrice - b.creditPrice;
    if (sortBy === 'price_high') return b.creditPrice - a.creditPrice;
    if (sortBy === 'sales') return b.salesCount - a.salesCount;
    return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
  });

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
          High-capacity collection folders hosted on MEGA, Google Drive, Telegram, and WhatsApp. Preview via master demos and unlock authenticated download links.
        </p>
      </div>

      {/* Platform Tabs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { id: 'all', name: 'All Platforms', icon: Package, desc: 'Complete catalog' },
          { id: 'MEGA', name: 'MEGA', icon: Cloud, desc: 'Large file archives' },
          { id: 'Google Drive', name: 'Google Drive', icon: HardDrive, desc: 'Shared folder mirrors' },
          { id: 'Telegram', name: 'Telegram', icon: Send, desc: 'VIP channel links' },
          { id: 'WhatsApp', name: 'WhatsApp', icon: MessageCircle, desc: 'Verified community drops' }
        ].map(plat => {
          const Icon = plat.icon;
          const isActive = selectedPlatform === plat.id;
          return (
            <button
              key={plat.id}
              onClick={() => setSelectedPlatform(plat.id)}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${isActive ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-950/50 text-white' : 'bg-[#121422] border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
              </div>
              <div>
                <div className="font-bold text-xs text-white">{plat.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{plat.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Topic Filter Pills & Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex flex-wrap gap-1.5">
          {[
            'all',
            'Pakistani',
            'Indian',
            'TikTok Creators',
            'Models & Creators',
            'Trending ABACS',
            'Other'
          ].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${selectedCategory === cat ? 'bg-purple-600 border-purple-500 text-white shadow-sm' : 'bg-[#121422] border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
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
          <p className="text-slate-400 text-sm">No digital packs found for this platform and category.</p>
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
