import { api } from './api';
import type {
  AdminCouponRow,
  AdminOverview,
  AdminProductPayload,
  AdminUserRow,
  ApiFailure,
  ContentAccess,
  MediaAsset,
  MediaRow,
  PaymentProvider,
  PlatformSettingRow,
  ProductRow,
  SessionUser,
  SupportChannelsPublic,
  TopupRow,
  Wallet,
} from './api';
import {
  GUEST_USER,
  applyPackAccess,
  applyPackPreview,
  applyStreamAccess,
  isPackProduct,
  isVideoProduct,
  toNotification,
  toPack,
  toTransaction,
  toUser,
  toVideo,
} from './mappers';
import type { DigitalPack, NotificationItem, PackVideo, Transaction, User, Video } from '../types';

/**
 * This store holds no data of its own any more. It caches what the Desi Ero API returns
 * and forwards every mutation to a route. The getters stay synchronous so the existing
 * components do not all need to await, but they are only populated once bootstrap() resolves.
 */

export interface ActionResult {
  success: boolean;
  message: string;
  balance?: number;
}

function describeError(err: unknown): string {
  const failure = err as ApiFailure;
  switch (failure?.code) {
    case 'UNAUTHORIZED':
      return 'Please sign in to continue.';
    case 'INSUFFICIENT_CREDITS': {
      const required = failure.payload?.required_credits;
      const current = failure.payload?.current_balance;
      return required === undefined
        ? 'Not enough credits in your wallet.'
        : `Not enough credits: this costs ${required} and your wallet holds ${current}.`;
    }
    case 'NO_ACTIVE_PURCHASE':
      return 'Unlock this item to see the delivery links.';
    case 'ACCESS_EXPIRED':
      return 'Your access to this item has expired.';
    case 'FORBIDDEN':
      return 'Your account is not allowed to do that.';
    case 'DUPLICATE_REFERENCE':
      return 'That transaction ID has already been submitted for review.';
    case 'UPLOAD_REJECTED':
    case 'UNSUPPORTED_FILE_TYPE':
      return failure.message || 'That file type cannot be uploaded.';
    default:
      return failure?.message || 'Something went wrong. Please try again.';
  }
}

class AppStore {
  private videos: Video[] = [];
  private packs: DigitalPack[] = [];
  private user: User = GUEST_USER;
  private session: SessionUser | null = null;
  private transactions: Transaction[] = [];
  private notifications: NotificationItem[] = [];
  private providers: PaymentProvider[] = [];
  private support: SupportChannelsPublic | null = null;
  /** Staff picks this in Control Panel -> Platform Settings; it caps every catalogue section. */
  private sectionSize = 10;
  private pendingTopups: TopupRow[] = [];
  private uploads: MediaAsset[] = [];
  private adminStats: Record<string, number | string> = {};
  private accessCache = new Map<number, ContentAccess>();
  private progressTimers = new Map<string, number>();
  private listeners = new Set<() => void>();

  private booted = false;
  private loading = false;
  private loginRequested = false;
  private statusMessage: string | null = null;

