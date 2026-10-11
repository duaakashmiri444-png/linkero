import React, { useMemo, useState } from 'react';
import { DigitalPack, User } from '../types';
import { PackCard } from './PackCard';
import { CatalogueSection, GRID_PACKS } from './CatalogueSection';
import { store } from '../services/store';
import { Cloud, HardDrive, Package, PlayCircle, MessageCircle, Send } from 'lucide-react';

interface MarketplaceProps {
  packs: DigitalPack[];
  user: User;
  onOpenPack: (packId: string) => void;
}

/** Files first, then the destinations buyers actually use, then anything else an upload introduced. */
const PLATFORM_ORDER = ['Inbuilt Player', 'Telegram', 'MEGA', 'Google Drive', 'Dropbox', 'WhatsApp', 'SourceForge', 'Direct Link'];

/** The destination reads better as a filter chip than as a shelf heading. */
const CHIP_LABELS: Record<string, string> = {
  'Inbuilt Player': 'Plays in-site',
  UPLOAD: 'Plays in-site'
};

const chipIcon = (platform: string) => {
  const Icon =
    platform === 'MEGA' ? Cloud
      : platform === 'Google Drive' ? HardDrive
        : platform === 'Telegram' ? Send
          : platform === 'WhatsApp' ? MessageCircle
            : platform === 'Inbuilt Player' ? PlayCircle
              : Package;
  return <Icon className="w-3.5 h-3.5" />;
};

export const Marketplace: React.FC<MarketplaceProps> = ({ packs, user, onOpenPack }) => {
  const [sortBy, setSortBy] = useState<'featured' | 'price_low' | 'price_high' | 'sales'>('featured');
  const [platform, setPlatform] = useState('all');
  const pageSize = store.getSectionSize();

  const sorted = (list: DigitalPack[]) => {
    if (sortBy === 'price_low') return [...list].sort((a, b) => a.creditPrice - b.creditPrice);
    if (sortBy === 'price_high') return [...list].sort((a, b) => b.creditPrice - a.creditPrice);
    if (sortBy === 'sales') return [...list].sort((a, b) => b.salesCount - a.salesCount);
    return [...list].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.salesCount - a.salesCount);
  };

  // One chip per destination that is actually on sale, counting every pack that delivers through it
  // — a MEGA folder mirrored on Drive belongs under both.
  const chips = useMemo(() => {
    const counts = new Map<string, number>();
    packs.forEach(pack => {
      pack.platforms.forEach(label => counts.set(label, (counts.get(label) || 0) + 1));
    });
    const known = PLATFORM_ORDER.filter(name => counts.has(name));
    const rest = [...counts.keys()].filter(name => !PLATFORM_ORDER.includes(name)).sort();
    return [...known, ...rest].map(name => ({ name, label: CHIP_LABELS[name] ?? name, count: counts.get(name) || 0 }));
  }, [packs]);

  // A pack removed from the catalogue can take the chosen filter with it; fall back rather than
  // showing an empty grid the shopper cannot explain.
  const active = chips.some(chip => chip.name === platform) ? platform : 'all';
  const shown = active === 'all' ? packs : packs.filter(pack => pack.platforms.includes(active));

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">

      {/* Marketplace Header */}
      <div className="rounded-3xl p-5 sm:p-8 bg-gradient-to-r from-[#171529] via-[#121322] to-purple-950/40 border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight">
            Digital Pack Marketplace
          </h1>
          <p className="text-xs text-slate-400 sm:text-sm mt-1">
            {packs.length} pack(s). Choose where you want them delivered.
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

      {packs.length === 0 ? (
        <div className="text-center py-16 bg-[#121422]/60 border border-white/10 rounded-2xl p-8">
          <p className="text-slate-400 text-sm">No packs are on sale yet.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Delivery filter — pinned, so narrowing down is one tap away wherever you have scrolled */}
          <div className="sticky top-[73px] z-30 -mx-4 px-4 md:mx-0 md:px-0 bg-[#090a12]/95 backdrop-blur-xl border-y border-white/[0.06] py-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500">Delivered via</span>
              {[{ name: 'all', label: 'All platforms', count: packs.length }, ...chips].map(chip => {
                const on = active === chip.name;
                return (
                  <button
                    key={chip.name}
                    onClick={() => setPlatform(chip.name)}
                    aria-pressed={on}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-colors ${
                      on
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-[#121422] border-white/10 text-slate-300 hover:text-white hover:border-white/25'
                    }`}
                  >
                    {chip.name !== 'all' && chipIcon(chip.name)}
                    <span>{chip.label}</span>
                    <span className={`text-[10px] tabular-nums ${on ? 'text-white/80' : 'text-slate-500'}`}>{chip.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <CatalogueSection
            title={active === 'all' ? 'All Packs' : (CHIP_LABELS[active] ?? active)}
            badge={`${shown.length} pack${shown.length === 1 ? '' : 's'}`}
            items={sorted(shown)}
            pageSize={pageSize}
            gridClassName={GRID_PACKS}
            pinned={false}
            renderItem={pack => (
              <PackCard
                pack={pack}
                onOpen={onOpenPack}
                isUnlocked={user.unlockedPackIds.includes(pack.id)}
              />
            )}
          />
        </div>
      )}
    </div>
  );
};
