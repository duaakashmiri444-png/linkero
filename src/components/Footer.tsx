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
          <p className="max-w-xs text-xs leading-relaxed text-slate-500">
            Videos play in-site. Packs deliver the seller's files.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Browse</h4>
          <ul className="space-y-2 text-xs">
            <li><button onClick={() => onSelectTab('home')} className="hover:text-white transition-colors">Home</button></li>
            <li><button onClick={() => onSelectTab('videos')} className="hover:text-white transition-colors">Videos</button></li>
            <li><button onClick={() => onSelectTab('demo')} className="hover:text-white transition-colors">Demo</button></li>
            <li><button onClick={() => onSelectTab('marketplace')} className="hover:text-white transition-colors">Packs</button></li>
            <li><button onClick={() => onSelectTab('library')} className="hover:text-white transition-colors">Library</button></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Delivered via</h4>
          <ul className="space-y-2 text-xs">
            <li><span className="text-slate-300">MEGA</span></li>
            <li><span className="text-slate-300">Google Drive</span></li>
            <li><span className="text-slate-300">Telegram</span></li>
            <li><span className="text-slate-300">WhatsApp</span></li>
            <li><span className="text-slate-300">In-site player</span></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Credits</h4>
          <ul className="space-y-2 text-xs">
            <li><button onClick={onOpenWallet} className="hover:text-white text-purple-300 font-semibold">Wallet Top-Up</button></li>
            <li><span>Added after the owner verifies your payment</span></li>
            <li><span>Every unlock is on your ledger</span></li>
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
