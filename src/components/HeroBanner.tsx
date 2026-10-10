import React from 'react';
import { Video, User } from '../types';
import { Play, Bookmark, ShieldCheck, Coins, Sparkles, CheckCircle } from 'lucide-react';

interface HeroBannerProps {
  featuredVideo: Video;
  user: User;
  onOpenVideo: (videoId: string) => void;
  onOpenWallet: () => void;
  onExploreCatalog: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  featuredVideo,
  user,
  onOpenVideo,
  onOpenWallet,
  onExploreCatalog
}) => {
  const isUnlocked = featuredVideo.isFree || user.unlockedVideoIds.includes(featuredVideo.id);

  return (
    <div className="relative w-full overflow-hidden bg-[#090a12] border-b border-white/[0.08]">
      {/* Background Graphic & Scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src={featuredVideo.backdrop}
          alt={featuredVideo.title}
          className="w-full h-full object-cover opacity-35 filter blur-[1px] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090a12] via-[#090a12]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a12] via-transparent to-black/40" />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Copy & Actions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="flex items-center gap-1 text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
              <Sparkles className="w-3 h-3 text-purple-400" />
              Featured
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-300">{featuredVideo.category}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-300">{featuredVideo.duration}</span>
            <span className="text-slate-400">·</span>
            <span className="text-amber-400">★ {featuredVideo.rating.toFixed(1)}</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.08] text-balance">
            {featuredVideo.title}
          </h1>

          <p className="text-slate-300 text-sm md:text-base max-w-xl leading-relaxed">
            {featuredVideo.description}
          </p>

          <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
            <span>{featuredVideo.views.toLocaleString()} viewers</span>
          </div>

          {/* Action Button Row */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={() => onOpenVideo(featuredVideo.id)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2.5 shadow-lg shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.99] transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              {isUnlocked ? 'Watch Full Video' : featuredVideo.previewUrl ? 'Watch Free Preview' : 'Open'}
            </button>

            {!isUnlocked && !featuredVideo.isFree && (
              <button
                onClick={() => onOpenVideo(featuredVideo.id)}
                className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-5 py-3 rounded-xl text-sm flex items-center gap-2 transition-all hover:border-purple-400/50"
              >
                <Coins className="w-4 h-4 text-purple-300" />
                Unlock for {featuredVideo.creditPrice} Credits
              </button>
            )}

            <button
              onClick={onExploreCatalog}
              className="bg-transparent hover:bg-white/5 border border-white/10 text-slate-300 hover:text-white font-semibold px-4 py-3 rounded-xl text-sm transition-all"
            >
              Browse Catalog ↓
            </button>
          </div>

          {/* Wallet credit badge summary */}
          <div className="flex items-center gap-3 text-xs text-slate-400 pt-2">
            <span>Your Balance: <strong className="text-purple-300 font-bold">{user.walletBalance} Credits</strong></span>
            <button
              onClick={onOpenWallet}
              className="text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-2"
            >
              + Top Up Credits
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Featured Card Preview */}
        <div className="lg:col-span-5 hidden lg:block">
          <div
            onClick={() => onOpenVideo(featuredVideo.id)}
            className="group relative rounded-2xl overflow-hidden border border-white/15 bg-[#121422] shadow-2xl shadow-purple-950/60 cursor-pointer transform hover:scale-[1.01] transition-transform"
          >
            <div className="aspect-video w-full relative">
              <img
                src={featuredVideo.thumbnail}
                alt={featuredVideo.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                  <Play className="w-7 h-7 fill-white ml-1" />
                </div>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                <span className="font-semibold truncate pr-2">{featuredVideo.title}</span>
                <span className="shrink-0 bg-black/70 px-2 py-0.5 rounded font-mono text-[11px]">
                  {featuredVideo.duration}
                </span>
              </div>
            </div>
            <div className="p-3 bg-[#141626] flex items-center justify-between text-xs">
              <span className="text-slate-400">Click to launch player & controls</span>
              <span className="text-purple-400 font-bold">Open Player ↗</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
