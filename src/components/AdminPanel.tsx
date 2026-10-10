import React, { useState, useEffect } from 'react';
import { Video, DigitalPack, Transaction, ContentReport, SEOSettings } from '../types';
import { store } from '../services/store';
import { 
  BarChart3, 
  Film, 
  Package, 
  Coins, 
  Flag, 
  Globe, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  Download,
  AlertCircle
} from 'lucide-react';

interface AdminPanelProps {
  onToast: (msg: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onToast }) => {
  const [activeTab, setActiveTab] = useState<'kpis' | 'videos' | 'packs' | 'finance' | 'reports' | 'seo'>('kpis');
  const [videos, setVideos] = useState<Video[]>(store.getVideos());
  const [packs, setPacks] = useState<DigitalPack[]>(store.getPacks());
  const [transactions, setTransactions] = useState<Transaction[]>(store.getTransactions());
  const [reports, setReports] = useState<ContentReport[]>(store.getReports());
  const [seo, setSeo] = useState<SEOSettings>(store.getSEO());

  // Video Form Modal state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    category: 'Pakistani' as Video['category'],
    duration: '15:00',
    durationSeconds: 900,
    isFree: false,
    creditPrice: 4,
    previewTrimSeconds: 20,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    tags: 'Featured, Creator, 4K',
    creatorName: 'Desi Ero Creator',
    creatorHandle: '@creator'
  });

  // Pack Form Modal state
  const [showPackModal, setShowPackModal] = useState(false);
  const [packForm, setPackForm] = useState({
    title: '',
    description: '',
    platform: 'MEGA' as DigitalPack['platform'],
    category: 'Trending ABACS' as DigitalPack['category'],
    fileSize: '4.5 GB',
    creditPrice: 60,
    itemCount: 20,
    includedItemsText: '1080p Master Files\nPhoto Archives\nDirect decrypt key',
    accessUrl: 'https://mega.nz/folder/SAMPLE_PACK_TOKEN',
    masterDemoVideoId: ''
  });

  useEffect(() => {
    return store.subscribe(() => {
      setVideos(store.getVideos());
      setPacks(store.getPacks());
      setTransactions(store.getTransactions());
      setReports(store.getReports());
      setSeo(store.getSEO());
    });
  }, []);

  // Financial metrics
  const totalPurchases = transactions.filter(t => t.type === 'video_unlock' || t.type === 'pack_unlock');
  const creditsSpent = Math.abs(totalPurchases.reduce((acc, t) => acc + t.amount, 0));
  const totalDeposits = transactions.filter(t => t.type === 'deposit').reduce((acc, t) => acc + t.amount, 0);

  // Conversion rate metric (purchases / total views approximated)
  const totalViews = videos.reduce((acc, v) => acc + v.views, 0);
  const conversionRate = totalViews > 0 ? ((totalPurchases.length / totalViews) * 100).toFixed(2) : '0.00';

  // Handle Add Video
  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    store.addVideo({
      title: videoForm.title,
      description: videoForm.description,
      category: videoForm.category,
      duration: videoForm.duration,
      durationSeconds: videoForm.durationSeconds,
      isFree: videoForm.isFree,
      creditPrice: videoForm.isFree ? 0 : Number(videoForm.creditPrice),
      previewTrimSeconds: Number(videoForm.previewTrimSeconds),
      videoUrl: videoForm.videoUrl,
      tags: videoForm.tags.split(',').map(t => t.trim()),
      creator: {
        name: videoForm.creatorName,
        handle: videoForm.creatorHandle,
        avatar: videoForm.creatorName.slice(0, 2).toUpperCase(),
        verified: true
      },
      thumbnail: '',
      backdrop: ''
    });
    setShowVideoModal(false);
    onToast(`Video "${videoForm.title}" published to catalog!`);
  };

  // Handle Add Pack
  const handleAddPack = (e: React.FormEvent) => {
    e.preventDefault();
    store.addPack({
      title: packForm.title,
      description: packForm.description,
      platform: packForm.platform,
      category: packForm.category,
      fileSize: packForm.fileSize,
      creditPrice: Number(packForm.creditPrice),
      itemCount: Number(packForm.itemCount),
      includedItems: packForm.includedItemsText.split('\n').filter(i => i.trim()),
      accessUrl: packForm.accessUrl,
      masterDemoVideoId: packForm.masterDemoVideoId || undefined,
      coverImage: ''
    });
    setShowPackModal(false);
    onToast(`Digital Pack "${packForm.title}" published to marketplace!`);
  };

  // Generate XML Sitemap string
  const generateSitemapXml = () => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${seo.canonicalUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${seo.canonicalUrl}/#videos</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${seo.canonicalUrl}/#demo</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${seo.canonicalUrl}/#marketplace</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  ${videos.map(v => `
  <url>
    <loc>${seo.canonicalUrl}/video/${v.id}</loc>
    <lastmod>${v.publishedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
  ${packs.map(p => `
  <url>
    <loc>${seo.canonicalUrl}/pack/${p.id}</loc>
    <lastmod>${p.publishedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;
  };

  const handleDownloadSitemap = () => {
    const xml = generateSitemapXml();
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    a.click();
    URL.revokeObjectURL(url);
    onToast('sitemap.xml downloaded successfully!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      
      {/* Admin Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded uppercase tracking-wider">
            ADMINISTRATIVE PORTAL
          </span>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight mt-1">
            Control Panel & Management
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Catalog authoring, pricing configurations, financial ledgers, moderation, and SEO controls.
          </p>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex flex-wrap gap-1 bg-[#121422] p-1 rounded-2xl border border-white/10 text-xs">
          {[
            { id: 'kpis', label: 'Dashboard', icon: BarChart3 },
            { id: 'videos', label: `Videos (${videos.length})`, icon: Film },
            { id: 'packs', label: `Packs (${packs.length})`, icon: Package },
            { id: 'finance', label: 'Financial Ledger', icon: Coins },
            { id: 'reports', label: `Reports (${reports.filter(r => r.status === 'pending').length})`, icon: Flag },
            { id: 'seo', label: 'SEO Management', icon: Globe }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: DASHBOARD KPIS */}
      {activeTab === 'kpis' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#141626] border border-white/10">
              <span className="text-xs font-semibold text-slate-400">Total Unlocks & Sales</span>
              <div className="text-2xl font-black text-white mt-1 tabular-nums">
                {totalPurchases.length}
              </div>
              <span className="text-[11px] text-purple-400">Atomic server verified transactions</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#141626] border border-white/10">
              <span className="text-xs font-semibold text-slate-400">Credits Spent / Revenue</span>
              <div className="text-2xl font-black text-purple-300 mt-1 tabular-nums">
                {creditsSpent} CR
              </div>
              <span className="text-[11px] text-slate-400">From {totalDeposits} CR deposited</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#141626] border border-white/10">
              <span className="text-xs font-semibold text-slate-400">Published Content</span>
              <div className="text-2xl font-black text-white mt-1 tabular-nums">
                {videos.length + packs.length}
              </div>
              <span className="text-[11px] text-slate-400">{videos.length} videos · {packs.length} packs</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#141626] border border-white/10">
              <span className="text-xs font-semibold text-slate-400">Pending Moderation Reports</span>
              <div className="text-2xl font-black text-rose-400 mt-1 tabular-nums">
                {reports.filter(r => r.status === 'pending').length}
              </div>
              <span className="text-[11px] text-slate-400">Broken links or flagged items</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#141626] border border-white/10 space-y-4">
            <h3 className="font-bold text-white text-base">Quick Content Authoring</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowVideoModal(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Publish New Video Listing
              </button>
              <button
                onClick={() => setShowPackModal(true)}
                className="bg-pink-600 hover:bg-pink-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Publish Digital Archive Pack
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VIDEOS MANAGEMENT */}
      {activeTab === 'videos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-base">Published Videos Catalog ({videos.length})</h3>
            <button
              onClick={() => setShowVideoModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Video
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121422] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b0c16] text-slate-400 border-b border-white/10 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Video Title</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Pricing</th>
                    <th className="p-3">Preview Trim</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {videos.map(v => (
                    <tr key={v.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-semibold text-white max-w-xs truncate">{v.title}</td>
                      <td className="p-3 text-purple-300">{v.category}</td>
                      <td className="p-3 font-mono">{v.duration}</td>
                      <td className="p-3">
                        {v.isFree ? (
                          <span className="text-emerald-400 font-bold">FREE</span>
                        ) : (
                          <span className="text-purple-300 font-bold">{v.creditPrice} CR</span>
                        )}
                      </td>
                      <td className="p-3 font-mono">{v.previewTrimSeconds}s</td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            const newPrice = prompt(`Update credit price for "${v.title}" (current: ${v.creditPrice}):`, String(v.creditPrice));
                            if (newPrice !== null) {
                              const num = Number(newPrice);
                              store.updateVideo(v.id, { creditPrice: num, isFree: num === 0 });
                              onToast(`Price updated for ${v.title}`);
                            }
                          }}
                          className="text-purple-400 hover:text-purple-300 p-1 font-semibold"
                        >
                          Edit Price
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete video "${v.title}"?`)) {
                              store.deleteVideo(v.id);
                              onToast('Video deleted');
                            }
                          }}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PACKS MANAGEMENT */}
      {activeTab === 'packs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-base">Published Digital Packs ({packs.length})</h3>
            <button
              onClick={() => setShowPackModal(true)}
              className="bg-pink-600 hover:bg-pink-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Digital Pack
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121422] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b0c16] text-slate-400 border-b border-white/10 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Pack Title</th>
                    <th className="p-3">Platform</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Credit Price</th>
                    <th className="p-3">Master Demo</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {packs.map(p => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-semibold text-white max-w-xs truncate">{p.title}</td>
                      <td className="p-3 text-purple-300">{p.platform}</td>
                      <td className="p-3 font-mono">{p.fileSize}</td>
                      <td className="p-3 font-bold text-purple-300">{p.creditPrice} CR</td>
                      <td className="p-3">
                        {p.masterDemoVideoId ? (
                          <span className="text-pink-400 font-semibold">✓ Connected</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            const newPrice = prompt(`Update price for "${p.title}" (current: ${p.creditPrice}):`, String(p.creditPrice));
                            if (newPrice !== null) {
                              store.updatePack(p.id, { creditPrice: Number(newPrice) });
                              onToast(`Price updated for ${p.title}`);
                            }
                          }}
                          className="text-purple-400 hover:text-purple-300 p-1 font-semibold"
                        >
                          Edit Price
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete pack "${p.title}"?`)) {
                              store.deletePack(p.id);
                              onToast('Pack deleted');
                            }
                          }}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL AUDIT LEDGER */}
      {activeTab === 'finance' && (
        <div className="space-y-4">
          <h3 className="font-bold text-white text-base">Complete Audit Ledger</h3>
          <div className="rounded-2xl border border-white/10 bg-[#121422] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b0c16] text-slate-400 border-b border-white/10 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Reference</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Item / Description</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Balance After</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {transactions.map(txn => (
                    <tr key={txn.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-mono text-purple-300">{txn.reference}</td>
                      <td className="p-3 capitalize">{txn.type.replace('_', ' ')}</td>
                      <td className="p-3 font-semibold text-white max-w-xs truncate">
                        {txn.itemTitle || (txn.type === 'deposit' ? 'Wallet Deposit' : 'Promo')}
                      </td>
                      <td className={`p-3 font-bold tabular-nums ${txn.amount > 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {txn.amount > 0 ? `+${txn.amount}` : txn.amount} CR
                      </td>
                      <td className="p-3 font-mono tabular-nums">{txn.balanceAfter} CR</td>
                      <td className="p-3 text-slate-400">{new Date(txn.createdAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REPORTS & MODERATION */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <h3 className="font-bold text-white text-base">Content & Broken Link Reports ({reports.length})</h3>
          {reports.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-[#141626] rounded-2xl border border-white/10">
              No reports submitted yet. Everything running smoothly!
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(rep => (
                <div key={rep.id} className="p-4 rounded-xl bg-[#141626] border border-white/10 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-rose-400 uppercase">
                        [{rep.reason.replace('_', ' ')}]
                      </span>
                      <span className="text-sm font-semibold text-white">{rep.targetTitle}</span>
                    </div>
                    <p className="text-xs text-slate-300">{rep.details}</p>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Logged {new Date(rep.createdAt).toLocaleString()} · Status: {rep.status}
                    </div>
                  </div>

                  {rep.status === 'pending' ? (
                    <button
                      onClick={() => {
                        store.resolveReport(rep.id);
                        onToast('Report marked as reviewed and resolved.');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs shrink-0 transition-colors"
                    >
                      Resolve
                    </button>
                  ) : (
                    <span className="text-emerald-400 text-xs font-bold shrink-0">✓ Resolved</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: SEO MANAGEMENT */}
      {activeTab === 'seo' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-white text-base">SEO & Social Meta Configuration</h3>
              <p className="text-xs text-slate-400">Controls search engine snippets, OpenGraph previews, and XML sitemaps.</p>
            </div>
            <button
              onClick={handleDownloadSitemap}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download sitemap.xml
            </button>
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              store.updateSEO(seo);
              onToast('SEO settings updated and saved!');
            }}
            className="p-6 rounded-2xl bg-[#141626] border border-white/10 space-y-4 max-w-2xl"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Page Title (&lt;title&gt; and og:title)</label>
              <input
                type="text"
                value={seo.metaTitle}
                onChange={e => setSeo({ ...seo, metaTitle: e.target.value })}
                className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Meta Description (og:description)</label>
              <textarea
                rows={3}
                value={seo.metaDescription}
                onChange={e => setSeo({ ...seo, metaDescription: e.target.value })}
                className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Canonical URL</label>
              <input
                type="text"
                value={seo.canonicalUrl}
                onChange={e => setSeo({ ...seo, canonicalUrl: e.target.value })}
                className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="robotsIndex"
                checked={seo.robotsIndex}
                onChange={e => setSeo({ ...seo, robotsIndex: e.target.checked })}
                className="w-4 h-4 accent-purple-600 rounded"
              />
              <label htmlFor="robotsIndex" className="text-xs text-white">
                Allow Search Engines to Index Public Catalog (index, follow)
              </label>
            </div>

            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-colors"
            >
              Save SEO Settings
            </button>
          </form>
        </div>
      )}

      {/* CREATE VIDEO MODAL */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121424] border border-white/15 rounded-3xl p-6 w-full max-w-lg space-y-4">
            <h3 className="font-bold text-white text-base">Add New Video to Catalog</h3>
            <form onSubmit={handleAddVideo} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Lahore Exclusive Session"
                  value={videoForm.title}
                  onChange={e => setVideoForm({ ...videoForm, title: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Short summary of the video content..."
                  value={videoForm.description}
                  onChange={e => setVideoForm({ ...videoForm, description: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <select
                    value={videoForm.category}
                    onChange={e => setVideoForm({ ...videoForm, category: e.target.value as any })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  >
                    <option value="Pakistani">Pakistani</option>
                    <option value="Indian">Indian</option>
                    <option value="TikTok Creators">TikTok Creators</option>
                    <option value="Models & Creators">Models & Creators</option>
                    <option value="Trending ABACS">Trending ABACS</option>
                    <option value="Master Demos">Master Demos</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Duration String</label>
                  <input
                    type="text"
                    placeholder="e.g. 18:40"
                    value={videoForm.duration}
                    onChange={e => setVideoForm({ ...videoForm, duration: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Is Free?</label>
                  <select
                    value={videoForm.isFree ? 'yes' : 'no'}
                    onChange={e => setVideoForm({ ...videoForm, isFree: e.target.value === 'yes' })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  >
                    <option value="no">Paid Video</option>
                    <option value="yes">100% Free</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Credit Price</label>
                  <input
                    type="number"
                    disabled={videoForm.isFree}
                    value={videoForm.creditPrice}
                    onChange={e => setVideoForm({ ...videoForm, creditPrice: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Preview Trim (s)</label>
                  <input
                    type="number"
                    value={videoForm.previewTrimSeconds}
                    onChange={e => setVideoForm({ ...videoForm, previewTrimSeconds: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="flex-1 bg-white/10 text-white py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white font-bold py-2 rounded-xl"
                >
                  Publish Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PACK MODAL */}
      {showPackModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121424] border border-white/15 rounded-3xl p-6 w-full max-w-lg space-y-4">
            <h3 className="font-bold text-white text-base">Add New Digital Pack</h3>
            <form onSubmit={handleAddPack} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. VIP Mega Archive 9GB"
                  value={packForm.title}
                  onChange={e => setPackForm({ ...packForm, title: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Platform</label>
                  <select
                    value={packForm.platform}
                    onChange={e => setPackForm({ ...packForm, platform: e.target.value as any })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  >
                    <option value="MEGA">MEGA</option>
                    <option value="Google Drive">Google Drive</option>
                    <option value="Telegram">Telegram</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Pack Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 9.0 GB"
                    value={packForm.fileSize}
                    onChange={e => setPackForm({ ...packForm, fileSize: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Credit Price</label>
                  <input
                    type="number"
                    value={packForm.creditPrice}
                    onChange={e => setPackForm({ ...packForm, creditPrice: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Item Count</label>
                  <input
                    type="number"
                    value={packForm.itemCount}
                    onChange={e => setPackForm({ ...packForm, itemCount: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Authorized Access Destination URL</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. https://mega.nz/folder/..."
                  value={packForm.accessUrl}
                  onChange={e => setPackForm({ ...packForm, accessUrl: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Included Items (one per line)</label>
                <textarea
                  rows={3}
                  value={packForm.includedItemsText}
                  onChange={e => setPackForm({ ...packForm, includedItemsText: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPackModal(false)}
                  className="flex-1 bg-white/10 text-white py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-pink-600 text-white font-bold py-2 rounded-xl"
                >
                  Publish Pack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
