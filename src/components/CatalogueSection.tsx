import React, { useState } from 'react';

/**
 * One browsable shelf of the catalogue: a header that stays pinned while you scroll through it, a
 * grid of cards that fills the screen from edge to edge, and a Load more button that reveals the
 * next batch. The batch size is the staff's choice in Control Panel -> Platform Settings.
 */
export const GRID_VIDEOS = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5';
export const GRID_PACKS = 'grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6';

interface CatalogueSectionProps<T> {
  title: string;
  items: T[];
  /** Cards shown before the Load more button — the admin-selected section size. */
  pageSize: number;
  renderItem: (item: T) => React.ReactNode;
  /** Stable DOM id the category jump pills scroll to. */
  anchor?: string;
  /** Shown next to the title so a shopper can tell what the section holds. */
  badge?: string;
  gridClassName?: string;
  /** False when the screen already pins a filter bar there — two pinned bars would overlap. */
  pinned?: boolean;
  /** Small ordinal shown before the title, so "which shelf am I on" is readable at a glance. */
  ordinal?: number;
}

export function CatalogueSection<T extends { id: string }>(props: CatalogueSectionProps<T>) {
  const { title, items, pageSize, renderItem, anchor, badge, gridClassName = GRID_VIDEOS, pinned = true, ordinal } = props;
  const [visible, setVisible] = useState(pageSize);

  if (items.length === 0) return null;

  const shown = items.slice(0, Math.max(visible, pageSize));
  const remaining = items.length - shown.length;

  return (
    <section className="scroll-mt-28">
      {/* Pinned header: whichever shelf you are looking at is always named on screen. */}
      <div
        id={anchor}
        className={`flex items-center gap-2.5 py-2.5 border-b border-white/[0.06] -mx-4 px-4 md:-mx-0 md:px-0 scroll-mt-28 ${
          pinned
            ? 'sticky top-[73px] z-20 bg-[#090a12]/95 backdrop-blur-xl'
            : 'bg-transparent'
        }`}
      >
        {ordinal !== undefined && (
          <span className="shrink-0 text-[10px] font-black tabular-nums tracking-widest text-purple-500/80">
            {String(ordinal).padStart(2, '0')}
          </span>
        )}
        <h2 className="text-base md:text-lg font-bold tracking-tight text-white truncate">{title}</h2>
        {badge && (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/15 border border-purple-500/25 rounded-full px-2 py-0.5">
            {badge}
          </span>
        )}
        <span className="ml-auto shrink-0 text-[11px] text-slate-500 tabular-nums">
          {shown.length} of {items.length}
        </span>
      </div>

      <div className={`${gridClassName} pt-3`}>
        {shown.map(item => (
          <div key={item.id} className="w-full">
            {renderItem(item)}
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <div className="pt-4">
          <button
            onClick={() => setVisible(prev => prev + pageSize)}
            className="w-full sm:w-auto bg-[#141626] hover:bg-white/10 border border-white/15 text-white font-semibold px-6 py-3 rounded-xl text-xs transition-colors"
          >
            Load {Math.min(remaining, pageSize)} more ({remaining} left)
          </button>
        </div>
      )}
    </section>
  );
}
