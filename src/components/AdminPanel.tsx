import React, { useEffect, useRef, useState } from 'react';
import { store } from '../services/store';
import { DELIVERY_PLATFORMS, formatDuration, humanBytes } from '../services/mappers';
import type { AdminAuditRow, AdminOverview, MediaAsset, PlatformSettingRow } from '../services/api';
import type { DigitalPack, Video } from '../types';
import { AuditPanel } from './admin/AuditPanel';
import { CategoriesPanel } from './admin/CategoriesPanel';
import { CouponsPanel } from './admin/CouponsPanel';
import { DashboardPanel } from './admin/DashboardPanel';
import { ListingEditModal } from './admin/ListingEditModal';
import { PaymentsPanel } from './admin/PaymentsPanel';
import { UsersPanel } from './admin/UsersPanel';
import {
  BarChart3,
  Film,
  Package,
  Coins,
  FolderOpen,
  Settings2,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  UploadCloud,
  AlertCircle,
  Clock,
  ExternalLink,
  Pencil,
  ScrollText,
  Tags,
  Ticket,
  UserRound,
  Image as PhotoIcon
} from 'lucide-react';

interface AdminPanelProps {
  onToast: (msg: string) => void;
}

type PanelTab =
  | 'dashboard'
  | 'videos'
  | 'packs'
  | 'users'
  | 'payments'
  | 'coupons'
  | 'categories'
  | 'files'
  | 'settings'
  | 'audit';

const DURATIONS = [
  { value: 'LIFETIME', label: 'Lifetime access' },
  { value: '90_DAYS', label: '90 days' },
  { value: '30_DAYS', label: '30 days' },
  { value: '7_DAYS', label: '7 days' },
  { value: '24_HOURS', label: '24 hours' }
];

/** Reads the real runtime out of the chosen file instead of asking the admin to type it. */
function probeVideoDuration(file: File): Promise<number> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const el = document.createElement('video');
    let settled = false;
    const finish = (seconds: number) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    // Recorded WebM reports Infinity until the browser has scanned the whole file, so keep
    // listening on durationchange instead of trusting the first metadata event.
    const read = () => {
      const raw = Number(el.duration);
      if (Number.isFinite(raw) && raw > 0) finish(Math.floor(raw));
    };
    el.preload = 'metadata';
    el.onloadedmetadata = read;
    el.ondurationchange = read;
    el.onerror = () => finish(0);
    el.src = url;
    // A runtime that never resolves must still let the admin publish, as "runtime unknown".
    setTimeout(() => finish(0), 4000);
  });
}

const EMPTY_VIDEO_FORM = {
  title: '',
  description: '',
  category: '',
  price: 4,
  status: 'PUBLISHED',
  access_duration_type: 'LIFETIME',
  tags: ''
};