  // --- SUBSCRIPTION ---
  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }

  // --- SYNCHRONOUS GETTERS ---
  public getVideos(): Video[] {
    return [...this.videos];
  }

  public getPacks(): DigitalPack[] {
    return [...this.packs];
  }

  public getVideo(id: string): Video | undefined {
    return this.videos.find(v => v.id === id);
  }

  public getPack(id: string): DigitalPack | undefined {
    return this.packs.find(p => p.id === id);
  }

  public getUser(): User {
    return { ...this.user };
  }

  public getTransactions(): Transaction[] {
    return [...this.transactions];
  }

  public getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  /** Only providers with at least one usable mode are offered to a buyer. */
  public getPaymentProviders(): PaymentProvider[] {
    return this.providers.filter(p => p.modes.some(m => m.status === 'ACTIVE'));
  }

  public getSupport(): SupportChannelsPublic | null {
    return this.support;
  }

  public getSectionSize(): number {
    return this.sectionSize;
  }

  public getPendingTopups(): TopupRow[] {
    return [...this.pendingTopups];
  }

  public getUploads(): MediaAsset[] {
    return [...this.uploads];
  }

  public getAdminStats(): Record<string, number | string> {
    return { ...this.adminStats };
  }

  public isBooted(): boolean {
    return this.booted;
  }

  public isLoading(): boolean {
    return this.loading;
  }

  public isLoginRequested(): boolean {
    return this.loginRequested;
  }

  public getStatusMessage(): string | null {
    return this.statusMessage;
  }

  public isAuthenticated(): boolean {
    return this.session !== null;
  }

  public isAdmin(): boolean {
    return this.user.role === 'ADMIN' || this.user.role === 'SUPER_ADMIN';
  }

  public isSuperAdmin(): boolean {
    return this.user.role === 'SUPER_ADMIN';
  }

  public ownsVideo(id: string): boolean {
    return this.user.unlockedVideoIds.includes(id) || !!this.getVideo(id)?.access?.has_access;
  }

  public ownsPack(id: string): boolean {
    return this.user.unlockedPackIds.includes(id) || !!this.getPack(id)?.access?.has_access;
  }

  private async run<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
    this.loading = true;
    this.statusMessage = null;
    this.notify();
    try {
      return await fn();
    } catch (err) {
      console.error(`[store] ${label} failed`, err);
      this.statusMessage = describeError(err);
      return null;
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  private fail(): { success: false; message: string } {
    return { success: false, message: this.statusMessage ?? 'Request failed.' };
  }

  // --- BOOTSTRAP ---
  public async bootstrap(): Promise<void> {
    await Promise.all([this.refreshSession(), this.refreshCatalogue(), this.loadPaymentMethods(), this.loadSupport()]);
    this.booted = true;
    this.notify();
  }

  public async refreshCatalogue(): Promise<void> {
    // No limit: the endpoint returns the whole published catalogue when one is not asked for, so the
    // "N of M" counters on each shelf are the real totals rather than the first page.
    const result = await this.run('refreshCatalogue', () => api.catalogue.list());
    if (!result) return;
    const published = result.products.filter(p => p.status === 'PUBLISHED');
    this.videos = published.filter(isVideoProduct).map(toVideo);
    this.packs = published.filter(isPackProduct).map(toPack);
    this.notify();
  }

  public async refreshSession(): Promise<void> {
    const me = await this.run('refreshSession', () => api.auth.me());
    if (!me) return;
    if (!me.user) {
      this.session = null;
      this.user = GUEST_USER;
      this.transactions = [];
      this.notifications = [];
      this.notify();
      return;
    }
    this.session = me.user;
    await this.loadPersonal(me.wallet);
  }

  /** Wallet, ledger, notifications and library for the signed-in viewer. */
  private async loadPersonal(fallbackWallet: Wallet | null): Promise<void> {
    const [wallet, transactions, notifications, library] = await Promise.all([
      api.wallet.get().catch(() => null),
      api.wallet.transactions().catch(() => null),
      api.notifications.list().catch(() => null),
      api.library.get().catch(() => null),
    ]);
    if (!this.session) return;
    this.user = toUser(this.session, wallet?.wallet ?? fallbackWallet, { videos: this.videos, packs: this.packs }, library?.library ?? null);
    this.transactions = (transactions?.transactions ?? []).map(toTransaction);
    this.notifications = (notifications?.notifications ?? []).map(toNotification);
    this.notify();
  }

  public async loadPaymentMethods(): Promise<void> {
    const result = await this.run('loadPaymentMethods', () => api.payments.methods());
    if (!result) return;
    this.providers = result.providers;
    this.notify();
  }

  public async loadSupport(): Promise<void> {
    const result = await this.run('loadSupport', () => api.settings.public());
    if (!result) return;
    this.support = result.support;
    // A backend without the setting yet still has to paginate, just at the shipped default.
    const size = Math.round(Number(result.catalogue?.section_size));
    this.sectionSize = Number.isFinite(size) && size >= 4 ? Math.min(60, size) : 10;
    this.notify();
  }

  // --- AUTH ---
  public async login(email: string, password: string): Promise<ActionResult> {
    const result = await this.run('login', () => api.auth.login(email, password));
    if (!result?.user) return this.fail();
    this.session = result.user;
    this.loginRequested = false;
    await this.loadPersonal(result.wallet);
    await this.refreshCatalogue();
    if (this.isAdmin()) await this.loadAdmin();
    return { success: true, message: `Welcome back, ${result.user.username}.`, balance: result.wallet?.balance };
  }

  public async register(email: string, username: string, password: string): Promise<ActionResult> {
    const result = await this.run('register', () => api.auth.register(email, username, password));
    if (!result?.user) return this.fail();
    this.session = result.user;
    this.loginRequested = false;
    await this.loadPersonal(result.wallet);
    await this.refreshCatalogue();
    return { success: true, message: `Account created with ${result.wallet?.balance ?? 0} welcome credits.`, balance: result.wallet?.balance };
  }

  public async logout(): Promise<void> {
    await this.run('logout', () => api.auth.logout());
    this.session = null;
    this.user = GUEST_USER;
    this.transactions = [];
    this.notifications = [];
    this.pendingTopups = [];
    this.videos = this.videos.map(v => ({ ...v, access: null, streamUrl: null }));
    this.packs = this.packs.map(p => ({ ...p, access: null, files: [], totalBytes: 0 }));
    this.accessCache.clear();
    this.notify();
  }

  public requestLogin(): void {
    this.loginRequested = true;
    this.notify();
  }

  public clearLoginRequest(): void {
    this.loginRequested = false;
    this.notify();
  }

  // --- PURCHASES ---
  public async unlockVideo(videoId: string): Promise<ActionResult> {
    return this.purchase(videoId, 'video');
  }

  public async unlockPack(packId: string): Promise<ActionResult> {
    return this.purchase(packId, 'pack');
  }

  private async purchase(itemId: string, kind: 'video' | 'pack'): Promise<ActionResult> {
    if (!this.isAuthenticated()) {
      this.requestLogin();
      return { success: false, message: 'Sign in to unlock content.' };
    }
    const item = kind === 'video' ? this.getVideo(itemId) : this.getPack(itemId);
    if (!item) return { success: false, message: 'Item not found in the catalogue.' };
    if (item.access?.has_access) return { success: true, message: 'You already own this.', balance: this.user.walletBalance };

    const result = await this.run('purchase', () => api.catalogue.purchase(item.productId));
    if (!result) return this.fail();

    this.accessCache.delete(item.productId);
    await this.loadPersonal(null);
    await this.refreshCatalogue();
    await this.loadAccess(item.productId);
    return {
      success: true,
      message: result.message || `Unlocked for ${result.receipt.price_paid} credits.`,
      balance: result.receipt.balance_remaining,
    };
  }

  // --- AUTHORISED ACCESS: the only place premium URLs enter the app ---
  private async loadAccess(productId: number): Promise<ContentAccess | null> {
    const cached = this.accessCache.get(productId);
    if (cached) return cached;
    const access = await this.run('loadAccess', () => api.content.access(productId));
    if (!access) return null;
    this.accessCache.set(productId, access);

    if (this.videos.some(v => v.productId === productId)) {
      this.videos = this.videos.map(v => (v.productId === productId ? applyStreamAccess(v, access) : v));
    } else {
      const deliverables = access.files ?? [];
      this.packs = this.packs.map(p => (p.productId === productId ? applyPackAccess(p, access, deliverables) : p));
    }
    this.notify();
    return access;
  }

  public async getStreamUrl(
    videoId: string
  ): Promise<{ url: string | null; resumeAt: number; message: string | null }> {
    if (!this.isAuthenticated()) {
      this.requestLogin();
      return { url: null, resumeAt: 0, message: 'Sign in to watch.' };
    }
    const video = this.getVideo(videoId);
    if (!video) return { url: null, resumeAt: 0, message: 'Video not found.' };

    const access = await this.loadAccess(video.productId);
    if (!access) return { url: null, resumeAt: 0, message: this.statusMessage ?? 'No active purchase for this video.' };
    const updated = this.getVideo(videoId);
    return { url: updated?.streamUrl ?? null, resumeAt: access.saved_progress?.position_seconds ?? 0, message: null };
  }

  public async getPackFiles(
    packId: string
  ): Promise<{ files: MediaRow[]; videos: PackVideo[]; message: string | null }> {
    if (!this.isAuthenticated()) {
      this.requestLogin();
      return { files: [], videos: [], message: 'Sign in to view delivery links.' };
    }
    const pack = this.getPack(packId);
    if (!pack) return { files: [], videos: [], message: 'Pack not found.' };

    const access = await this.loadAccess(pack.productId);
    if (!access) return { files: [], videos: [], message: this.statusMessage ?? 'No active purchase for this pack.' };
    const updated = this.getPack(packId);
    return { files: updated?.files ?? [], videos: updated?.videos ?? [], message: null };
  }

  /** Loads the public preview photos and demo clips a pack advertises. Works without signing in. */
  public async loadPackPreview(packId: string): Promise<MediaRow[]> {
    const pack = this.getPack(packId);
    if (!pack) return [];
    if (pack.previewPhotos.length || pack.previewClips.length) {
      return [...pack.previewPhotos, ...pack.previewClips];
    }
    const detail = await this.run('packPreview', () => api.catalogue.detail(pack.productId));
    if (!detail?.media) return [];
    this.packs = this.packs.map(p => (p.productId === pack.productId ? applyPackPreview(p, detail.media) : p));
    this.notify();
    const loaded = this.getPack(packId);
    return [...(loaded?.previewPhotos ?? []), ...(loaded?.previewClips ?? [])];
  }

  // --- FAVOURITES & PROGRESS ---
  public async toggleFavorite(itemId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      this.requestLogin();
      return false;
    }
    const result = await this.run('toggleFavorite', () => api.catalogue.toggleFavorite(Number(itemId)));
    if (!result) return false;

    this.videos = this.videos.map(v => (v.id === itemId ? { ...v, isFavorite: result.is_favorite } : v));
    this.packs = this.packs.map(p => (p.id === itemId ? { ...p, isFavorite: result.is_favorite } : p));
    const wasFavorite = this.user.favorites.includes(itemId);
    this.user.favorites = wasFavorite ? this.user.favorites.filter(id => id !== itemId) : [...this.user.favorites, itemId];
    this.notify();
    return !wasFavorite;
  }

  public isFavorite(itemId: string): boolean {
    return (
      this.user.favorites.includes(itemId) || !!this.getVideo(itemId)?.isFavorite || !!this.getPack(itemId)?.isFavorite
    );
  }

  /** Server-side resume state, debounced so scrubbing does not spam the API. */
  public saveWatchProgress(videoId: string, progressSeconds: number, durationSeconds: number): void {
    if (!this.isAuthenticated()) return;
    const existing = this.progressTimers.get(videoId);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      this.progressTimers.delete(videoId);
      api.content
        .saveProgress({
          product_id: Number(videoId),
          position_seconds: Math.floor(progressSeconds),
          duration_seconds: Number.isFinite(durationSeconds) ? Math.floor(durationSeconds) : 0,
        })
        .catch(err => console.warn('[store] progress save failed', err));
    }, 4000);
    this.progressTimers.set(videoId, timer);
  }

  // --- WALLET ---
  /** Submits a top-up for review. Credits appear only after a super admin approves it. */
  public async requestTopUp(input: {
    method: string;
    credits: number;
    reference_id: string;
    sender_info?: string;
    notes?: string;
    extra?: Record<string, string>;
  }): Promise<ActionResult & { topupId?: number }> {
    if (!this.isAuthenticated()) {
      this.requestLogin();
      return { success: false, message: 'Sign in to add credits.' };
    }
    const body = {
      method: input.method,
      credits: input.credits,
      reference_id: input.reference_id,
      sender_info: input.sender_info,
      notes: input.notes,
      ...(input.extra ?? {}),
    };
    const result = await this.run('requestTopUp', () => api.wallet.requestTopUp(body));
    if (!result) return this.fail();
    await this.loadPersonal(null);
    return { success: true, message: result.message || `Top-up ${input.reference_id} is pending review.`, topupId: result.topup_id };
  }

  public async validateCoupon(code: string, amount?: number): Promise<ActionResult & { bonusCredits?: number }> {
    const result = await this.run('validateCoupon', () => api.wallet.validateCoupon(code, amount));
    if (!result) return this.fail();
    return { success: true, message: 'Coupon accepted.', bonusCredits: result.coupon.discount_credits };
  }

  public async markAllNotificationsRead(): Promise<void> {
    await this.run('markAllRead', () => api.notifications.markAllRead());
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    this.notify();
  }

  public async submitReview(itemId: string, rating: number, comment: string): Promise<ActionResult> {
    const result = await this.run('submitReview', () => api.catalogue.submitReview(Number(itemId), rating, comment));
    if (!result) return this.fail();
    return { success: true, message: result.message || 'Review saved.' };
  }

  // --- ADMIN ---
  public async loadAdmin(): Promise<void> {
    if (!this.isAdmin()) return;
    const [stats, topups, uploads] = await Promise.all([
      api.admin.stats().catch(() => null),
      api.admin.topups().catch(() => null),
      api.admin.uploads().catch(() => null),
    ]);
    if (stats) this.adminStats = stats.stats;
    if (topups) this.pendingTopups = topups.topups;
    if (uploads) this.uploads = uploads.assets;
    this.notify();
  }

  public async uploadFile(file: File, kind: string, productId: number | null, onProgress?: (percent: number) => void): Promise<MediaAsset | null> {
    this.statusMessage = `Uploading ${file.name}…`;
    this.notify();
    const asset = await this.run('upload', () => api.admin.upload(file, kind, productId, percent => {
      this.statusMessage = `Uploading ${file.name}… ${percent}%`;
      this.notify();
    }));
    this.statusMessage = null;
    this.notify();
    if (asset) await this.loadAdmin();
    return asset;
  }

  /** Creates (or extends) a streamable product from an actual uploaded file. */
  public async publishVideo(form: {
    title: string;
    description: string;
    category: string;
    price: number;
    status?: string;
    access_duration_type?: string;
    demo_url?: string;
    thumbnail?: string;
    tags?: string;
    videoFile?: File | null;
    videoDurationSeconds?: number;
    previewFile?: File | null;
    posterFile?: File | null;
    attachToProductId?: number;
  }): Promise<ActionResult & { productId?: number }> {
    if (!form.title.trim()) return { success: false, message: 'A title is required.' };

    let streamUrl: string | null = null;
    if (form.videoFile) {
      const asset = await this.uploadFile(form.videoFile, 'VIDEO', form.attachToProductId ?? null);
      if (!asset) return this.fail();
      streamUrl = asset.url;
    }
    if (form.previewFile) {
      const asset = await this.uploadFile(form.previewFile, 'VIDEO', form.attachToProductId ?? null);
      if (!asset) return this.fail();
      form = { ...form, demo_url: asset.url };
    }
    if (form.posterFile) {
      const asset = await this.uploadFile(form.posterFile, 'IMAGE', form.attachToProductId ?? null);
      if (!asset) return this.fail();
      form = { ...form, thumbnail: asset.url };
    }
    if (!streamUrl && !form.demo_url) {
      return { success: false, message: 'Attach the video file you want viewers to watch.' };
    }

    const payload: AdminProductPayload = {
      title: form.title.trim(),
      description: form.description,
      price: Number(form.price) || 0,
      category: form.category,
      thumbnail: form.thumbnail || undefined,
      tags: form.tags,
      status: form.status ?? 'PUBLISHED',
      access_duration_type: form.access_duration_type ?? 'LIFETIME',
      demo_type: form.demo_url ? 'VIDEO' : undefined,
      demo_url: form.demo_url || undefined,
      premium_type: 'VIDEO',
      premium_resource_url: streamUrl ?? undefined,
      rights_confirmed: true,
      lessons: streamUrl
        ? [
            {
              title: form.title.trim(),
              video_url: streamUrl,
              video_provider: 'UPLOAD',
              is_free_preview: 0,
              duration_seconds: Math.floor(Number(form.videoDurationSeconds) || 0) || 600
            }
          ]
        : undefined,
    };

    const result = form.attachToProductId
      ? await this.run('updateProduct', () => api.admin.updateProduct(form.attachToProductId!, payload))
      : await this.run('createProduct', () => api.admin.createProduct(payload));
    if (!result) return this.fail();

    const productId = result.product_id;
    await this.refreshCatalogue();
    return { success: true, message: `“${payload.title}” is live.`, productId };
  }

  /**
   * Creates a marketplace pack. Everything the buyer can see before paying (preview photos,
   * the master demo clip) is written as DEMO access media; the paid content is written as
   * lessons (videos that play in the site) and files (downloads), and only ever reaches a
   * browser through /api/content/:id/access.
   */
  public async publishPack(form: {
    title: string;
    description: string;
    category: string;
    price: number;
    status?: string;
    access_duration_type?: string;
    files?: File[];
    videoFiles?: { file: File; durationSeconds: number }[];
    photoFiles?: File[];
    demoVideoFile?: File | null;
    links?: { provider: string; url: string; label: string }[];
    /** Headline text the owner writes himself: "9 GB", "1100+ videos". */
    sizeLabel?: string;
    contentsLabel?: string;
    attachToProductId?: number;
  }): Promise<ActionResult & { productId?: number }> {
    if (!form.title.trim()) return { success: false, message: 'A title is required.' };
    const chosen = form.files ?? [];
    const videos = form.videoFiles ?? [];
    const photos = form.photoFiles ?? [];
    const links = (form.links ?? [])
      .map(l => ({ provider: String(l.provider ?? '').trim(), url: String(l.url ?? '').trim(), label: String(l.label ?? '').trim() }))
      .filter(l => l.url.length > 0);
    if (chosen.length === 0 && videos.length === 0 && links.length === 0) {
      return { success: false, message: 'Attach at least one file, video or delivery link to sell.' };
    }
    const badLink = links.find(l => !/^https?:\/\/.+\..+/i.test(l.url) && !l.url.startsWith('tg://'));
    if (badLink) return { success: false, message: `“${badLink.url}” is not a full https:// link. Paste the complete invite or folder address.` };

    const deliverables: Record<string, unknown>[] = [];
    for (const file of chosen) {
      const isArchive = /\.(zip|rar|7z|tar|gz)$/i.test(file.name);
      const asset = await this.uploadFile(file, isArchive ? 'ARCHIVE' : 'DOCUMENT', form.attachToProductId ?? null);
      if (!asset) return this.fail();
      deliverables.push({
        url: asset.url,
        label: asset.file_name,
        caption: asset.file_name,
        media_type: 'DOWNLOAD',
        provider: 'UPLOAD',
        size_bytes: asset.size_bytes,
        access_level: 'PREMIUM',
      });
    }

    const lessons: Record<string, unknown>[] = [];
    for (let i = 0; i < videos.length; i++) {
      const { file, durationSeconds } = videos[i];
      const asset = await this.uploadFile(file, 'VIDEO', form.attachToProductId ?? null);
      if (!asset) return this.fail();
      lessons.push({
        title: file.name.replace(/\.[^.]+$/, ''),
        video_url: asset.url,
        video_provider: 'UPLOAD',
        is_free_preview: 0,
        duration_seconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? Math.floor(durationSeconds) : 0,
        sort_order: i + 1,
      });
    }

    const demo_media: Record<string, unknown>[] = [];
    for (let i = 0; i < photos.length; i++) {
      const asset = await this.uploadFile(photos[i], 'IMAGE', form.attachToProductId ?? null);
      if (!asset) return this.fail();
      demo_media.push({ url: asset.url, caption: photos[i].name, label: `Preview #${i + 1}`, sort_order: i + 1 });
    }

    let demo_url: string | undefined;
    if (form.demoVideoFile) {
      const asset = await this.uploadFile(form.demoVideoFile, 'VIDEO', form.attachToProductId ?? null);
      if (!asset) return this.fail();
      demo_url = asset.url;
    }

    const linkRows = links.map((l, i) => ({
      url: l.url,
      media_type: 'EXTERNAL_LINK',
      provider: l.provider,
      label: l.label || l.provider,
      caption: l.label || l.provider,
      size_bytes: 0,
      access_level: 'PREMIUM',
      sort_order: deliverables.length + i + 1,
    }));

    const payload: AdminProductPayload = {
      title: form.title.trim(),
      description: form.description,
      price: Number(form.price) || 0,
      category: form.category,
      status: form.status ?? 'PUBLISHED',
      access_duration_type: form.access_duration_type ?? '30_DAYS',
      premium_type: 'DIGITAL_RESOURCE',
      rights_confirmed: true,
      size_label: (form.sizeLabel ?? '').trim(),
      contents_label: (form.contentsLabel ?? '').trim(),
      demo_type: demo_url ? 'VIDEO' : undefined,
      demo_url,
      lessons: lessons.length ? lessons : undefined,
      files: deliverables.length || linkRows.length ? [...deliverables, ...linkRows] : undefined,
      demo_media: demo_media.length ? demo_media : undefined,
    };

    const result = form.attachToProductId
      ? await this.run('updatePack', () => api.admin.updateProduct(form.attachToProductId!, payload))
      : await this.run('createPack', () => api.admin.createProduct(payload));
    if (!result) return this.fail();

    await this.refreshCatalogue();
    const parts = [
      lessons.length ? `${lessons.length} in-pack video(s)` : null,
      deliverables.length ? `${deliverables.length} file(s)` : null,
      linkRows.length ? `${linkRows.length} delivery link(s)` : null,
      demo_media.length ? `${demo_media.length} preview photo(s)` : null,
      demo_url ? 'a master demo' : null,
    ].filter(Boolean);
    return {
      success: true,
      message: `“${payload.title}” published with ${parts.join(', ')}.`,
      productId: result.product_id,
    };
  }

  /**
   * Sets the clip a shopper watches before paying: cut from the paid video, an uploaded file of
   * the admin's own, or nothing at all. The server does the cutting, so a trimmed preview never
   * depends on the browser, and its reasons come back in plain words when it cannot.
   */
  public async generatePreview(form: {
    productId: number;
    mode: 'trim' | 'upload' | 'none';
    durationSeconds?: number;
    startSeconds?: number;
    file?: File | null;
  }): Promise<ActionResult> {
    if (form.mode === 'upload') {
      if (!form.file) return { success: false, message: 'Choose the preview video you want to attach.' };
      const asset = await this.uploadFile(form.file, 'VIDEO', form.productId);
      if (!asset) return this.fail();
      const attached = await this.run('attachPreview', () =>
        api.admin.setPreview(form.productId, { mode: 'upload', asset_id: asset.id })
      );
      if (!attached) return this.fail();
      await this.refreshCatalogue();
      return { success: true, message: attached.message || 'Your clip is now the preview.' };
    }

    const result = await this.run('preview', () =>
      api.admin.setPreview(form.productId, {
        mode: form.mode,
        duration_seconds: form.durationSeconds,
        start_seconds: form.startSeconds
      })
    );
    if (!result) return this.fail();
    await this.refreshCatalogue();
    return { success: true, message: result.message || 'Preview updated.' };
  }

  /** Reads a cover frame from the listing's own video, so a card never has to show stock art. */
  public async captureCover(productId: number): Promise<ActionResult> {
    const result = await this.run('cover', () => api.admin.setCover(productId, { mode: 'auto' }));
    if (!result) return this.fail();
    await this.refreshCatalogue();
    return { success: true, message: result.message || 'Cover taken from the video.' };
  }

  public async setPrice(itemId: string, price: number): Promise<ActionResult> {
    const item = this.getVideo(itemId) ?? this.getPack(itemId);
    if (!item) return { success: false, message: 'Item not found in the catalogue.' };
    const chosen = Math.max(0, Math.floor(Number(price) || 0));
    const result = await this.run('setPrice', () => api.admin.updateProduct(item.productId, { price: chosen }));
    if (!result) return this.fail();
    await this.refreshCatalogue();
    return { success: true, message: `“${item.title}” now costs ${chosen} credits.` };
  }

  public async deleteProduct(productId: number): Promise<ActionResult> {    const result = await this.run('deleteProduct', () => api.admin.deleteProduct(productId));
    if (!result) return this.fail();
    this.accessCache.delete(productId);
    await this.refreshCatalogue();
    return { success: true, message: result.message || 'Removed from the catalogue.' };
  }

  public async loadTopups(status?: string): Promise<TopupRow[]> {
    const result = await this.run('loadTopups', () => api.admin.topups(status));
    // A filtered read must not shrink the cache the sidebar badge counts from.
    if (result && !status) this.pendingTopups = result.topups;
    this.notify();
    return result?.topups ?? [];
  }

  public async approveTopup(id: number): Promise<ActionResult> {
    if (!this.isSuperAdmin()) return { success: false, message: 'Only the owner account can approve top-ups.' };
    const result = await this.run('approveTopup', () => api.admin.approveTopup(id));
    if (!result) return this.fail();
    await Promise.all([this.loadTopups(), this.loadAdmin()]);
    return { success: true, message: result.message || 'Top-up approved and credited.' };
  }

  public async rejectTopup(id: number, reason?: string): Promise<ActionResult> {
    if (!this.isSuperAdmin()) return { success: false, message: 'Only the owner account can reject top-ups.' };
    const result = await this.run('rejectTopup', () => api.admin.rejectTopup(id, reason));
    if (!result) return this.fail();
    await this.loadTopups();
    return { success: true, message: result.message || 'Top-up rejected.' };
  }

  public async deleteUpload(assetId: number): Promise<ActionResult> {
    const result = await this.run('deleteUpload', () => api.admin.deleteUpload(assetId));
    if (!result) return this.fail();
    await this.loadAdmin();
    return { success: true, message: result.message || 'File removed from disk.' };
  }

  public async loadPlatformSettings(): Promise<PlatformSettingRow[]> {
    const result = await this.run('loadPlatformSettings', () => api.admin.settings());
    return result?.settings ?? [];
  }

  public async savePlatformSettings(settings: Record<string, string>): Promise<ActionResult> {
    const result = await this.run('savePlatformSettings', () => api.admin.saveSettings(settings));
    if (!result) return this.fail();
    await this.loadSupport();
    return { success: true, message: result.message || 'Settings saved.' };
  }

  public async loadCategories(): Promise<
    { id: number; name: string; slug: string; icon?: string; product_count?: number; is_active: number }[]
  > {
    const result = await this.run('loadCategories', () => api.admin.categories());
    return result?.categories ?? [];
  }

  public async createCategory(name: string, icon?: string): Promise<ActionResult> {
    const result = await this.run('createCategory', () => api.admin.createCategory({ name, icon }));
    if (!result) return this.fail();
    return { success: true, message: `Category “${result.category.name}” added.` };
  }

  public async updateCategory(
    id: number,
    body: { name?: string; slug?: string; icon?: string; description?: string; is_active?: number; sort_order?: number }
  ): Promise<ActionResult> {
    const result = await this.run('updateCategory', () => api.admin.updateCategory(id, body));
    if (!result) return this.fail();
    return { success: true, message: result.message || 'Category saved.' };
  }

  public async deleteCategory(id: number, force = false): Promise<ActionResult> {
    const result = await this.run('deleteCategory', () => api.admin.deleteCategory(id, force));
    if (!result) return this.fail();
    return { success: true, message: result.message || 'Category deleted.' };
  }

  /** Re-adds the built-in tag set, e.g. after an admin cleaned out a test catalogue. */
  public async restoreDefaultCategories(): Promise<ActionResult> {
    const result = await this.run('restoreDefaultCategories', () => api.admin.restoreDefaultCategories());
    if (!result) return this.fail();
    await this.loadCategories();
    return { success: true, message: result.message || 'Default categories restored.' };
  }

  /** The stored row behind a listing, so the edit form starts from the database, not the card. */
  public async loadListingDetail(productId: number): Promise<ProductRow | null> {
    const result = await this.run('loadListingDetail', () => api.admin.product(productId));
    return result?.product ?? null;
  }

  /** Edits a published listing's own words and price without touching its media. */
  public async updateListing(productId: number, payload: Partial<AdminProductPayload>): Promise<ActionResult> {
    const result = await this.run('updateListing', () => api.admin.updateProduct(productId, payload));
    if (!result) return this.fail();
    await this.refreshCatalogue();
    return { success: true, message: result.message || 'Listing saved.' };
  }

  public async loadOverview(days?: number): Promise<AdminOverview | null> {
    return this.run('loadOverview', () => api.admin.overview(days));
  }

  public async loadUsers(params: { q?: string; role?: string; status?: string } = {}): Promise<AdminUserRow[]> {
    const result = await this.run('loadUsers', () => api.admin.users(params));
    return result?.users ?? [];
  }

  public async loadUserDetail(id: number) {
    return this.run('loadUserDetail', () => api.admin.userDetail(id));
  }

  public async setUserRole(id: number, role: string): Promise<ActionResult> {
    const result = await this.run('setUserRole', () => api.admin.setUserRole(id, role));
    if (!result) return this.fail();
    return { success: true, message: result.message || 'Role updated.' };
  }

  public async setUserStatus(id: number, status: string, reason?: string): Promise<ActionResult> {
    const result = await this.run('setUserStatus', () => api.admin.setUserStatus(id, status, reason));
    if (!result) return this.fail();
    return { success: true, message: result.message || 'Account updated.' };
  }

  public async adjustBalance(id: number, amount: number, reason: string): Promise<ActionResult> {
    const result = await this.run('adjustBalance', () => api.admin.adjustBalance(id, { amount, reason }));
    if (!result) return this.fail();
    return { success: true, message: result.message || 'Balance adjusted.' };
  }

  public async deleteUser(id: number): Promise<ActionResult> {
    const result = await this.run('deleteUser', () => api.admin.deleteUser(id));
    if (!result) return this.fail();
    return { success: true, message: result.message || 'Account removed.' };
  }

  public async loadPurchases(params: { q?: string; status?: string; limit?: number } = {}) {
    return this.run('loadPurchases', () => api.admin.purchases(params));
  }

  public async loadWalletTransactions(params: { q?: string; type?: string; status?: string; limit?: number } = {}) {
    return this.run('loadWalletTransactions', () => api.admin.walletTransactions(params));
  }

  public async loadCoupons(): Promise<AdminCouponRow[]> {
    const result = await this.run('loadCoupons', () => api.admin.coupons());
    return result?.coupons ?? [];
  }

  public async saveCoupon(body: Partial<AdminCouponRow>, id?: number): Promise<ActionResult> {
    const result = await this.run('saveCoupon', () => (id ? api.admin.updateCoupon(id, body) : api.admin.createCoupon(body)));
    if (!result) return this.fail();
    return { success: true, message: result.message || 'Coupon saved.' };
  }

  public async deleteCoupon(id: number): Promise<ActionResult> {
    const result = await this.run('deleteCoupon', () => api.admin.deleteCoupon(id));
    if (!result) return this.fail();
    return { success: true, message: result.message || 'Coupon deleted.' };
  }

  public async loadAuditLogs(params: { q?: string; action?: string; limit?: number } = {}) {
    return this.run('loadAuditLogs', () => api.admin.auditLogs(params));
  }
}

export const store = new AppStore();
