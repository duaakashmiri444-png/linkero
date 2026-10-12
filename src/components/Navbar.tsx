import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab, User, NotificationItem } from '../types';
import { store } from '../services/store';
import { 
  Film, 
  PlayCircle, 
  Clapperboard,
  FolderLock, 
  Bookmark, 
  Coins, 
  Bell, 
  Search, 
  ShieldCheck, 
  X,
  CheckCircle2
} from 'lucide-react';

const MOBILE_TABS: { tab: ActiveTab; label: string; Icon: typeof Film }[] = [
  { tab: 'home', label: 'Home', Icon: Film },
  { tab: 'videos', label: 'Videos', Icon: PlayCircle },
  { tab: 'demo', label: 'Demo', Icon: Clapperboard },
  { tab: 'marketplace', label: 'Market', Icon: FolderLock },
  { tab: 'library', label: 'Library', Icon: Bookmark },
];

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
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<{ id: string; title: string; type: 'video' | 'pack'; meta: string; price: number }[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

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
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
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
      .map(v => ({ id: v.id, title: v.title, type: 'video' as const, meta: [v.category, v.duration].filter(Boolean).join(' · '), price: v.isFree ? 0 : v.creditPrice }));
    
    const packs = store.getPacks()
      .filter(p => p.title.toLowerCase().includes(q) || p.platform.toLowerCase().includes(q))
      .slice(0, 3)
      .map(p => ({ id: p.id, title: p.title, type: 'pack' as const, meta: `${p.platform} · ${p.fileCount} files`, price: p.creditPrice }));

    setSearchSuggestions([...videos, ...packs]);
  }, [searchInput]);

  const unreadNotifs = notifications.filter(n => !n.read).length;
  const isAdminRole = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  const accountInitials = user.name ? user.name.slice(0, 2).toUpperCase() : '–';

  return (
    <>
    {/* Every bar that pins under this header uses top-[73px], which is its height at all widths. */}
    <header className="sticky top-0 z-40 bg-[#090a12]/90 backdrop-blur-xl border-b border-white/[0.08] px-3 md:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
        
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-6 shrink-0">
          <button 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 text-left group transition-transform focus:outline-none"
          >
            <span className="font-display font-black tracking-tighter text-white group-hover:text-purple-300 transition-colors text-[28px] leading-none lg:text-[30px]">
              DESI<span className="text-purple-400">ERO</span>
            </span>
            <span className="hidden sm:inline text-[12px] font-bold tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-1 rounded">
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
          {isAdminRole && (
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
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* Quick Search Input with dropdown suggestions */}
          <div className="relative hidden sm:block">
            <div className="flex items-center bg-[#141624] border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-purple-500/60 transition-colors w-40 md:w-48 xl:w-64">
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
            className="sm:hidden p-2.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/5"
            aria-label="Open search"
          >
            <Search className="w-6 h-6" />
          </button>

          {/* Wallet credit balance button */}
          <button
            onClick={onOpenWallet}
            className="flex items-center gap-2 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 hover:border-purple-500 text-purple-200 px-3 py-2 rounded-xl text-sm font-bold transition-all shadow-sm shadow-purple-900/30"
            title="Open Wallet & Top Up Credits"
          >
            <Coins className="w-5 h-5 text-purple-400 shrink-0" />
            <span className="tabular-nums">{user.walletBalance}</span>
            <span className="text-xs text-purple-300 font-medium hidden sm:inline">Credits</span>
          </button>

          {/* In-site Notification Center toggle */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 relative transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-6 h-6" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-[#090a12]" />
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 top-full mt-2 w-[min(320px,88vw)] bg-[#121422] border border-white/15 rounded-2xl shadow-2xl p-4 z-50">
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

          {/* Account menu: real session only — no role switching */}
          <div className="relative" ref={accountRef}>
            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-sm font-black text-white hover:opacity-90 ring-2 ring-white/10 focus:outline-none overflow-hidden"
              title={user.role === 'guest' ? 'Sign in' : 'Account'}
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                accountInitials
              )}
            </button>

            {showAccountMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#121422] border border-white/15 rounded-2xl shadow-2xl p-3 z-50">
                {user.role === 'guest' ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        store.requestLogin();
                        setShowAccountMenu(false);
                      }}
                      className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 text-xs"
                    >
                      Sign in / Create account
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="px-2 py-1.5 border-b border-white/10 mb-2">
                      <div className="font-bold text-sm text-white">{user.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded uppercase">
                          {user.role === 'SUPER_ADMIN' ? 'Owner' : user.role === 'ADMIN' ? 'Staff' : 'Viewer'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{user.walletBalance} credits</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onOpenWallet();
                        setShowAccountMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/5"
                    >
                      Add credits
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('library');
                        setShowAccountMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/5"
                    >
                      My library
                    </button>

                    <div className="border-t border-white/10 mt-2 pt-2">
                      <button
                        onClick={async () => {
                          await store.logout();
                          setShowAccountMenu(false);
                          setActiveTab('home');
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/20"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </header>

      {/* Phone tab bar — thumb-sized targets pinned to the bottom edge, desktop keeps the header links */}
      <nav
        aria-label="Sections"
        className={`lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#090a12]/97 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] grid ${
          isAdminRole ? 'grid-cols-6' : 'grid-cols-5'
        }`}
      >
        {(isAdminRole ? [...MOBILE_TABS, { tab: 'admin' as ActiveTab, label: 'Admin', Icon: ShieldCheck }] : MOBILE_TABS).map(
          ({ tab, label, Icon }) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[13px] font-semibold transition-colors ${
                  active ? (tab === 'admin' ? 'text-amber-300' : 'text-white') : 'text-slate-400'
                }`}
              >
                <span
                  className={`absolute top-0 h-[3px] w-9 rounded-b-full transition-opacity ${
                    active ? (tab === 'admin' ? 'bg-amber-400 opacity-100' : 'bg-purple-500 opacity-100') : 'opacity-0'
                  }`}
                />
                <Icon className={`h-[23px] w-[23px] ${active ? (tab === 'admin' ? 'text-amber-400' : 'text-purple-400') : ''}`} />
                <span className="leading-none">{label}</span>
                {tab === 'library' && user.unlockedVideoIds.length + user.unlockedPackIds.length > 0 && (
                  <span className="absolute right-[14%] top-2 rounded-full bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {user.unlockedVideoIds.length + user.unlockedPackIds.length}
                  </span>
                )}
              </button>
            );
          }
        )}
      </nav>
    </>
  );
};
