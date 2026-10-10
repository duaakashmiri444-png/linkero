import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab, User, NotificationItem } from '../types';
import { store } from '../services/store';
import { 
  Film, 
  PlayCircle, 
  FolderLock, 
  Bookmark, 
  Coins, 
  Bell, 
  Search, 
  ShieldCheck, 
  X,
  CheckCircle2
} from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenWallet: () => void;
  onOpenSearch: () => void;
  onSelectVideo: (videoId: string) => void;
  onSelectPack: (packId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenWallet,
  onOpenSearch,
  onSelectVideo,
  onSelectPack
}) => {
  const [user, setUser] = useState<User>(store.getUser());
  const [notifications, setNotifications] = useState<NotificationItem[]>(store.getNotifications());
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<{ id: string; title: string; type: 'video' | 'pack'; meta: string; price: number }[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return store.subscribe(() => {
      setUser(store.getUser());
      setNotifications(store.getNotifications());
    });
  }, []);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick live search suggestions
  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchSuggestions([]);
      return;
    }
    const q = searchInput.toLowerCase();
    const videos = store.getVideos()
      .filter(v => v.title.toLowerCase().includes(q) || v.category.toLowerCase().includes(q))
      .slice(0, 4)
      .map(v => ({ id: v.id, title: v.title, type: 'video' as const, meta: `${v.category} · ${v.duration}`, price: v.isFree ? 0 : v.creditPrice }));
    
    const packs = store.getPacks()
      .filter(p => p.title.toLowerCase().includes(q) || p.platform.toLowerCase().includes(q))
      .slice(0, 3)
      .map(p => ({ id: p.id, title: p.title, type: 'pack' as const, meta: `${p.platform} · ${p.fileSize}`, price: p.creditPrice }));

    setSearchSuggestions([...videos, ...packs]);
  }, [searchInput]);

  const unreadNotifs = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-[#090a12]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 md:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-6 shrink-0">
          <button 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-1.5 text-left group transition-transform focus:outline-none"
          >
            <span className="font-display font-black text-2xl tracking-tighter text-white group-hover:text-purple-300 transition-colors">
              DESI<span className="text-purple-400">ERO</span>
            </span>
            <span className="text-[10px] font-bold tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded">
              PRO
            </span>
          </button>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-300">
          <button
            onClick={() => setActiveTab('home')}
            className={`whitespace-nowrap transition-colors hover:text-white py-1 ${activeTab === 'home' ? 'text-white border-b-2 border-purple-500 font-bold' : ''}`}
          >
            Home
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`whitespace-nowrap transition-colors hover:text-white py-1 ${activeTab === 'videos' ? 'text-white border-b-2 border-purple-500 font-bold' : ''}`}
          >
            Videos
          </button>
          <button
            onClick={() => setActiveTab('demo')}
            className={`whitespace-nowrap transition-colors hover:text-white py-1 ${activeTab === 'demo' ? 'text-white border-b-2 border-purple-500 font-bold' : ''}`}
          >
            Demo Room
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`whitespace-nowrap transition-colors hover:text-white py-1 ${activeTab === 'marketplace' ? 'text-white border-b-2 border-purple-500 font-bold' : ''}`}
          >
            Marketplace
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`whitespace-nowrap transition-colors hover:text-white py-1 flex items-center gap-1.5 ${activeTab === 'library' ? 'text-white border-b-2 border-purple-500 font-bold' : ''}`}
          >
            My Library
            {(user.unlockedVideoIds.length + user.unlockedPackIds.length) > 0 && (
              <span className="text-[10px] bg-purple-900/60 text-purple-300 font-bold px-1.5 py-0.2 rounded-full border border-purple-500/30">
                {user.unlockedVideoIds.length + user.unlockedPackIds.length}
              </span>
            )}
          </button>
          {user.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`whitespace-nowrap transition-colors text-amber-400 hover:text-amber-300 py-1 flex items-center gap-1 ${activeTab === 'admin' ? 'border-b-2 border-amber-400 font-bold' : ''}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </button>
          )}
        </nav>

        {/* Zone 3: Actions (Search, Wallet, Notifications, Avatar) */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Quick Search Input with dropdown suggestions */}
          <div className="relative hidden sm:block">
            <div className="flex items-center bg-[#141624] border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-purple-500/60 transition-colors w-48 md:w-64">
              <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
              <input
                type="text"
                placeholder="Search videos & packs..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    onOpenSearch();
                  }
                }}
                className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-full"
              />
              {searchInput && (
                <button onClick={() => setSearchInput('')} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Suggestions flyout */}
            {searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-[#121422] border border-white/15 rounded-xl shadow-2xl p-2 z-50 overflow-hidden">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Quick Results
                </div>
                {searchSuggestions.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.type === 'video') onSelectVideo(item.id);
                      else onSelectPack(item.id);
                      setSearchInput('');
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-white/5 flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="truncate">
                      <div className="font-semibold text-white truncate">{item.title}</div>
                      <div className="text-[11px] text-slate-400">{item.meta}</div>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold text-purple-300">
                      {item.price === 0 ? 'FREE' : `${item.price} CR`}
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    onOpenSearch();
                    setSearchInput('');
                  }}
                  className="w-full text-center text-xs text-purple-400 hover:text-purple-300 font-semibold py-2 mt-1 border-t border-white/5"
                >
                  View full search results →
                </button>
              </div>
            )}
          </div>

          {/* Mobile search trigger */}
          <button
            onClick={onOpenSearch}
            className="sm:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
            aria-label="Open search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Wallet credit balance button */}
          <button
            onClick={onOpenWallet}
            className="flex items-center gap-2 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 hover:border-purple-500 text-purple-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-purple-900/30"
            title="Open Wallet & Top Up Credits"
          >
            <Coins className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="tabular-nums">{user.walletBalance}</span>
            <span className="text-[10px] text-purple-300 font-medium hidden sm:inline">Credits</span>
          </button>

          {/* In-site Notification Center toggle */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 relative transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-[#090a12]" />
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-[#121422] border border-white/15 rounded-2xl shadow-2xl p-4 z-50">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                  <span className="font-bold text-sm text-white">Notifications</span>
                  {unreadNotifs > 0 && (
                    <button
                      onClick={() => store.markAllNotificationsRead()}
                      className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 py-6">No notifications yet.</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl text-xs border ${n.read ? 'bg-transparent border-transparent text-slate-400' : 'bg-purple-950/20 border-purple-500/20 text-slate-200'}`}
                      >
                        <div className="font-semibold text-white mb-0.5">{n.title}</div>
                        <p className="text-[11px] leading-relaxed text-slate-300">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User profile & role switcher */}
          <div className="relative" ref={roleRef}>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-xs font-black text-white hover:opacity-90 ring-2 ring-white/10 focus:outline-none"
              title="Profile & Role"
            >
              {user.avatar}
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#121422] border border-white/15 rounded-2xl shadow-2xl p-3 z-50">
                <div className="px-2 py-1.5 border-b border-white/10 mb-2">
                  <div className="font-bold text-sm text-white">{user.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded uppercase">
                      {user.role}
                    </span>
                    <span className="text-[10px] text-amber-400 font-semibold">
                      VIP Monthly
                    </span>
                  </div>
                </div>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Switch Role Mode
                </div>
                {(['user', 'admin', 'seller'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => {
                      store.setUserRole(role);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${user.role === role ? 'bg-purple-900/30 text-purple-300 font-bold' : 'text-slate-300 hover:bg-white/5'}`}
                  >
                    <span className="capitalize">{role === 'user' ? 'Regular Viewer' : role === 'admin' ? 'Administrator' : 'Creator / Seller'}</span>
                    {user.role === role && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                  </button>
                ))}

                <div className="border-t border-white/10 mt-2 pt-2">
                  <button
                    onClick={() => {
                      store.resetData();
                      setShowRoleMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/20"
                  >
                    Reset Demo State
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Mobile navigation tab bar */}
      <div className="lg:hidden flex items-center justify-around border-t border-white/10 mt-3 pt-2 text-xs">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center py-1 ${activeTab === 'home' ? 'text-purple-400 font-bold' : 'text-slate-400'}`}
        >
          <Film className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex flex-col items-center py-1 ${activeTab === 'videos' ? 'text-purple-400 font-bold' : 'text-slate-400'}`}
        >
          <PlayCircle className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Videos</span>
        </button>
        <button
          onClick={() => setActiveTab('demo')}
          className={`flex flex-col items-center py-1 ${activeTab === 'demo' ? 'text-purple-400 font-bold' : 'text-slate-400'}`}
        >
          <span className="text-sm">🎬</span>
          <span className="text-[10px] mt-0.5">Demo</span>
        </button>
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`flex flex-col items-center py-1 ${activeTab === 'marketplace' ? 'text-purple-400 font-bold' : 'text-slate-400'}`}
        >
          <FolderLock className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Market</span>
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center py-1 ${activeTab === 'library' ? 'text-purple-400 font-bold' : 'text-slate-400'}`}
        >
          <Bookmark className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Library</span>
        </button>
        {user.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center py-1 ${activeTab === 'admin' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Admin</span>
          </button>
        )}
      </div>
    </header>
  );
};
