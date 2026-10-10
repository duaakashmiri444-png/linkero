import React, { useState, useEffect } from 'react';
import { DigitalPack, User, Video } from '../types';
import { store } from '../services/store';
import { 
  X, 
  Coins, 
  CheckCircle, 
  Cloud, 
  HardDrive, 
  Send, 
  MessageCircle, 
  Package, 
  ExternalLink, 
  Copy, 
  Play, 
  Flag, 
  ShieldCheck, 
  Download,
  AlertCircle
} from 'lucide-react';

interface PackDetailsModalProps {
  packId: string;
  onClose: () => void;
  onOpenWallet: () => void;
  onSelectVideo: (videoId: string) => void;
  onOpenReport: (targetId: string, title: string, type: 'pack') => void;
  onToast: (msg: string) => void;
}

export const PackDetailsModal: React.FC<PackDetailsModalProps> = ({
  packId,
  onClose,
  onOpenWallet,
  onSelectVideo,
  onOpenReport,
  onToast
}) => {
  const [pack, setPack] = useState<DigitalPack | undefined>(store.getPacks().find(p => p.id === packId));
  const [user, setUser] = useState<User>(store.getUser());
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    return store.subscribe(() => {
      setUser(store.getUser());
      setPack(store.getPacks().find(p => p.id === packId));
    });
  }, [packId]);

  if (!pack) return null;

  const isUnlocked = user.unlockedPackIds.includes(pack.id);
  const masterDemoVideo = pack.masterDemoVideoId
    ? store.getVideos().find(v => v.id === pack.masterDemoVideoId)
    : undefined;

  const handleUnlock = () => {
    setIsUnlocking(true);
    setErrorMsg(null);

    const result = store.unlockPack(pack.id);
    setIsUnlocking(false);

    if (result.success) {
      onToast(result.message);
    } else {
      setErrorMsg(result.message);
      onToast(result.message);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(pack.accessUrl);
    onToast('Secure pack access link copied to clipboard!');
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'MEGA':
        return <Cloud className="w-4 h-4 text-red-400" />;
      case 'Google Drive':
        return <HardDrive className="w-4 h-4 text-blue-400" />;
      case 'Telegram':
        return <Send className="w-4 h-4 text-sky-400" />;
      case 'WhatsApp':
        return <MessageCircle className="w-4 h-4 text-emerald-400" />;
      default:
        return <Package className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#10121f] border border-white/15 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-[#0c0e18]">
          <div className="flex items-center gap-2 truncate pr-4">
            <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-lg">
              {getPlatformIcon(pack.platform)}
              <span>{pack.platform} Pack</span>
            </span>
            <span className="text-white text-sm font-semibold truncate">{pack.title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Hero Banner Grid inside modal */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Left Cover / Preview */}
            <div className="md:col-span-5 space-y-3">
              <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden border border-white/10 relative bg-[#0a0b12]">
                <img
                  src={pack.coverImage}
                  alt={pack.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-black/80 px-2.5 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 border border-white/10">
                  {getPlatformIcon(pack.platform)}
                  <span>{pack.platform}</span>
                </div>
                <div className="absolute bottom-3 right-3 bg-black/80 px-2.5 py-1 rounded-lg text-xs font-bold text-purple-300 border border-purple-500/30">
                  {pack.fileSize}
                </div>
              </div>

              {/* Master Demo Video Callout button */}
              {masterDemoVideo && (
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                    <span className="flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 fill-purple-400" />
                      Watch Master Demo Video
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{masterDemoVideo.duration}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    See exactly what files, folders, and quality are included before you buy.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onSelectVideo(masterDemoVideo.id);
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Play Master Demo ({masterDemoVideo.duration})
                  </button>
                </div>
              )}
            </div>

            {/* Right Meta & Unlocking Details */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <span className="text-purple-300 font-semibold">{pack.category}</span>
                  <span>·</span>
                  <span>{pack.fileSize} Total Size</span>
                  <span>·</span>
                  <span>★ {pack.rating.toFixed(1)}</span>
                  <span>·</span>
                  <span>{pack.salesCount} sold</span>
                </div>
                <h2 className="font-display font-bold text-2xl text-white">
                  {pack.title}
                </h2>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed">
                {pack.description}
              </p>

              {/* What is included breakdown list */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <div className="font-bold text-xs text-white uppercase tracking-wider flex items-center justify-between">
                  <span>Included Contents ({pack.itemCount} items)</span>
                  <span className="text-purple-300 lowercase text-[11px]">{pack.fileSize}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {pack.includedItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-purple-400 font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Unlocked Delivery Box OR Unlock Action */}
              {isUnlocked ? (
                <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/50 space-y-3">
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                    <span>Pack Unlocked & Ready in Library!</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Server verified access. Your permanent authorized {pack.platform} destination token has been issued:
                  </p>

                  <div className="bg-[#0b0c16] border border-white/10 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs font-mono text-purple-200 truncate">
                    <span className="truncate">{pack.accessUrl}</span>
                    <button
                      onClick={handleCopyLink}
                      className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg shrink-0 transition-colors"
                      title="Copy access token"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href={pack.accessUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-900/30 text-center"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open {pack.platform} Destination ↗
                    </a>
                    <button
                      onClick={handleCopyLink}
                      className="bg-white/10 hover:bg-white/15 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Link
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#14172a] border border-white/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">Unlock Full Pack:</div>
                      <div className="text-2xl font-black text-purple-300 tabular-nums">
                        {pack.creditPrice} <span className="text-sm font-semibold">Credits</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Your Balance:</div>
                      <div className="text-base font-bold text-white tabular-nums">
                        {user.walletBalance} Credits
                      </div>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="flex items-center gap-1.5 text-rose-400 text-xs">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {user.walletBalance >= pack.creditPrice ? (
                    <button
                      onClick={handleUnlock}
                      disabled={isUnlocking}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 transition-all hover:scale-[1.01]"
                    >
                      <Coins className="w-4 h-4" />
                      {isUnlocking ? 'Verifying on server...' : `Unlock Pack (${pack.creditPrice} Credits)`}
                    </button>
                  ) : (
                    <button
                      onClick={onOpenWallet}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <Coins className="w-4 h-4" />
                      Top Up Credits ({pack.creditPrice - user.walletBalance} more needed)
                    </button>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Instant atomic server unlock</span>
                    <span>Protected delivery verification</span>
                  </div>
                </div>
              )}

              {/* Report Listing option */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => onOpenReport(pack.id, pack.title, 'pack')}
                  className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report this pack or broken link</span>
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
