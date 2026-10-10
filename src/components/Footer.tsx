import React from 'react';

interface FooterProps {
  onSelectTab: (tab: any) => void;
  onOpenWallet: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab, onOpenWallet }) => {
  return (
    <footer className="border-t border-white/[0.08] bg-[#07080f] text-slate-400 text-xs py-12 px-4 md:px-8 mt-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div className="space-y-3">
          <div className="font-display font-black text-xl tracking-tight text-white">
            DESI<span className="text-purple-400">ERO</span> <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">PRO</span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
            Premium streaming platform and digital marketplace. Videos play in the inbuilt player, packs deliver the seller's own files, and every unlock is backed by a wallet transaction.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Navigation</h4>
          <ul className="space-y-2 text-xs">
            <li><button onClick={() => onSelectTab('home')} className="hover:text-white transition-colors">Home Showcase</button></li>
            <li><button onClick={() => onSelectTab('videos')} className="hover:text-white transition-colors">Video Streaming Catalog</button></li>
            <li><button onClick={() => onSelectTab('demo')} className="hover:text-white transition-colors">The Demo Room</button></li>
            <li><button onClick={() => onSelectTab('marketplace')} className="hover:text-white transition-colors">Digital Pack Marketplace</button></li>
            <li><button onClick={() => onSelectTab('library')} className="hover:text-white transition-colors">My Library</button></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Hosting Platforms</h4>
          <ul className="space-y-2 text-xs">
            <li><span className="text-slate-300">MEGA Cloud Folders</span></li>
            <li><span className="text-slate-300">Google Drive Shared Mirrors</span></li>
            <li><span className="text-slate-300">Telegram VIP Channels</span></li>
            <li><span className="text-slate-300">WhatsApp Communities</span></li>
            <li><span className="text-slate-300">Inbuilt High-Definition Stream</span></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Credits & Membership</h4>
          <ul className="space-y-2 text-xs">
            <li><button onClick={onOpenWallet} className="hover:text-white text-purple-300 font-semibold">Wallet Top-Up</button></li>
            <li><span>Credits land in your wallet only after the owner verifies your payment reference</span></li>
            <li><span>Every unlock is recorded in your wallet ledger</span></li>
            <li><span>Access lasts as long as the listing states</span></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500">
        <div>
          © 2026 Desi Ero PRO. All rights reserved.
        </div>
        <div className="flex gap-4">
          <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
          <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
          <span className="hover:text-slate-400 cursor-pointer">DMCA & Copyright</span>
          <span className="hover:text-slate-400 cursor-pointer">Content Guidelines</span>
        </div>
      </div>
    </footer>
  );
};
