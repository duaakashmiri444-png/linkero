import React from 'react';
import { DigitalPack } from '../types';
import { humanBytes } from '../services/mappers';
import { Cloud, HardDrive, Send, MessageCircle, CheckCircle, Package, PlayCircle } from 'lucide-react';

interface PackCardProps {
  pack: DigitalPack;
  onOpen: (packId: string) => void;
  isUnlocked?: boolean;
}

export const PackCard: React.FC<PackCardProps> = ({ pack, onOpen, isUnlocked }) => {
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'MEGA':
        return <Cloud className="w-3.5 h-3.5 text-red-400" />;
      case 'Google Drive':
        return <HardDrive className="w-3.5 h-3.5 text-blue-400" />;
      case 'Telegram':
        return <Send className="w-3.5 h-3.5 text-sky-400" />;
      case 'WhatsApp':
        return <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Package className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div
      onClick={() => onOpen(pack.id)}
      className="group relative bg-[#121422] rounded-2xl overflow-hidden border border-white/[0.08] hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-950/40 cursor-pointer flex flex-col justify-between select-none"
    >
      <div>
        {/* Cover Image */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0a0b12]">
          <img
            src={pack.coverImage}
            alt={pack.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#121422] via-transparent to-black/30 pointer-events-none" />

          {/* Platform Badge */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-xs font-semibold text-white">
            {getPlatformIcon(pack.platform)}
            <span className="text-[11px]">{pack.platform}</span>
          </div>

          {/* Price / Status Badge */}
          <div className="absolute top-2.5 right-2.5">
            {isUnlocked ? (
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                UNLOCKED
              </span>
            ) : (
              <span className="text-[11px] font-bold bg-black/80 backdrop-blur-md text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md tabular-nums">
                {pack.creditPrice} Credits
              </span>
            )}
          </div>

          {/* Size / File-count Badge (real values only) */}
          <div className="absolute bottom-2.5 right-2.5 z-10 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md tabular-nums">
            {pack.videoCount > 0
              ? `${pack.videoCount} video${pack.videoCount === 1 ? '' : 's'}${pack.fileCount > 0 ? ` + ${pack.fileCount} file${pack.fileCount === 1 ? '' : 's'}` : ''}`
              : pack.totalBytes > 0
                ? humanBytes(pack.totalBytes)
                : `${pack.fileCount} files`}
          </div>

          {pack.videoCount > 0 && (
            <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 bg-purple-600/90 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
              <PlayCircle className="w-3 h-3" />
              Plays in-site
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="text-purple-300 font-semibold">{pack.category}</span>
            <span>·</span>
            <span>
              {pack.videoCount > 0
                ? `${pack.videoCount} video${pack.videoCount === 1 ? '' : 's'}`
                : `${pack.fileCount} file${pack.fileCount === 1 ? '' : 's'}`}
            </span>
            <span>·</span>
            <span>★ {pack.rating.toFixed(1)}</span>
          </div>

          <h3 className="font-semibold text-sm text-white group-hover:text-purple-300 transition-colors line-clamp-1">
            {pack.title}
          </h3>

          <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
            {pack.description}
          </p>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="p-4 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
        <span className="text-slate-400 text-[11px]">
          {pack.salesCount} purchases
        </span>
        <span className="text-purple-400 font-bold group-hover:text-purple-300 group-hover:underline">
          {isUnlocked ? 'View Files →' : `Unlock (${pack.creditPrice} CR) →`}
        </span>
      </div>
    </div>
  );
};
