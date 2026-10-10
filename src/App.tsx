import React, { useState, useEffect } from 'react';
import { ActiveTab, Video, DigitalPack, User } from './types';
import { store } from './services/store';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { VideoCatalogView } from './components/VideoCatalogView';
import { DemoRoom } from './components/DemoRoom';
import { Marketplace } from './components/Marketplace';
import { LibraryView } from './components/LibraryView';
import { AdminPanel } from './components/AdminPanel';
import { AuthScreen } from './components/AuthScreen';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { PackDetailsModal } from './components/PackDetailsModal';
import { WalletModal } from './components/WalletModal';
import { SearchModal } from './components/SearchModal';
import { ReportModal } from './components/ReportModal';
import { Toast } from './components/Toast';
import { Footer } from './components/Footer';
import { CatalogueSection, GRID_PACKS } from './components/CatalogueSection';
import { VideoCard } from './components/VideoCard';
import { PackCard } from './components/PackCard';
import { Sparkles, Play, Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [videos, setVideos] = useState<Video[]>(store.getVideos());
  const [packs, setPacks] = useState<DigitalPack[]>(store.getPacks());
  const [user, setUser] = useState<User>(store.getUser());
  const [booted, setBooted] = useState(store.isBooted());
  const [loading, setLoading] = useState(store.isLoading());
  const [showAuth, setShowAuth] = useState(false);
  const [authReason, setAuthReason] = useState<string | null>(null);

  // Modal states
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [reportData, setReportData] = useState<{ id: string; title: string; type: 'video' | 'pack' } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setVideos(store.getVideos());
      setPacks(store.getPacks());
      setUser(store.getUser());
      setBooted(store.isBooted());
      setLoading(store.isLoading());
      if (store.isLoginRequested()) {
        setAuthReason(store.getStatusMessage());
        setShowAuth(true);
        store.clearLoginRequest();
      }
    });
    void store.bootstrap();
    return unsubscribe;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const featuredVideo = videos.find(v => v.isFeatured) || videos[0];
  const sectionSize = store.getSectionSize();

  if (!booted) {
    return (
      <div className="min-h-screen bg-[#090a12] text-slate-100 flex flex-col items-center justify-center gap-3 font-sans">
        <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
        <p className="text-sm text-slate-400">Loading the catalogue from the server…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a12] text-slate-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white pb-[calc(env(safe-area-inset-bottom)+4.75rem)] lg:pb-0">
      
      {/* Universal Top Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenWallet={() => setIsWalletOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onSelectVideo={(id) => setSelectedVideoId(id)}
        onSelectPack={(id) => setSelectedPackId(id)}
      />

      {/* Main Tab Routing */}
      <main className="flex-1">
        
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Cinematic Featured Hero */}
            {featuredVideo && (
              <HeroBanner
                featuredVideo={featuredVideo}
                user={user}
                onOpenVideo={(id) => setSelectedVideoId(id)}
                onExploreCatalog={() => setActiveTab('videos')}
              />
            )}

            {/* Quick Feature Banner Strip */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#141628] to-pink-950/30 border border-purple-500/20 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Watch before you buy</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('demo')}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Enter Demo Room
                  </button>
                  <button
                    onClick={() => setActiveTab('marketplace')}
                    className="bg-white/10 hover:bg-white/15 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
                  >
                    Browse Packs
                  </button>
                </div>
              </div>
            </div>

            {/* Home shelves: videos, the packs the marketplace sells, and what is free to watch. */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-8">
              {user.watchHistory.length > 0 && (
                <CatalogueSection
                  title="Continue Watching"
                  items={user.watchHistory.map(w => videos.find(v => v.id === w.videoId)).filter((v): v is Video => !!v)}
                  pageSize={sectionSize}
                  renderItem={video => <VideoCard video={video} onOpen={setSelectedVideoId} isUnlocked={video.isFree || user.unlockedVideoIds.includes(video.id)} watchProgress={user.watchHistory.find(w => w.videoId === video.id)} isFavorite={user.favorites.includes(video.id)} />}
                />
              )}

              <CatalogueSection
                title="Trending Right Now"
                items={videos.filter(v => v.isTrending)}
                pageSize={sectionSize}
                renderItem={video => <VideoCard video={video} onOpen={setSelectedVideoId} isUnlocked={video.isFree || user.unlockedVideoIds.includes(video.id)} watchProgress={user.watchHistory.find(w => w.videoId === video.id)} isFavorite={user.favorites.includes(video.id)} />}
              />

              <CatalogueSection
                title="100% Free Videos"
                items={videos.filter(v => v.isFree)}
                pageSize={sectionSize}
                renderItem={video => <VideoCard video={video} onOpen={setSelectedVideoId} isUnlocked watchProgress={user.watchHistory.find(w => w.videoId === video.id)} isFavorite={user.favorites.includes(video.id)} />}
              />

              <CatalogueSection
                title="Watch Before You Unlock"
                badge="Free previews"
                items={videos.filter(v => !v.isFree && v.previewUrl)}
                pageSize={sectionSize}
                renderItem={video => <VideoCard video={video} onOpen={setSelectedVideoId} isUnlocked={user.unlockedVideoIds.includes(video.id)} watchProgress={user.watchHistory.find(w => w.videoId === video.id)} isFavorite={user.favorites.includes(video.id)} />}
              />

              <CatalogueSection
                title="Packs On The Marketplace"
                badge="Files delivered"
                items={packs}
                pageSize={sectionSize}
                gridClassName={GRID_PACKS}
                renderItem={pack => <PackCard pack={pack} onOpen={setSelectedPackId} isUnlocked={user.unlockedPackIds.includes(pack.id)} />}
              />

              {Array.from(new Set(videos.map(v => v.category)))
                .sort()
                .map(cat => videos.filter(v => v.category === cat))
                .filter(group => group.length > 0)
                .map((group, i) => (
                  <CatalogueSection
                    key={group[0].category}
                    title={group[0].category}
                    items={group}
                    pageSize={sectionSize}
                    ordinal={i + 1}
                    renderItem={video => <VideoCard video={video} onOpen={setSelectedVideoId} isUnlocked={video.isFree || user.unlockedVideoIds.includes(video.id)} watchProgress={user.watchHistory.find(w => w.videoId === video.id)} isFavorite={user.favorites.includes(video.id)} />}
                  />
                ))}

              <CatalogueSection
                title="Highest Rated"
                items={[...videos].filter(v => v.ratingCount > 0).sort((a, b) => b.rating - a.rating)}
                pageSize={sectionSize}
                renderItem={video => <VideoCard video={video} onOpen={setSelectedVideoId} isUnlocked={video.isFree || user.unlockedVideoIds.includes(video.id)} watchProgress={user.watchHistory.find(w => w.videoId === video.id)} isFavorite={user.favorites.includes(video.id)} />}
              />
            </div>
          </div>
        )}

        {/* TAB 2: VIDEOS (FULL-LENGTH STREAMING CATALOG) */}
        {activeTab === 'videos' && (
          <VideoCatalogView
            videos={videos}
            user={user}
            onOpenVideo={(id) => setSelectedVideoId(id)}
          />
        )}

        {/* TAB 3: DEMO ROOM */}
        {activeTab === 'demo' && (
          <DemoRoom
            videos={videos}
            packs={packs}
            user={user}
            onOpenVideo={(id) => setSelectedVideoId(id)}
            onOpenPack={(id) => setSelectedPackId(id)}
          />
        )}

        {/* TAB 4: MARKETPLACE */}
        {activeTab === 'marketplace' && (
          <Marketplace
            packs={packs}
            user={user}
            onOpenPack={(id) => setSelectedPackId(id)}
          />
        )}

        {/* TAB 5: MY LIBRARY */}
        {activeTab === 'library' && (
          <LibraryView
            videos={videos}
            packs={packs}
            user={user}
            onOpenVideo={(id) => setSelectedVideoId(id)}
            onOpenPack={(id) => setSelectedPackId(id)}
            onExploreCatalog={() => setActiveTab('videos')}
          />
        )}

        {/* TAB 6: ADMIN CONTROL PANEL (real session role only) */}
        {activeTab === 'admin' && (
          user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? (
            <AdminPanel onToast={showToast} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
              <h2 className="text-lg font-bold text-white">Staff area</h2>
              <p className="text-sm text-slate-400">
                This tab needs an admin account. Currently signed in as {user.role === 'guest' ? 'a guest' : user.name}.
              </p>
              {user.role === 'guest' && (
                <button
                  onClick={() => setShowAuth(true)}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm"
                >
                  Sign in
                </button>
              )}
            </div>
          )
        )}

      </main>

      {/* Global Video Player Modal */}
      {selectedVideoId && (
        <VideoPlayerModal
          videoId={selectedVideoId}
          onClose={() => setSelectedVideoId(null)}
          onOpenWallet={() => setIsWalletOpen(true)}
          onSelectVideo={(id) => setSelectedVideoId(id)}
          onOpenReport={(id, title, type) => setReportData({ id, title, type })}
          onToast={showToast}
        />
      )}

      {/* Global Digital Pack Details Modal */}
      {selectedPackId && (
        <PackDetailsModal
          packId={selectedPackId}
          onClose={() => setSelectedPackId(null)}
          onOpenWallet={() => setIsWalletOpen(true)}
          onSelectVideo={(id) => setSelectedVideoId(id)}
          onOpenReport={(id, title, type) => setReportData({ id, title, type })}
          onToast={showToast}
        />
      )}

      {/* Wallet Modal */}
      {isWalletOpen && (
        <WalletModal
          onClose={() => setIsWalletOpen(false)}
          onToast={showToast}
        />
      )}

      {/* Search Modal */}
      {isSearchOpen && (
        <SearchModal
          videos={videos}
          packs={packs}
          user={user}
          onClose={() => setIsSearchOpen(false)}
          onOpenVideo={(id) => setSelectedVideoId(id)}
          onOpenPack={(id) => setSelectedPackId(id)}
        />
      )}

      {/* Report Modal */}
      {reportData && (
        <ReportModal
          targetId={reportData.id}
          targetTitle={reportData.title}
          targetType={reportData.type}
          onClose={() => setReportData(null)}
          onToast={showToast}
        />
      )}

      {/* Real sign-in — replaces the old customer-facing role switcher */}
      {showAuth && (
        <AuthScreen
          reason={authReason}
          onClose={() => {
            setShowAuth(false);
            setAuthReason(null);
          }}
          onAuthenticated={msg => showToast(msg)}
        />
      )}

      {/* Server round-trip indicator */}
      {loading && (
        <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-full bg-black/80 border border-white/10 px-3 py-1.5 text-[11px] text-slate-300">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Contacting server…
        </div>
      )}

      {/* Toast Feedback */}
      <Toast message={toastMessage} />

      {/* Footer */}
      <Footer
        onSelectTab={setActiveTab}
        onOpenWallet={() => setIsWalletOpen(true)}
      />

    </div>
  );
}