const EMPTY_PACK_FORM = {
  title: '',
  description: '',
  category: '',
  price: 60,
  status: 'PUBLISHED',
  access_duration_type: '30_DAYS',
  sizeLabel: '',
  contentsLabel: ''
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ onToast }) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('dashboard');
  const [videos, setVideos] = useState<Video[]>(() => store.getVideos());
  const [packs, setPacks] = useState<DigitalPack[]>(() => store.getPacks());
  const [uploads, setUploads] = useState<MediaAsset[]>(() => store.getUploads());
  const [stats, setStats] = useState<Record<string, number | string>>(() => store.getAdminStats());
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewDays, setOverviewDays] = useState(30);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<AdminAuditRow[]>([]);
  const [editing, setEditing] = useState<{ productId: number; kind: 'video' | 'pack' } | null>(null);

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoForm, setVideoForm] = useState(EMPTY_VIDEO_FORM);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);

  const [showPackModal, setShowPackModal] = useState(false);
  const [packForm, setPackForm] = useState(EMPTY_PACK_FORM);
  const [packFiles, setPackFiles] = useState<File[]>([]);
  const [packVideos, setPackVideos] = useState<{ file: File; durationSeconds: number }[]>([]);
  const [packPhotos, setPackPhotos] = useState<File[]>([]);
  const [packDemoVideo, setPackDemoVideo] = useState<File | null>(null);
  const [packDemoDuration, setPackDemoDuration] = useState(0);
  const [packLinks, setPackLinks] = useState<{ provider: string; url: string }[]>([]);

  const [previewTarget, setPreviewTarget] = useState<{ productId: number; title: string; hasPreview: boolean } | null>(null);
  const [previewMode, setPreviewMode] = useState<'trim' | 'upload' | 'none'>('trim');
  const [previewSeconds, setPreviewSeconds] = useState('');
  const [previewStart, setPreviewStart] = useState('');
  const [previewClipFile, setPreviewClipFile] = useState<File | null>(null);

  const [settingsRows, setSettingsRows] = useState<PlatformSettingRow[]>([]);
  const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>({});

  const videoInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const packInputRef = useRef<HTMLInputElement>(null);
  const packVideoInputRef = useRef<HTMLInputElement>(null);
  const packPhotoInputRef = useRef<HTMLInputElement>(null);
  const packDemoInputRef = useRef<HTMLInputElement>(null);
  const libraryUploadRef = useRef<HTMLInputElement>(null);
  const previewClipInputRef = useRef<HTMLInputElement>(null);

  const isSuper = store.isSuperAdmin();

  useEffect(() => {
    void store.loadAdmin();
    void store.loadCategories().then(rows => setCategories(rows.map(r => ({ id: r.id, name: r.name }))));
    return store.subscribe(() => {
      setVideos(store.getVideos());
      setPacks(store.getPacks());
      setUploads(store.getUploads());
      setStats(store.getAdminStats());
      setStatus(store.getStatusMessage());
    });
  }, []);

  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    setOverviewLoading(true);
    void Promise.all([store.loadOverview(overviewDays), isSuper ? store.loadAuditLogs({ limit: 8 }) : Promise.resolve(null)])
      .then(([result, logs]) => {
        if (result) setOverview(result);
        setRecentLogs(logs?.logs ?? []);
      })
      .finally(() => setOverviewLoading(false));
    // Staff cannot read the activity log, so their dashboard skips that feed instead of
    // firing a request the backend will refuse.
  }, [activeTab, overviewDays, isSuper]);

  useEffect(() => {
    if (activeTab !== 'settings' || settingsRows.length) return;
    void store.loadPlatformSettings().then(rows => {
      setSettingsRows(rows);
      setSettingsDraft(Object.fromEntries(rows.map(r => [r.key, r.value])));
    });
  }, [activeTab, settingsRows.length]);

  const pendingTopupCount = Number(stats.pending_topups || 0);
  const storageBytes = uploads.reduce((sum, a) => sum + Number(a.size_bytes || 0), 0);
  const packBytesTotal = packFiles.reduce((sum, f) => sum + f.size, 0);
  const filledPackLinks = packLinks.filter(l => l.url.trim()).length;
  const packVideoSeconds = packVideos.reduce((sum, v) => sum + v.durationSeconds, 0);
  const packAssetBytes =
    packBytesTotal +
    packVideos.reduce((sum, v) => sum + v.file.size, 0) +
    packPhotos.reduce((sum, f) => sum + f.size, 0) +
    (packDemoVideo?.size ?? 0);

  // --- VIDEO AUTHORING ---
  const resetVideoModal = () => {
    setShowVideoModal(false);
    setVideoForm(EMPTY_VIDEO_FORM);
    setVideoFile(null);
    setPreviewFile(null);
    setPosterFile(null);
    setVideoDuration(0);
  };

  const handleVideoFile = async (file: File | null) => {
    setVideoFile(file);
    setVideoDuration(file ? await probeVideoDuration(file) : 0);
  };

  const submitVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const result = await store.publishVideo({
      ...videoForm,
      category: videoForm.category || categories[0]?.name || 'Videos',
      price: Number(videoForm.price) || 0,
      videoFile,
      videoDurationSeconds: videoDuration,
      previewFile,
      posterFile
    });
    setBusy(false);
    onToast(result.message);
    if (result.success) resetVideoModal();
  };

  // --- PACK AUTHORING ---
  const resetPackModal = () => {
    setShowPackModal(false);
    setPackForm(EMPTY_PACK_FORM);
    setPackFiles([]);
    setPackVideos([]);
    setPackPhotos([]);
    setPackDemoVideo(null);
    setPackDemoDuration(0);
    setPackLinks([]);
  };

  const addPackVideos = async (files: File[]) => {
    if (!files.length) return;
    const probed = await Promise.all(
      files.map(async file => ({ file, durationSeconds: await probeVideoDuration(file) }))
    );
    setPackVideos(prev => [...prev, ...probed]);
  };

  const submitPack = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const result = await store.publishPack({
      ...packForm,
      category: packForm.category || categories[0]?.name || 'Digital Resources',
      price: Number(packForm.price) || 0,
      files: packFiles,
      videoFiles: packVideos,
      photoFiles: packPhotos,
      demoVideoFile: packDemoVideo,
      links: packLinks
        .filter(l => l.url.trim())
        .map(l => ({
          provider: l.provider,
          url: l.url.trim(),
          label: DELIVERY_PLATFORMS.find(p => p.provider === l.provider)?.name ?? l.provider,
        })),
    });
    setBusy(false);
    onToast(result.message);
    if (result.success) resetPackModal();
  };

  const editPrice = async (itemId: string, current: number, title: string) => {
    const answer = window.prompt(`New credit price for “${title}” (0 = free):`, String(current));
    if (answer === null) return;
    const result = await store.setPrice(itemId, Number(answer));
    onToast(result.message);
  };

  const removeProduct = async (productId: number, title: string) => {
    if (!window.confirm(`Remove “${title}” from the catalogue? Existing buyers keep their access.`)) return;
    const result = await store.deleteProduct(productId);
    onToast(result.message);
  };

    /** Cover art comes from the listing's own video, read on the server. */
  const runCover = async (productId: number) => {
    setBusy(true);
    const result = await store.captureCover(productId);
    setBusy(false);
    onToast(result.message);
  };

  const openPreviewDialog = (item: { productId: number; title: string; preview?: string }) => {
    setPreviewTarget({ productId: item.productId, title: item.title, hasPreview: !!item.preview });
    setPreviewMode('trim');
    setPreviewSeconds('');
    setPreviewStart('');
    setPreviewClipFile(null);
  };

  const runPreviewAction = async () => {
    if (!previewTarget) return;
    setBusy(true);
    const result = await store.generatePreview({
      productId: previewTarget.productId,
      mode: previewMode,
      durationSeconds: previewSeconds.trim() ? Number(previewSeconds) : undefined,
      startSeconds: previewStart.trim() ? Number(previewStart) : undefined,
      file: previewMode === 'upload' ? previewClipFile : null
    });
    setBusy(false);
    onToast(result.message);
    if (result.success) setPreviewTarget(null);
  };

  const openEdit = (productId: number, kind: 'video' | 'pack') => setEditing({ productId, kind });

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const result = await store.savePlatformSettings(settingsDraft);
    setBusy(false);
    onToast(result.message);
  };

  const tabs: { id: PanelTab; label: string; icon: typeof Film; badge?: number; ownerOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'videos', label: 'Videos', icon: Film, badge: videos.length },
    { id: 'packs', label: 'Packs', icon: Package, badge: packs.length },
    { id: 'users', label: 'Users', icon: UserRound, badge: Number(stats.total_users || 0) },
    { id: 'payments', label: 'Payments', icon: Coins, badge: pendingTopupCount },
    { id: 'coupons', label: 'Coupons', icon: Ticket },
    { id: 'categories', label: 'Categories', icon: Tags, badge: categories.length },
    { id: 'files', label: 'Media library', icon: FolderOpen, badge: uploads.length },
    { id: 'settings', label: 'Settings', icon: Settings2 },
    { id: 'audit', label: 'Activity log', icon: ScrollText, ownerOnly: true }
  ];

  const nav = tabs.filter(tab => !tab.ownerOnly || isSuper);
  const activeLabel = tabs.find(tab => tab.id === activeTab)?.label ?? 'Dashboard';

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6">
        <aside className="lg:w-56 xl:w-64 lg:shrink-0">
          <div className="rounded-2xl border border-white/10 bg-[#121422] p-3 lg:sticky lg:top-24">
            <div className="px-2 pb-3">
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded uppercase tracking-wider">
                {isSuper ? 'OWNER PORTAL' : 'STAFF PORTAL'}
              </span>
              <h1 className="font-display font-black text-2xl text-white tracking-tight mt-2">Control Panel</h1>
              <p className="text-slate-500 text-[11px] mt-1">Every action here writes to the live database.</p>
            </div>

            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
              {nav.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 lg:w-full px-3 py-2 rounded-xl font-semibold text-xs transition-colors flex items-center gap-2 text-left ${
                      active ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate">{tab.label}</span>
                    {tab.badge ? (
                      <span
                        className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ${
                          active ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    ) : null}
                    {!active && tab.id === 'payments' && pendingTopupCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-w-0 space-y-6">
          <div className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-3">
            <h2 className="font-bold text-white text-xl sm:text-2xl">{activeLabel}</h2>
            {(activeTab === 'videos' || activeTab === 'packs') && (
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Files upload to the server first; nothing publishes until the listing points at the hosted URL.
              </p>
            )}
          </div>

      {status && (
        <div className="text-xs text-purple-200 bg-purple-600/15 border border-purple-500/25 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          {status}
        </div>
      )}

      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          {pendingTopupCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-amber-200">
                <span className="font-bold">{pendingTopupCount} payment reference(s)</span> are waiting for verification.
                Credits stay out of buyer wallets until you approve them.
              </div>
              <button
                onClick={() => setActiveTab('payments')}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1.5 rounded-lg text-xs"
              >
                Open review queue
              </button>
            </div>
          )}

          <DashboardPanel
            overview={overview}
            logs={recentLogs}
            loading={overviewLoading}
            onDays={setOverviewDays}
            onGo={tab => {
              setActiveTab(tab as PanelTab);
              if (tab === 'videos') setShowVideoModal(true);
              if (tab === 'packs') setShowPackModal(true);
            }}
          />
        </div>
      )}

      {/* VIDEOS */}
      {activeTab === 'videos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <h3 className="font-bold text-white text-base">Streamable catalogue ({videos.length})</h3>
            <button
              onClick={() => setShowVideoModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add video
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121422] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b0c16] text-slate-400 border-b border-white/10 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Title</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Runtime</th>
                    <th className="p-3">Lessons</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {videos.map(v => (
                    <tr key={v.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-semibold text-white max-w-xs truncate">{v.title}</td>
                      <td className="p-3 text-purple-300">{v.category}</td>
                      <td className="p-3 font-mono">{v.durationSeconds > 0 ? v.duration : 'Player reads it'}</td>
                      <td className="p-3 font-mono">{v.lessonCount}</td>
                      <td className="p-3">
                        {v.isFree ? (
                          <span className="text-emerald-400 font-bold">FREE</span>
                        ) : (
                          <span className="text-purple-300 font-bold">{v.creditPrice} CR</span>
                        )}
                      </td>
                      <td className="p-3 text-[10px] font-bold uppercase text-slate-400">{v.status}</td>
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => openEdit(v.productId, 'video')}
                          className="text-slate-400 hover:text-white p-1 font-semibold inline-flex items-center gap-1"
                          title="Edit title, description, price or visibility"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => void runCover(v.productId)}
                          className="text-slate-400 hover:text-white p-1 font-semibold"
                          title="Take the cover from this video"
                        >
                          Cover
                        </button>
                        <button
                          onClick={() => openPreviewDialog({ productId: v.productId, title: v.title, preview: v.previewUrl })}
                          className="text-slate-400 hover:text-white p-1 font-semibold"
                          title="Choose the clip buyers watch before paying"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => void editPrice(v.id, v.creditPrice, v.title)}
                          className="text-purple-400 hover:text-purple-300 p-1 font-semibold"
                        >
                          Price
                        </button>
                        <button
                          onClick={() => void removeProduct(v.productId, v.title)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                          title="Remove from catalogue"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {videos.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        No streamable products yet — publish one to see it here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PACKS */}
      {activeTab === 'packs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <h3 className="font-bold text-white text-base">Marketplace packs ({packs.length})</h3>
            <button
              onClick={() => setShowPackModal(true)}
              className="bg-pink-600 hover:bg-pink-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add pack
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121422] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b0c16] text-slate-400 border-b border-white/10 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Title</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Files</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Sales</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {packs.map(p => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-semibold text-white max-w-xs truncate">{p.title}</td>
                      <td className="p-3 text-purple-300">{p.category}</td>
                      <td className="p-3 font-mono">
                        {p.fileCount} file{p.fileCount === 1 ? '' : 's'}
                        {p.totalBytes > 0 && <span className="text-slate-500"> · {humanBytes(p.totalBytes)}</span>}
                      </td>
                      <td className="p-3 font-bold text-purple-300">{p.creditPrice} CR</td>
                      <td className="p-3 font-mono">{p.salesCount}</td>
                      <td className="p-3 text-[10px] font-bold uppercase text-slate-400">{p.status}</td>
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => openEdit(p.productId, 'pack')}
                          className="text-slate-400 hover:text-white p-1 font-semibold inline-flex items-center gap-1"
                          title="Edit title, description, price or visibility"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => void runCover(p.productId)}
                          className="text-slate-400 hover:text-white p-1 font-semibold"
                          title="Take the cover from this pack's video"
                        >
                          Cover
                        </button>
                        <button
                          onClick={() => openPreviewDialog({ productId: p.productId, title: p.title, preview: p.demoUrl })}
                          className="text-slate-400 hover:text-white p-1 font-semibold"
                          title="Choose the clip buyers watch before paying"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => void editPrice(p.id, p.creditPrice, p.title)}
                          className="text-purple-400 hover:text-purple-300 p-1 font-semibold"
                        >
                          Price
                        </button>
                        <button
                          onClick={() => void removeProduct(p.productId, p.title)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                          title="Remove from catalogue"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {packs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        No packs published yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* USERS */}
      {activeTab === 'users' && <UsersPanel isSuper={isSuper} onToast={onToast} onChanged={() => void store.loadAdmin()} />}

      {/* PAYMENTS */}
      {activeTab === 'payments' && <PaymentsPanel isSuper={isSuper} onToast={onToast} />}

      {/* COUPONS */}
      {activeTab === 'coupons' && <CouponsPanel onToast={onToast} />}

      {/* CATEGORIES */}
      {activeTab === 'categories' && (
        <CategoriesPanel
          onToast={message => {
            onToast(message);
            void store.loadCategories().then(rows => setCategories(rows.map(r => ({ id: r.id, name: r.name }))));
          }}
        />
      )}

      {/* ACTIVITY LOG */}
      {activeTab === 'audit' && <AuditPanel isSuper={isSuper} />}

      {/* FILES */}
      {activeTab === 'files' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold text-white text-base">
              Server media library ({uploads.length} files · {humanBytes(storageBytes)})
            </h3>
            <button
              onClick={() => libraryUploadRef.current?.click()}
              className="bg-white/10 hover:bg-white/15 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload a file
            </button>
            <input
              ref={libraryUploadRef}
              type="file"
              multiple
              className="hidden"
              onChange={async e => {
                const chosen = Array.from(e.target.files ?? []);
                for (const file of chosen) {
                  const isArchive = /\.(zip|rar|7z|tar|gz)$/i.test(file.name);
                  await store.uploadFile(file, /\.(png|jpe?g|webp|gif)$/i.test(file.name) ? 'IMAGE' : isArchive ? 'ARCHIVE' : 'OTHER', null);
                }
                e.target.value = '';
                if (chosen.length) onToast(`${chosen.length} file(s) uploaded to the server.`);
              }}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121422] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b0c16] text-slate-400 border-b border-white/10 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">File</th>
                    <th className="p-3">Kind</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Attached to</th>
                    <th className="p-3">Uploaded</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {uploads.map(a => (
                    <tr key={a.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-semibold text-white max-w-xs truncate">
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-purple-300">
                          {a.file_name}
                          <ExternalLink className="w-3 h-3 shrink-0 text-slate-500" />
                        </a>
                      </td>
                      <td className="p-3 font-mono text-[10px] uppercase">{a.kind}</td>
                      <td className="p-3 font-mono">{humanBytes(a.size_bytes)}</td>
                      <td className="p-3 text-slate-400">{a.product_title ?? (a.product_id ? `product #${a.product_id}` : 'unattached')}</td>
                      <td className="p-3 text-slate-400">{new Date(a.created_at ?? '').toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Delete ${a.file_name} from disk? Products referencing it will break.`)) return;
                            const result = await store.deleteUpload(a.id);
                            onToast(result.message);
                          }}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {uploads.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        Nothing uploaded to the server yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-white text-base">Platform settings</h3>
            <p className="text-xs text-slate-400">
              These values feed the support links, top-up notice and storefront copy. Leave a field empty to hide that
              channel from customers.
            </p>
          </div>

          <form onSubmit={saveSettings} className="p-6 rounded-2xl bg-[#141626] border border-white/10 space-y-4 max-w-2xl">
            {settingsRows.map(row => (
              <div key={row.key}>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{row.label ?? row.key}</label>
                {row.key === 'catalogue_section_size' ? (
                  <select
                    value={settingsDraft[row.key] ?? '10'}
                    onChange={e => setSettingsDraft(prev => ({ ...prev, [row.key]: e.target.value }))}
                    className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-xs text-white"
                  >
                    {[8, 10, 12, 16, 20, 24, 30, 40].map(n => (
                      <option key={n} value={String(n)}>{n} cards, then Load More</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={settingsDraft[row.key] ?? ''}
                    onChange={e => setSettingsDraft(prev => ({ ...prev, [row.key]: e.target.value }))}
                    className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-xs text-white"
                  />
                )}
                {row.description && <p className="text-[10px] text-slate-500 mt-1">{row.description}</p>}
              </div>
            ))}
            <button
              type="submit"
              disabled={busy || settingsRows.length === 0}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-colors"
            >
              Save settings
            </button>
          </form>

          <p className="text-[11px] text-slate-500 max-w-2xl">
            Catalogue tags have their own{' '}
            <button onClick={() => setActiveTab('categories')} className="font-bold text-purple-300 hover:underline">
              Categories
            </button>{' '}
            tab, where you can rename, hide, delete or restore them.
          </p>
        </div>
      )}

        </main>
      </div>

      {editing && (
        <ListingEditModal
          productId={editing.productId}
          kind={editing.kind}
          categories={categories}
          onClose={() => setEditing(null)}
          onToast={onToast}
        />
      )}

      {/* VIDEO MODAL */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121424] border border-white/15 rounded-3xl p-6 w-full max-w-xl space-y-4 my-auto">
            <h3 className="font-bold text-white text-base">Publish a video listing</h3>
            <form onSubmit={submitVideo} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Video file on your device *</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Choose video
                  </button>
                  <span className="text-slate-400">
                    {videoFile ? `${videoFile.name} · ${humanBytes(videoFile.size)}` : 'mp4, webm or mov'}
                  </span>
                </div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={e => void handleVideoFile(e.target.files?.[0] ?? null)}
                />
                {videoDuration > 0 && (
                  <p className="text-[10px] text-emerald-400 mt-1">
                    Runtime read from the file: {formatDuration(videoDuration)}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <button
                    type="button"
                    onClick={() => previewInputRef.current?.click()}
                    className="bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                  >
                    Free preview clip
                  </button>
                  <span className="text-slate-500">{previewFile ? previewFile.name : 'optional — teaser for non-buyers'}</span>
                  <input
                    ref={previewInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={e => setPreviewFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <button
                    type="button"
                    onClick={() => posterInputRef.current?.click()}
                    className="bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                  >
                    Cover image
                  </button>
                  <span className="text-slate-500">{posterFile ? posterFile.name : 'optional poster'}</span>
                  <input
                    ref={posterInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => setPosterFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>

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
                  value={videoForm.description}
                  onChange={e => setVideoForm({ ...videoForm, description: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <select
                    value={videoForm.category || categories[0]?.name || ''}
                    onChange={e => setVideoForm({ ...videoForm, category: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Access window</label>
                  <select
                    value={videoForm.access_duration_type}
                    onChange={e => setVideoForm({ ...videoForm, access_duration_type: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  >
                    {DURATIONS.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Price (credits)</label>
                  <input
                    type="number"
                    min="0"
                    value={videoForm.price}
                    onChange={e => setVideoForm({ ...videoForm, price: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Visibility</label>
                  <select
                    value={videoForm.status}
                    onChange={e => setVideoForm({ ...videoForm, status: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft (hidden)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Tags</label>
                  <input
                    type="text"
                    placeholder="4K, Featured"
                    value={videoForm.tags}
                    onChange={e => setVideoForm({ ...videoForm, tags: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-500">
                The file uploads first, then the listing is created pointing at the hosted URL. Nothing is published
                until both succeed.
              </p>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetVideoModal} className="flex-1 bg-white/10 text-white py-2 rounded-xl">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-2 rounded-xl"
                >
                  {busy ? 'Uploading & publishing…' : 'Upload & publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PACK MODAL */}
      {showPackModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121424] border border-white/15 rounded-3xl p-6 w-full max-w-xl space-y-4 my-auto">
            <h3 className="font-bold text-white text-base">Publish a pack</h3>
            <p className="text-[11px] text-slate-400 -mt-2">
              Sell downloads, delivery links (Telegram, WhatsApp, MEGA, Drive), in-pack videos that play on this site,
              or any mix. Add a demo video and preview photos so shoppers can see what they are paying for.
            </p>
            <form onSubmit={submitPack} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Files buyers download</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => packInputRef.current?.click()}
                    className="bg-pink-600 hover:bg-pink-500 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Choose files
                  </button>
                  <input
                    ref={packInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={e => {
                      const chosen = Array.from(e.target.files ?? []);
                      setPackFiles(prev => (prev.length ? [...prev, ...chosen] : chosen));
                      e.target.value = '';
                    }}
                  />
                  <span className="text-slate-400">
                    {packFiles.length ? `${packFiles.length} selected · ${humanBytes(packBytesTotal)}` : 'zip, rar, 7z, pdf…'}
                  </span>
                </div>
                {packFiles.length > 0 && (
                  <ul className="mt-2 space-y-1 max-h-28 overflow-y-auto pr-1">
                    {packFiles.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 text-[11px] text-slate-300 bg-black/30 rounded-lg px-2.5 py-1.5">
                        <span className="truncate">{f.name}</span>
                        <span className="font-mono text-slate-500 shrink-0">{humanBytes(f.size)}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${f.name}`}
                          onClick={() => setPackFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-slate-500 hover:text-rose-400 shrink-0"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Delivery links</label>
                <div className="space-y-2">
                  {packLinks.map((row, i) => {
                    const meta = DELIVERY_PLATFORMS.find(i2 => i2.provider === row.provider) ?? DELIVERY_PLATFORMS[DELIVERY_PLATFORMS.length - 1];
                    return (
                      <div key={i} className="flex items-center gap-1.5">
                        <select
                          value={row.provider}
                          aria-label={`Link ${i + 1} platform`}
                          onChange={e => setPackLinks(prev => prev.map((r, idx) => (idx === i ? { ...r, provider: e.target.value } : r)))}
                          className="bg-black/40 border border-white/10 text-white rounded-lg px-2 py-1.5 text-[11px] shrink-0 focus:outline-none focus:border-purple-500"
                        >
                          {DELIVERY_PLATFORMS.map(p => (
                            <option key={p.provider} value={p.provider}>{p.name}</option>
                          ))}
                        </select>
                        <input
                          value={row.url}
                          aria-label={`Link ${i + 1} address`}
                          onChange={e => setPackLinks(prev => prev.map((r, idx) => (idx === i ? { ...r, url: e.target.value } : r)))}
                          placeholder={meta.placeholder}
                          className="flex-1 min-w-0 bg-black/40 border border-white/10 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
                        />
                        <button
                          type="button"
                          aria-label={`Remove link ${i + 1}`}
                          onClick={() => setPackLinks(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-slate-500 hover:text-rose-400 shrink-0"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPackLinks(prev => [...prev, { provider: 'TELEGRAM', url: '' }])}
                      className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add link
                    </button>
                    <span className="text-slate-400">
                      {filledPackLinks
                        ? `Buyers get these after unlocking, and the pack shows under ${Array.from(new Set(packLinks.filter(l => l.url.trim()).map(l => DELIVERY_PLATFORMS.find(p => p.provider === l.provider)?.name ?? l.provider))).join(' / ')}.`
                        : 'Telegram invites, WhatsApp groups, MEGA or Drive folders. Leave empty if the pack only ships files.'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Videos buyers watch in-site</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => packVideoInputRef.current?.click()}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    <Film className="w-3.5 h-3.5" />
                    Add videos
                  </button>
                  <input
                    ref={packVideoInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    className="hidden"
                    onChange={async e => {
                      await addPackVideos(Array.from(e.target.files ?? []));
                      e.target.value = '';
                    }}
                  />
                  <span className="text-slate-400">
                    {packVideos.length
                      ? `${packVideos.length} clip(s) · ${formatDuration(packVideoSeconds)} total`
                      : 'A pack with videos shows up under the Video Packs tab.'}
                  </span>
                </div>
                {packVideos.length > 0 && (
                  <ul className="mt-2 space-y-1 max-h-28 overflow-y-auto pr-1">
                    {packVideos.map((v, i) => (
                      <li key={`${v.file.name}-${i}`} className="flex items-center justify-between gap-2 text-[11px] text-slate-300 bg-black/30 rounded-lg px-2.5 py-1.5">
                        <span className="truncate">{v.file.name}</span>
                        <span className="font-mono text-slate-500 shrink-0">
                          {v.durationSeconds ? formatDuration(v.durationSeconds) : 'runtime unknown'} · {humanBytes(v.file.size)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${v.file.name}`}
                          onClick={() => setPackVideos(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-slate-500 hover:text-rose-400 shrink-0"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Master demo video</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => packDemoInputRef.current?.click()}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    {packDemoVideo ? 'Replace demo' : 'Choose demo video'}
                  </button>
                  <input
                    ref={packDemoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={async e => {
                      const file = (e.target.files ?? [])[0] ?? null;
                      setPackDemoVideo(file);
                      if (file) setPackDemoDuration(await probeVideoDuration(file));
                      e.target.value = '';
                    }}
                  />
                  <span className="text-slate-400">
                    {packDemoVideo
                      ? `${packDemoVideo.name} · ${packDemoDuration ? formatDuration(packDemoDuration) : 'runtime unknown'}`
                      : 'Plays free, before payment, so shoppers see what is inside.'}
                  </span>
                  {packDemoVideo && (
                    <button
                      type="button"
                      aria-label="Remove master demo"
                      onClick={() => setPackDemoVideo(null)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Demo photos of the contents</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => packPhotoInputRef.current?.click()}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    <PhotoIcon className="w-3.5 h-3.5" />
                    Add photos
                  </button>
                  <input
                    ref={packPhotoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => {
                      // Snapshot the FileList first: this input is cleared below, and a lazy state
                      // updater would otherwise read an empty list at render time.
                      const chosen = Array.from(e.target.files ?? []);
                      setPackPhotos(prev => [...prev, ...chosen]);
                      e.target.value = '';
                    }}
                  />
                  <span className="text-slate-400">
                    {packPhotos.length ? `${packPhotos.length} preview(s) · ${humanBytes(packPhotos.reduce((s, f) => s + f.size, 0))}` : 'Scrollable strip on the pack page, visible without buying.'}
                  </span>
                </div>
                {packPhotos.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {packPhotos.map((f, i) => (
                      <div key={`${f.name}-${i}`} className="relative shrink-0 w-20 h-14 rounded-lg overflow-hidden border border-white/10">
                        <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          aria-label={`Remove ${f.name}`}
                          onClick={() => setPackPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5 text-slate-300 hover:text-rose-400"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. VIP Archive Bundle"
                  value={packForm.title}
                  onChange={e => setPackForm({ ...packForm, title: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  value={packForm.description}
                  onChange={e => setPackForm({ ...packForm, description: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <select
                    value={packForm.category || categories[0]?.name || ''}
                    onChange={e => setPackForm({ ...packForm, category: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Access window</label>
                  <select
                    value={packForm.access_duration_type}
                    onChange={e => setPackForm({ ...packForm, access_duration_type: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  >
                    {DURATIONS.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Data size buyers see</label>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="e.g. 9 GB"
                    value={packForm.sizeLabel}
                    onChange={e => setPackForm({ ...packForm, sizeLabel: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Contents buyers see</label>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="e.g. 1100+ videos"
                    value={packForm.contentsLabel}
                    onChange={e => setPackForm({ ...packForm, contentsLabel: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Price (credits)</label>
                  <input
                    type="number"
                    min="0"
                    value={packForm.price}
                    onChange={e => setPackForm({ ...packForm, price: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Visibility</label>
                  <select
                    value={packForm.status}
                    onChange={e => setPackForm({ ...packForm, status: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft (hidden)</option>
                  </select>
                </div>
              </div>

              <p className="text-[10px] text-slate-500">
                Every asset is uploaded to this server before the pack is created; nothing is published if an upload
                fails. Downloadable files and in-pack videos stay premium-only, so no address reaches a shopper who has
                not paid. The demo video and preview photos are the only parts a guest can open. Sizes and runtimes are
                measured from the real files, never typed in.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetPackModal}
                  className="flex-1 bg-white/10 text-white py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || (packFiles.length === 0 && packVideos.length === 0 && filledPackLinks === 0)}
                  className="flex-1 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-bold py-2 rounded-xl"
                >
                  {busy
                    ? `Uploading ${packAssetBytes ? `${humanBytes(packAssetBytes)}…` : '…'}`
                    : 'Upload & publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121424] border border-white/15 rounded-3xl p-6 w-full max-w-md space-y-4 my-auto">
            <h3 className="font-bold text-white text-base">Preview for “{previewTarget.title}”</h3>
            <p className="text-[11px] text-slate-400 -mt-2">
              The preview is what plays free, before a shopper spends credits. {previewTarget.hasPreview
                ? 'This listing already has one; whatever you pick here replaces it.'
                : 'This listing has none, so shoppers only see the cover and the description.'}
            </p>

            <div className="space-y-2 text-xs">
              {(
                [
                  { id: 'trim', name: 'Cut one from the paid video', hint: 'The server trims the first seconds of the real file with ffmpeg. Nothing is faked: if the server cannot cut video, it tells you.' },
                  { id: 'upload', name: 'Use my own clip', hint: 'Attach any short video you have already prepared.' },
                  { id: 'none', name: 'No preview', hint: 'Leave the listing fully locked until someone pays.' }
                ] as const
              ).map(option => (
                <label key={option.id} className={`flex items-start gap-2 border rounded-xl p-3 cursor-pointer ${previewMode === option.id ? 'border-purple-500 bg-purple-950/30' : 'border-white/10 bg-[#0b0c16]'}`}>
                  <input
                    type="radio"
                    name="preview-mode"
                    checked={previewMode === option.id}
                    onChange={() => setPreviewMode(option.id)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-bold text-white">{option.name}</span>
                    <span className="block text-[11px] text-slate-400">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            {previewMode === 'trim' && (
              <div className="flex gap-2 text-xs">
                <label className="flex-1">
                  <span className="block text-slate-400 mb-1">Length (seconds)</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={previewSeconds}
                    onChange={e => setPreviewSeconds(e.target.value)}
                    placeholder="20"
                    className="w-full bg-[#0b0c16] border border-white/10 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
                  />
                </label>
                <label className="flex-1">
                  <span className="block text-slate-400 mb-1">Start at (seconds)</span>
                  <input
                    type="number"
                    min={0}
                    value={previewStart}
                    onChange={e => setPreviewStart(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#0b0c16] border border-white/10 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
                  />
                </label>
              </div>
            )}
            {previewMode === 'trim' && (
              <p className="text-[11px] text-slate-500">
                Leaving the length empty uses the Auto-Preview Length in Platform Settings.
              </p>
            )}

            {previewMode === 'upload' && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => previewClipInputRef.current?.click()}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
                >
                  <Film className="w-3.5 h-3.5" />
                  Choose clip
                </button>
                <input
                  ref={previewClipInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={e => {
                    const chosen = e.target.files?.[0] ?? null;
                    setPreviewClipFile(chosen);
                    e.target.value = '';
                  }}
                />
                <span className="text-slate-400">
                  {previewClipFile ? `${previewClipFile.name} · ${humanBytes(previewClipFile.size)}` : 'mp4, webm, mov…'}
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPreviewTarget(null)}
                className="flex-1 bg-white/10 text-white py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void runPreviewAction()}
                disabled={busy || (previewMode === 'upload' && !previewClipFile) || previewMode === 'none'}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-2 rounded-xl"
              >
                {previewMode === 'none'
                  ? 'Remove preview'
                  : previewMode === 'upload'
                    ? 'Attach preview'
                    : busy
                      ? 'Cutting…'
                      : 'Cut preview'}
              </button>
            </div>
            {previewMode === 'none' && (
              <p className="text-[11px] text-slate-400">
                Press “Remove preview” to lock this listing completely.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
