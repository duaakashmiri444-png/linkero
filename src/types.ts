export type CategoryType = 
  | 'Pakistani'
  | 'Indian'
  | 'TikTok Creators'
  | 'Models & Creators'
  | 'Trending ABACS'
  | 'Master Demos'
  | 'Other';

export type PlatformType =
  | 'Telegram'
  | 'MEGA'
  | 'Google Drive'
  | 'WhatsApp'
  | 'Inbuilt Player'
  | 'Other';

export interface Creator {
  name: string;
  handle: string;
  avatar: string;
  verified?: boolean;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  backdrop: string;
  videoUrl: string;
  duration: string;
  durationSeconds: number;
  isFree: boolean;
  creditPrice: number;
  previewTrimSeconds: number; // e.g. 15, 30s preview for paid videos
  category: CategoryType;
  tags: string[];
  creator: Creator;
  rating: number;
  views: number;
  publishedAt: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isNewRelease?: boolean;
  isMasterDemo?: boolean;
  linkedPackId?: string;
}

export interface DigitalPack {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  platform: PlatformType;
  category: CategoryType;
  fileSize: string; // e.g. "9 GB", "4.2 GB"
  creditPrice: number;
  itemCount: number;
  includedItems: string[];
  masterDemoVideoId?: string;
  accessUrl: string; // Protected delivery link
  publishedAt: string;
  rating: number;
  salesCount: number;
  isFeatured?: boolean;
}

export interface WatchProgress {
  videoId: string;
  progressSeconds: number;
  durationSeconds: number;
  lastWatchedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin' | 'seller';
  walletBalance: number;
  membershipTier: 'standard' | 'vip_monthly' | 'vip_yearly';
  unlockedVideoIds: string[];
  unlockedPackIds: string[];
  favorites: string[];
  watchHistory: WatchProgress[];
}

export interface Transaction {
  id: string;
  reference: string;
  userId: string;
  type: 'deposit' | 'video_unlock' | 'pack_unlock' | 'bonus' | 'refund';
  amount: number;
  balanceAfter: number;
  itemId?: string;
  itemTitle?: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
  paymentMethod?: string;
}

export interface Review {
  id: string;
  targetId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  verifiedPurchase: boolean;
}

export interface ContentReport {
  id: string;
  targetId: string;
  targetTitle: string;
  targetType: 'video' | 'pack';
  userId: string;
  reason: 'broken_link' | 'copyright' | 'inappropriate' | 'preview_mismatch' | 'other';
  details: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'purchase' | 'deposit' | 'promo' | 'system';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface SEOSettings {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  robotsIndex: boolean;
  ogImage: string;
  keywords: string;
}

export type ActiveTab = 'home' | 'videos' | 'demo' | 'marketplace' | 'library' | 'wallet' | 'admin' | 'search';
