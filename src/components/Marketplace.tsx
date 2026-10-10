import React, { useState } from 'react';
import { DigitalPack, User } from '../types';
import { PackCard } from './PackCard';
import { CatalogueSection, GRID_PACKS } from './CatalogueSection';
import { store } from '../services/store';

interface MarketplaceProps {
  packs: DigitalPack[];
  user: User;
  onOpenPack: (packId: string) => void;
}

/** How the seller's own delivery destination reads as a shelf heading. */
const SHELF_TITLES: Record<string, string> = {
  'Inbuilt Player': 'Plays Inside The Site',
  Telegram: 'Delivered on Telegram',
  WhatsApp: 'Delivered on WhatsApp',
  MEGA: 'MEGA Collections',
  'Google Drive': 'Google Drive Folders',
  Dropbox: 'Dropbox Links',
  SourceForge: 'SourceForge Downloads',
  UPLOAD: 'Plays Inside The Site',
  URL: 'Direct Links'
};

/** Files first, then the destinations buyers actually use, then anything else an upload introduced. */
const SHELF_ORDER = ['Inbuilt Player', 'Telegram', 'MEGA', 'Google Drive', 'Dropbox', 'WhatsApp', 'SourceForge', 'Direct Link'];

export const Marketplace: React.FC<MarketplaceProps> = ({ packs, user, onOpenPack }) => {
  const [sortBy, setSortBy] = useState<'featured' | 'price_low' | 'price_high' | 'sales'>('featured');
  const pageSize = store.getSectionSize();

  const sorted = (list: DigitalPack[]) => {
    if (sortBy === 'price_low') return [...list].sort((a, b) => a.creditPrice - b.creditPrice);
    if (sortBy === 'price_high') return [...list].sort((a, b) => b.creditPrice - a.creditPrice);
    if (sortBy === 'sales') return [...list].sort((a, b) => b.salesCount - a.salesCount);
    return [...list].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.salesCount - a.salesCount);
  };

  // Each pack gets exactly one shelf — its primary destination — so scrolling never shows it twice.
  const shelves = React.useMemo(() => {
    const buckets = new Map<string, DigitalPack[]>();
    packs.forEach(pack => {
      const key = pack.platform || 'Direct Link';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(pack);
    });
    const known = SHELF_ORDER.filter(name => buckets.has(name));
    const rest = [...buckets.keys()].filter(name => !SHELF_ORDER.includes(name)).sort();
    return [...known, ...rest].map(platform => ({
      platform,
      title: SHELF_TITLES[platform] ?? platform,
      list: sorted(buckets.get(platform)!)
    }));
  }, [packs, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">

      {/* Marketplace Header */}
      <div className="rounded-3xl p-5 sm:p-8 bg-gradient-to-r from-[#171529] via-[#121322] to-purple-950/40 border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight">
            Digital Pack Marketplace
          </h1>
          <p className="text-xs text-slate-400 sm:text-sm mt-1">
            {packs.length} pack(s), grouped by where they are delivered.
          </p>
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="bg-[#121422] border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
          aria-label="Sort marketplace"
        >
          <option value="featured">Featured First</option>
          <option value="sales">Most Popular</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
        </select>
      </div>

      {shelves.length === 0 ? (
        <div className="text-center py-16 bg-[#121422]/60 border border-white/10 rounded-2xl p-8">
          <p className="text-slate-400 text-sm">No packs are on sale yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {shelves.map((shelf, i) => (
            <CatalogueSection
              key={shelf.platform}
              title={shelf.title}
              badge={`${shelf.list.length} pack${shelf.list.length === 1 ? '' : 's'}`}
              items={shelf.list}
              pageSize={pageSize}
              ordinal={i + 1}
              gridClassName={GRID_PACKS}
              renderItem={pack => (
                <PackCard
                  pack={pack}
                  onOpen={onOpenPack}
                  isUnlocked={user.unlockedPackIds.includes(pack.id)}
                />
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};
