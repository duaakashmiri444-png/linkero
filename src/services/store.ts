import { Video, DigitalPack, User, Transaction, Review, ContentReport, NotificationItem, SEOSettings } from '../types';
import { 
  INITIAL_VIDEOS, 
  INITIAL_PACKS, 
  INITIAL_USER, 
  INITIAL_TRANSACTIONS, 
  INITIAL_SEO, 
  INITIAL_NOTIFICATIONS,
  generateThumbnailSvg 
} from '../data/initialData';

const STORAGE_KEYS = {
  VIDEOS: 'desi_ero_videos_v2',
  PACKS: 'desi_ero_packs_v2',
  USER: 'desi_ero_user_v2',
  TRANSACTIONS: 'desi_ero_transactions_v2',
  REVIEWS: 'desi_ero_reviews_v2',
  REPORTS: 'desi_ero_reports_v2',
  NOTIFICATIONS: 'desi_ero_notifications_v2',
  SEO: 'desi_ero_seo_v2'
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to read from localStorage key "${key}"`, e);
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save to localStorage key "${key}"`, e);
  }
}

// In-memory + LocalStorage central store singleton
class AppStore {
  private videos: Video[] = safeGet(STORAGE_KEYS.VIDEOS, INITIAL_VIDEOS);
  private packs: DigitalPack[] = safeGet(STORAGE_KEYS.PACKS, INITIAL_PACKS);
  private user: User = safeGet(STORAGE_KEYS.USER, INITIAL_USER);
  private transactions: Transaction[] = safeGet(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  private reviews: Review[] = safeGet(STORAGE_KEYS.REVIEWS, []);
  private reports: ContentReport[] = safeGet(STORAGE_KEYS.REPORTS, []);
  private notifications: NotificationItem[] = safeGet(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  private seo: SEOSettings = safeGet(STORAGE_KEYS.SEO, INITIAL_SEO);
  private listeners: Set<() => void> = new Set();
  private unlockInFlight: Set<string> = new Set(); // Prevent race conditions / double clicks

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }

  // --- GETTERS ---
  public getVideos(): Video[] {
    return [...this.videos];
  }

  public getPacks(): DigitalPack[] {
    return [...this.packs];
  }

  public getUser(): User {
    return { ...this.user };
  }

  public getTransactions(): Transaction[] {
    return [...this.transactions];
  }

  public getReviews(targetId?: string): Review[] {
    if (targetId) {
      return this.reviews.filter(r => r.targetId === targetId);
    }
    return [...this.reviews];
  }

  public getReports(): ContentReport[] {
    return [...this.reports];
  }

  public getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  public getSEO(): SEOSettings {
    return { ...this.seo };
  }

  // --- VIDEO & PACK UNLOCKS (ATOMIC & IDEMPOTENT) ---
  public unlockVideo(videoId: string): { success: boolean; message: string; balance: number } {
    const lockKey = `video_${videoId}_${this.user.id}`;
    if (this.unlockInFlight.has(lockKey)) {
      return { success: false, message: 'Transaction already processing...', balance: this.user.walletBalance };
    }
    this.unlockInFlight.add(lockKey);

    try {
      const video = this.videos.find(v => v.id === videoId);
      if (!video) {
        return { success: false, message: 'Video not found in catalog', balance: this.user.walletBalance };
      }

      // Already unlocked
      if (this.user.unlockedVideoIds.includes(videoId)) {
        return { success: true, message: 'You already own this video.', balance: this.user.walletBalance };
      }

      const cost = video.isFree ? 0 : video.creditPrice;

      if (!video.isFree && this.user.walletBalance < cost) {
        return {
          success: false,
          message: `Insufficient balance: You need ${cost} credits, but have ${this.user.walletBalance}.`,
          balance: this.user.walletBalance
        };
      }

      // Atomic deduction
      const newBalance = this.user.walletBalance - cost;
      const ref = `TXN-${Math.floor(1000 + Math.random() * 9000)}-VID`;

      const txn: Transaction = {
        id: 'txn_' + Date.now(),
        reference: ref,
        userId: this.user.id,
        type: 'video_unlock',
        amount: -cost,
        balanceAfter: newBalance,
        itemId: video.id,
        itemTitle: video.title,
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      this.user.walletBalance = newBalance;
      this.user.unlockedVideoIds = [...this.user.unlockedVideoIds, videoId];
      this.transactions = [txn, ...this.transactions];

      // Add notification
      const notif: NotificationItem = {
        id: 'notif_' + Date.now(),
        userId: this.user.id,
        title: 'Video Unlocked!',
        message: `You unlocked "${video.title}" for ${cost} credits. Added to your library.`,
        type: 'purchase',
        read: false,
        createdAt: new Date().toISOString()
      };
      this.notifications = [notif, ...this.notifications];

      this.persist();
      this.notify();

      return {
        success: true,
        message: video.isFree ? 'Free video added to library!' : `Unlocked successfully for ${cost} credits!`,
        balance: newBalance
      };
    } finally {
      this.unlockInFlight.delete(lockKey);
    }
  }

  public unlockPack(packId: string): { success: boolean; message: string; accessUrl?: string; balance: number } {
    const lockKey = `pack_${packId}_${this.user.id}`;
    if (this.unlockInFlight.has(lockKey)) {
      return { success: false, message: 'Transaction already processing...', balance: this.user.walletBalance };
    }
    this.unlockInFlight.add(lockKey);

    try {
      const pack = this.packs.find(p => p.id === packId);
      if (!pack) {
        return { success: false, message: 'Pack not found', balance: this.user.walletBalance };
      }

      if (this.user.unlockedPackIds.includes(packId)) {
        return {
          success: true,
          message: 'You already own this pack.',
          accessUrl: pack.accessUrl,
          balance: this.user.walletBalance
        };
      }

      const cost = pack.creditPrice;
      if (this.user.walletBalance < cost) {
        return {
          success: false,
          message: `Insufficient balance: You need ${cost} credits to unlock this ${pack.fileSize} pack.`,
          balance: this.user.walletBalance
        };
      }

      const newBalance = this.user.walletBalance - cost;
      const ref = `TXN-${Math.floor(1000 + Math.random() * 9000)}-PAK`;

      const txn: Transaction = {
        id: 'txn_' + Date.now(),
        reference: ref,
        userId: this.user.id,
        type: 'pack_unlock',
        amount: -cost,
        balanceAfter: newBalance,
        itemId: pack.id,
        itemTitle: pack.title,
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      this.user.walletBalance = newBalance;
      this.user.unlockedPackIds = [...this.user.unlockedPackIds, packId];
      this.transactions = [txn, ...this.transactions];

      const notif: NotificationItem = {
        id: 'notif_' + Date.now(),
        userId: this.user.id,
        title: 'Pack Purchased!',
        message: `Unlocked "${pack.title}" (${pack.fileSize}) for ${cost} credits. Download link ready in My Library.`,
        type: 'purchase',
        read: false,
        createdAt: new Date().toISOString()
      };
      this.notifications = [notif, ...this.notifications];

      this.persist();
      this.notify();

      return {
        success: true,
        message: `Pack unlocked! Delivery access granted for ${pack.platform}.`,
        accessUrl: pack.accessUrl,
        balance: newBalance
      };
    } finally {
      this.unlockInFlight.delete(lockKey);
    }
  }

  // --- WALLET & TOP-UP ---
  public topUpCredits(amount: number, paymentMethod: string): { success: boolean; newBalance: number; reference: string } {
    if (amount <= 0) return { success: false, newBalance: this.user.walletBalance, reference: '' };

    const newBalance = this.user.walletBalance + amount;
    const ref = `DEP-${Math.floor(10000 + Math.random() * 90000)}`;

    const txn: Transaction = {
      id: 'txn_' + Date.now(),
      reference: ref,
      userId: this.user.id,
      type: 'deposit',
      amount: amount,
      balanceAfter: newBalance,
      status: 'completed',
      createdAt: new Date().toISOString(),
      paymentMethod
    };

    this.user.walletBalance = newBalance;
    this.transactions = [txn, ...this.transactions];

    const notif: NotificationItem = {
      id: 'notif_' + Date.now(),
      userId: this.user.id,
      title: 'Credits Added',
      message: `Deposit of ${amount} credits was successfully added via ${paymentMethod}.`,
      type: 'deposit',
      read: false,
      createdAt: new Date().toISOString()
    };
    this.notifications = [notif, ...this.notifications];

    this.persist();
    this.notify();

    return { success: true, newBalance, reference: ref };
  }

  public applyCoupon(code: string): { success: boolean; message: string; bonusCredits?: number } {
    const trimmed = code.trim().toUpperCase();
    if (trimmed === 'WELCOME50') {
      const bonus = 50;
      this.topUpCredits(bonus, 'Coupon: WELCOME50');
      return { success: true, message: `Coupon applied! +${bonus} credits added to your wallet.`, bonusCredits: bonus };
    }
    if (trimmed === 'DESIPRO') {
      const bonus = 100;
      this.topUpCredits(bonus, 'Coupon: DESIPRO');
      return { success: true, message: `VIP promo applied! +${bonus} credits added.`, bonusCredits: bonus };
    }
    return { success: false, message: 'Invalid or expired coupon code. Try WELCOME50 or DESIPRO.' };
  }

  // --- WATCH HISTORY & PROGRESS ---
  public saveWatchProgress(videoId: string, progressSeconds: number, durationSeconds: number): void {
    const existingIndex = this.user.watchHistory.findIndex(w => w.videoId === videoId);
    const entry = {
      videoId,
      progressSeconds: Math.floor(progressSeconds),
      durationSeconds: Math.floor(durationSeconds),
      lastWatchedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      this.user.watchHistory[existingIndex] = entry;
    } else {
      this.user.watchHistory = [entry, ...this.user.watchHistory];
    }

    safeSet(STORAGE_KEYS.USER, this.user);
    this.notify();
  }

  // --- FAVORITES TOGGLE ---
  public toggleFavorite(itemId: string): boolean {
    const exists = this.user.favorites.includes(itemId);
    if (exists) {
      this.user.favorites = this.user.favorites.filter(id => id !== itemId);
    } else {
      this.user.favorites = [...this.user.favorites, itemId];
    }
    safeSet(STORAGE_KEYS.USER, this.user);
    this.notify();
    return !exists;
  }

  // --- REVIEWS & RATINGS ---
  public addReview(targetId: string, rating: number, comment: string): Review {
    const review: Review = {
      id: 'rev_' + Date.now(),
      targetId,
      userId: this.user.id,
      userName: this.user.name,
      rating,
      comment,
      createdAt: new Date().toISOString(),
      verifiedPurchase: this.user.unlockedVideoIds.includes(targetId) || this.user.unlockedPackIds.includes(targetId)
    };

    this.reviews = [review, ...this.reviews];
    safeSet(STORAGE_KEYS.REVIEWS, this.reviews);
    this.notify();
    return review;
  }

  // --- REPORT CONTENT ---
  public submitReport(targetId: string, targetTitle: string, targetType: 'video' | 'pack', reason: ContentReport['reason'], details: string): ContentReport {
    const report: ContentReport = {
      id: 'rep_' + Date.now(),
      targetId,
      targetTitle,
      targetType,
      userId: this.user.id,
      reason,
      details,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.reports = [report, ...this.reports];
    safeSet(STORAGE_KEYS.REPORTS, this.reports);
    this.notify();
    return report;
  }

  public resolveReport(reportId: string): void {
    this.reports = this.reports.map(r => r.id === reportId ? { ...r, status: 'resolved' as const } : r);
    safeSet(STORAGE_KEYS.REPORTS, this.reports);
    this.notify();
  }

  // --- NOTIFICATIONS ---
  public markAllNotificationsRead(): void {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    safeSet(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    this.notify();
  }

  // --- USER ROLE SWITCHER (FOR TESTING VIEW/ADMIN/SELLER EASILY) ---
  public setUserRole(role: 'user' | 'admin' | 'seller'): void {
    this.user.role = role;
    safeSet(STORAGE_KEYS.USER, this.user);
    this.notify();
  }

  // --- ADMIN: VIDEO CRUD ---
  public addVideo(videoData: Omit<Video, 'id' | 'views' | 'rating' | 'publishedAt'>): Video {
    const id = 'vid-' + (100 + this.videos.length + 1);
    const newVideo: Video = {
      ...videoData,
      id,
      rating: 5.0,
      views: 0,
      publishedAt: new Date().toISOString().split('T')[0]
    };
    if (!newVideo.thumbnail) {
      newVideo.thumbnail = generateThumbnailSvg(newVideo.title, newVideo.category, 'purple', '▶');
    }
    if (!newVideo.backdrop) {
      newVideo.backdrop = newVideo.thumbnail;
    }

    this.videos = [newVideo, ...this.videos];
    safeSet(STORAGE_KEYS.VIDEOS, this.videos);
    this.notify();
    return newVideo;
  }

  public updateVideo(id: string, updates: Partial<Video>): void {
    this.videos = this.videos.map(v => v.id === id ? { ...v, ...updates } : v);
    safeSet(STORAGE_KEYS.VIDEOS, this.videos);
    this.notify();
  }

  public deleteVideo(id: string): void {
    this.videos = this.videos.filter(v => v.id !== id);
    safeSet(STORAGE_KEYS.VIDEOS, this.videos);
    this.notify();
  }

  // --- ADMIN: PACK CRUD ---
  public addPack(packData: Omit<DigitalPack, 'id' | 'rating' | 'salesCount' | 'publishedAt'>): DigitalPack {
    const id = 'pack-' + (200 + this.packs.length + 1);
    const newPack: DigitalPack = {
      ...packData,
      id,
      rating: 5.0,
      salesCount: 0,
      publishedAt: new Date().toISOString().split('T')[0]
    };
    if (!newPack.coverImage) {
      newPack.coverImage = generateThumbnailSvg(newPack.title, newPack.platform, 'ruby', '▣');
    }

    this.packs = [newPack, ...this.packs];
    safeSet(STORAGE_KEYS.PACKS, this.packs);
    this.notify();
    return newPack;
  }

  public updatePack(id: string, updates: Partial<DigitalPack>): void {
    this.packs = this.packs.map(p => p.id === id ? { ...p, ...updates } : p);
    safeSet(STORAGE_KEYS.PACKS, this.packs);
    this.notify();
  }

  public deletePack(id: string): void {
    this.packs = this.packs.filter(p => p.id !== id);
    safeSet(STORAGE_KEYS.PACKS, this.packs);
    this.notify();
  }

  // --- SEO UPDATE ---
  public updateSEO(updates: Partial<SEOSettings>): void {
    this.seo = { ...this.seo, ...updates };
    safeSet(STORAGE_KEYS.SEO, this.seo);
    this.notify();
  }

  // --- RESET DEMO DATA ---
  public resetData(): void {
    this.videos = INITIAL_VIDEOS;
    this.packs = INITIAL_PACKS;
    this.user = INITIAL_USER;
    this.transactions = INITIAL_TRANSACTIONS;
    this.reviews = [];
    this.reports = [];
    this.notifications = INITIAL_NOTIFICATIONS;
    this.seo = INITIAL_SEO;
    this.persist();
    this.notify();
  }

  private persist(): void {
    safeSet(STORAGE_KEYS.VIDEOS, this.videos);
    safeSet(STORAGE_KEYS.PACKS, this.packs);
    safeSet(STORAGE_KEYS.USER, this.user);
    safeSet(STORAGE_KEYS.TRANSACTIONS, this.transactions);
    safeSet(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
  }
}

export const store = new AppStore();
