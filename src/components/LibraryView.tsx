import React, { useState } from 'react';
import { Video, DigitalPack, User } from '../types';
import { VideoCard } from './VideoCard';
import { PackCard } from './PackCard';
import { Play, Download, Bookmark, Clock, CheckCircle2, FolderLock } from 'lucide-react';

interface LibraryViewProps {
  videos: Video[];
  packs: DigitalPack[];
  user: User;
  onOpenVideo: (videoId: string) => void;
  onOpenPack: (packId: string) => void;
  onExploreCatalog: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  videos,
  packs,
  user,
  onOpenVideo,
  onOpenPack,
  onExploreCatalog
}) => {
  const [activeTab, setActiveTab] = useState<'videos' | 'packs' | 'continue' | 'favorites'>('videos');

  // Purchased / Unlocked Videos
  const purchasedVideos = videos.filter(v => user.unlockedVideoIds.includes(v.id));

  // Purchased / Unlocked Digital Packs
  const purchasedPacks = packs.filter(p => user.unlockedPackIds.includes(p.id));

  // Continue Watching videos
  const continueWatchingVideos = user.watchHistory
    .map(w => {
      const vid = videos.find(v => v.id === w.videoId);
      return { vid, progress: w };
    })
    .filter((item): item is { vid: Video; progress: typeof item.progress } => !!item.vid);

  // Favorites
  const favoriteVideos = videos.filter(v => user.favorites.includes(v.id));
  const favoritePacks = packs.filter(p => user.favorites.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
            PERSONALIZED HUB
          </span>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight mt-1">
            My Library
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Permanent access to all unlocked videos, digital packs, and saved watchlist items.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex flex-wrap gap-1 bg-[#121422] p-1 rounded-2xl border border-white/10 text-xs">
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'videos' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Purchased Videos ({purchasedVideos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('packs')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'packs' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <FolderLock className="w-3.5 h-3.5" />
            <span>Purchased Packs ({purchasedPacks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('continue')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'continue' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Continue Watching ({continueWatchingVideos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'favorites' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved ({favoriteVideos.length + favoritePacks.length})</span>
          </button>
        </div>
      </div>

      {/* Tab: Purchased Videos */}
      {activeTab === 'videos' && (
        <div>
          {purchasedVideos.length === 0 ? (
            <div className="text-center py-20 bg-[#121422]/60 border border-white/10 rounded-3xl p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto">
                <Play className="w-6 h-6 ml-0.5" />
              </div>
              <h3 className="font-bold text-base text-white">No Unlocked Videos Yet</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Unlock full-length streaming videos with your demo credits, or add completely free videos to watch here.
              </p>
              <button
                onClick={onExploreCatalog}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
              >
                Browse Video Catalog →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {purchasedVideos.map(video => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onOpen={onOpenVideo}
                  isUnlocked={true}
                  isFavorite={user.favorites.includes(video.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Purchased Packs */}
      {activeTab === 'packs' && (
        <div>
          {purchasedPacks.length === 0 ? (
            <div className="text-center py-20 bg-[#121422]/60 border border-white/10 rounded-3xl p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto">
                <FolderLock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white">No Unlocked Packs Yet</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Browse our MEGA, Google Drive, and Telegram packs. Once unlocked, permanent verified download tokens appear here.
              </p>
              <button
                onClick={onExploreCatalog}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
              >
                Open Marketplace →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchasedPacks.map(pack => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  onOpen={onOpenPack}
                  isUnlocked={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Continue Watching */}
      {activeTab === 'continue' && (
        <div>
          {continueWatchingVideos.length === 0 ? (
            <div className="text-center py-20 bg-[#121422]/60 border border-white/10 rounded-3xl p-8 space-y-2">
              <p className="text-slate-400 text-xs">No partially watched videos in your history.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {continueWatchingVideos.map(({ vid, progress }) => (
                <VideoCard
                  key={vid.id}
                  video={vid}
                  onOpen={onOpenVideo}
                  isUnlocked={vid.isFree || user.unlockedVideoIds.includes(vid.id)}
                  watchProgress={progress}
                  isFavorite={user.favorites.includes(vid.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Saved / Favorites */}
      {activeTab === 'favorites' && (
        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-bold text-white mb-3">Saved Videos</h3>
            {favoriteVideos.length === 0 ? (
              <p className="text-xs text-slate-500">No videos saved to watchlist.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {favoriteVideos.map(video => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onOpen={onOpenVideo}
                    isUnlocked={video.isFree || user.unlockedVideoIds.includes(video.id)}
                    isFavorite={true}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-white mb-3">Saved Digital Packs</h3>
            {favoritePacks.length === 0 ? (
              <p className="text-xs text-slate-500">No packs saved to favorites.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoritePacks.map(pack => (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    onOpen={onOpenPack}
                    isUnlocked={user.unlockedPackIds.includes(pack.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
