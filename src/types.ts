import type { AccessState, MediaRow, PaymentProvider, TopupRow, TransactionRow } from './services/api';

/**
 * Types mirror what the Desi Ero API actually returns. Anything the backend does not
 * model (creator identity, a per-video preview trim, membership tiers) has been removed
 * rather than invented.
 */

export type CategoryType = string;

/** Delivery channel label, derived from the product's premium_type + link providers. */
export type PlatformType = string;

export interface Video {
  productId: number;
  id: string; // productId as string; existing components key off string ids
  slug: string;
  title: string;
  description: string;
  thumbnail: string;
  backdrop: string;
  /** Free preview URL (products.demo_url). The full stream comes from /api/content/:id/access. */
  previewUrl: string;
  /** What the seller actually attached as a preview — a clip, a photo, an embed or a web link. */
  previewKind: 'FILE' | 'EMBED' | 'PHOTO' | 'DESTINATION' | 'NONE';
  previewSource: string;
  /** Set once the viewer holds access; never populated from a list response. */
  streamUrl: string | null;
  duration: string;
  durationSeconds: number;
  isFree: boolean;
  creditPrice: number;
  category: CategoryType;
  tags: string[];
  rating: number;
  ratingCount: number;
  views: number;
  publishedAt: string;
  status: string;
  access: AccessState | null;
  lessonCount: number;
  isFavorite?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  isNewRelease?: boolean;
}

export interface PackVideo {
  id: number;
  title: string;
  /** Stream URL — only ever present after an authorised access call. */
  url: string;
  durationSeconds: number;
}

export interface DigitalPack {
  productId: number;
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  platform: PlatformType;
  /** Every destination this pack delivers through — a MEGA+Drive bundle appears under both filters. */
  platforms: string[];
  category: CategoryType;
  /** Real file count from product_media; replaces the old free-text "9.0 GB" field. */
  fileCount: number;
  /** The seller's own headline ("9 GB", "1100+ videos") for a pack this server cannot measure. */
  sizeLabel: string;
  contentsLabel: string;
  totalBytes: number;
  creditPrice: number;
  /** Deliverables, populated only after an authorised /api/content/:id/access call. */
  files: MediaRow[];
  /** Videos this pack delivers that play in the site player once unlocked. */
  videoCount: number;
  /** Free "master demo" clip (products.demo_url) any visitor can watch. */
  demoUrl: string;
  /** Preview photos and demo clips the owner attached; loaded from the product detail call. */
  previewPhotos: MediaRow[];
  previewClips: MediaRow[];
  /** In-pack videos with playable URLs, populated only after an authorised access call. */
  videos: PackVideo[];
  publishedAt: string;
  status: string;
  rating: number;
  ratingCount: number;
  salesCount: number;
  access: AccessState | null;
  isFavorite?: boolean;
  isFeatured?: boolean;
}

export interface WatchProgress {
  videoId: string;
  progressSeconds: number;
  durationSeconds: number;
  lastWatchedAt: string;
  completionPercent: number;
}

export type Role = 'guest' | 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: number;
  name: string; // users.username
  email: string;
  avatar: string;
  role: Role;
  walletBalance: number;
  currency: string;
  unlockedVideoIds: string[];
  unlockedPackIds: string[];
  favorites: string[];
  watchHistory: WatchProgress[];
}

export interface Transaction {
  id: string;
  reference: string;
  type: TransactionRow['type'];
  amount: number;
  balanceAfter: number;
  balanceBefore: number;
  description: string;
  status: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  link?: string | null;
}

export type ActiveTab = 'home' | 'videos' | 'demo' | 'marketplace' | 'library' | 'wallet' | 'admin' | 'search' | 'auth';

export type { AccessState, MediaRow, PaymentProvider, TopupRow, TransactionRow };
