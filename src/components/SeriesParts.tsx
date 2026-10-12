import React, { useState } from 'react';
import { CheckCircle, Coins, Lock, Play } from 'lucide-react';
import { store } from '../services/store';
import { toVideo } from '../services/mappers';
import type { SeriesDetail } from '../services/api';
import type { Video } from '../types';

/**
 * Everything a shopper needs to browse a numbered series. The server already hands each card its
 * series stamp, but only this screen knows the whole run, so the parts come from
 * /api/collections/:slug — the same call the paywall rules are read from.
 */

/** An unnumbered part still needs a label, so it takes the position the server sorted it to. */
const numberAt = (part: Video, index: number): number => part.series?.part_number ?? index + 1;

/** Kept identical to the server's rule: only an active purchase counts as owned, free or not. */
const isOwned = (part: Video): boolean => part.access?.has_access === true;

interface PartsProps {
  detail: SeriesDetail;
  currentId: string;
  walletBalance: number;
  onSelectVideo: (videoId: string) => void;
  onOpenWallet: () => void;
  onToast: (message: string) => void;
  /** Called after a successful unlock so the player re-reads its stream and the part list. */
  onUnlocked: () => void;
}

/** Compact numbered row that sits under the title while the player chrome is visible. */
export const SeriesPills: React.FC<Pick<PartsProps, 'detail' | 'currentId' | 'onSelectVideo'>> = ({
  detail,
  currentId,
  onSelectVideo
}) => {
  const parts = detail.parts.map(toVideo);
  if (parts.length < 2) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">Parts</span>
      <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto pb-1">
        {parts.map((part, index) => {
          const current = part.id === currentId;
          const owned = isOwned(part);
          return (
            <button
              key={part.id}
              onClick={() => !current && onSelectVideo(part.id)}
              title={part.title}
              aria-label={current ? `Part ${numberAt(part, index)} playing` : `Open part ${numberAt(part, index)}`}
              className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-bold tabular-nums ring-1 transition ${
                current
                  ? 'bg-purple-600 text-white ring-purple-400'
                  : owned
                    ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-black/45 text-slate-300 ring-white/15 hover:bg-black/70'
              }`}
            >
              {numberAt(part, index)}
              {current ? (
                <Play className="h-3 w-3 fill-current" />
              ) : owned ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/** Full list with each part's own price, plus the owner's whole-series price when he set one. */
export const SeriesStrip: React.FC<PartsProps> = ({
  detail,
  currentId,
  walletBalance,
  onSelectVideo,
  onOpenWallet,
  onToast,
  onUnlocked
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parts = detail.parts.map(toVideo);
  if (parts.length < 2) return null;

  const collection = detail.collection;
  const bundle = Number(collection.bundle_price ?? 0);
  const singleTotal = Number(collection.single_price_total ?? 0);
  const ownedCount = parts.filter(isOwned).length;
  const missing = parts.length - ownedCount;

  const unlockAll = async () => {
    setBusy(true);
    setError(null);
    const result = await store.unlockSeries(collection.slug);
    setBusy(false);
    onToast(result.message);
    if (result.success) onUnlocked();
    else setError(result.message);
  };

  const affordable = walletBalance >= bundle;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-bold uppercase tracking-wider text-slate-400">{collection.title}</span>
        <span className="shrink-0 text-[12px] tabular-nums text-slate-400">
          {ownedCount}/{parts.length} unlocked
        </span>
      </div>

      <div className="space-y-2">
        {parts.map((part, index) => {
          const current = part.id === currentId;
          const owned = isOwned(part);
          return (
            <button
              key={part.id}
              onClick={() => onSelectVideo(part.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${
                current
                  ? 'border-purple-500/60 bg-purple-600/10'
                  : 'border-white/5 bg-[#12141f] hover:border-purple-500/40 hover:bg-white/5'
              }`}
            >
              <span className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-black">
                {part.thumbnail ? <img src={part.thumbnail} alt="" className="h-full w-full object-cover" /> : null}
                <span className="absolute left-1 top-1 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-purple-200">
                  {numberAt(part, index)}
                </span>
                {part.duration && (
                  <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 font-mono text-[11px] text-white">
                    {part.duration}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{part.title}</span>
                <span className="mt-0.5 flex items-center gap-2 text-[12px]">
                  {current ? (
                    <span className="flex items-center gap-1 font-bold text-purple-300">
                      <Play className="h-3 w-3 fill-current" /> Playing
                    </span>
                  ) : owned ? (
                    <span className="flex items-center gap-1 font-bold text-emerald-300">
                      <CheckCircle className="h-3 w-3" /> Unlocked
                    </span>
                  ) : (
                    <span className="font-bold tabular-nums text-purple-300">{part.isFree ? 'FREE' : `${part.creditPrice} CR`}</span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {bundle > 0 && missing > 0 && (
        <div className="mt-3 space-y-2 rounded-xl border border-purple-500/30 bg-purple-950/30 p-3">
          <div className="flex items-baseline justify-between gap-2 text-[12px]">
            <span className="text-slate-300">Whole series</span>
            <span className="font-bold tabular-nums text-purple-200">
              {bundle} CR{singleTotal > bundle ? ` instead of ${singleTotal} CR` : ''}
            </span>
          </div>
          {affordable ? (
            <button
              onClick={() => void unlockAll()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 text-sm font-bold text-white transition-all hover:from-purple-500 hover:to-pink-500 disabled:opacity-50"
            >
              <Coins className="h-4 w-4" />
              {busy ? 'Unlocking…' : `Unlock all ${parts.length} parts for ${bundle} CR`}
            </button>
          ) : (
            <button
              onClick={onOpenWallet}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-black transition hover:bg-amber-400"
            >
              <Coins className="h-4 w-4" />
              Top up to unlock the series
            </button>
          )}
          <p className="text-[12px] text-slate-400">
            {missing} part{missing === 1 ? '' : 's'} still locked · {walletBalance} CR available.
          </p>
          {error && <p className="text-[13px] text-rose-400">{error}</p>}
        </div>
      )}

      {bundle > 0 && missing === 0 && (
        <p className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-emerald-300">
          <CheckCircle className="h-4 w-4" /> Every part of this series is unlocked.
        </p>
      )}
    </div>
  );
};
