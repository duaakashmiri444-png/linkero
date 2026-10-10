import type {
  ContentAccess,
  LibraryEntry,
  MediaRow,
  NotificationRow,
  ProductRow,
  SessionUser,
  TransactionRow,
  Wallet,
} from './api';
import type { DigitalPack, NotificationItem, PackVideo, Transaction, User, Video, WatchProgress } from '../types';

const PACK_TYPES = new Set(['DIGITAL_RESOURCE', 'COMMUNITY', 'EXTERNAL_RESOURCE', 'IMAGE_GALLERY']);
const VIDEO_TYPES = new Set(['VIDEO', 'COURSE']);

export function isPackProduct(p: ProductRow): boolean {
  if (PACK_TYPES.has(String(p.premium_type))) return true;
  // Listings typed as courses that carry no streamable video but do carry files or delivery links
  // (MEGA, Drive, Telegram, WhatsApp) are sold as packs: the buyer receives destinations, not a
  // player. Without this they sat in the Videos shelf and the marketplace lost those platforms.
  const streams = Number(p.playable_count ?? 0);
  const deliverables = Number(p.file_count ?? 0);
  return streams === 0 && (deliverables > 0 || (p.link_types ?? []).length > 0);
}

export function isVideoProduct(p: ProductRow): boolean {
  if (isPackProduct(p)) return false;
  return VIDEO_TYPES.has(String(p.premium_type)) || p.is_streamable === true || p.content_format === 'VIDEO';
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

export function humanBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return 'Size unknown';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

const PLAYABLE_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;

/** True only for an address the site's own <video> player can stream. */
export function isPlayableVideoUrl(url: string | null | undefined): boolean {
  return !!url && (url.startsWith('/uploads/') || PLAYABLE_EXT.test(url));
}

const PROVIDER_LABELS: Record<string, string> = {
  TELEGRAM: 'Telegram',
  WHATSAPP: 'WhatsApp',
  MEGA: 'MEGA',
  GOOGLE_DRIVE: 'Google Drive',
  DROPBOX: 'Dropbox',
  SOURCEFORGE: 'SourceForge',
  UPLOAD: 'Inbuilt Player',
  URL: 'Direct Link',
};

/**
 * Destinations an owner can hand a buyer instead of a file on this server. The provider code is
 * what the backend stores, so a pack published with one of these shows up under the matching
 * marketplace filter.
 */
export const DELIVERY_PLATFORMS: { provider: string; name: string; placeholder: string }[] = [
  { provider: 'TELEGRAM', name: 'Telegram', placeholder: 'https://t.me/…' },
  { provider: 'WHATSAPP', name: 'WhatsApp', placeholder: 'https://chat.whatsapp.com/…' },
  { provider: 'MEGA', name: 'MEGA', placeholder: 'https://mega.nz/folder/…#key' },
  { provider: 'GOOGLE_DRIVE', name: 'Google Drive', placeholder: 'https://drive.google.com/drive/folders/…' },
  { provider: 'DROPBOX', name: 'Dropbox', placeholder: 'https://www.dropbox.com/…' },
  { provider: 'SOURCEFORGE', name: 'SourceForge', placeholder: 'https://sourceforge.net/…' },
  { provider: 'URL', name: 'Direct link', placeholder: 'https://…' },
];

const DESTINATION_PATTERNS: [RegExp, string][] = [
  [/mega\.nz/i, 'MEGA'],
  [/drive\.google/i, 'Google Drive'],
  [/t\.me|telegram/i, 'Telegram'],
  [/wa\.me|whatsapp/i, 'WhatsApp'],
  [/dropbox/i, 'Dropbox'],
];

/**
 * Every destination a listing actually delivers through. A bundle with both a MEGA folder and a
 * Drive mirror belongs under both filters, so a shopper narrowing to MEGA still finds it.
 */
export function platformLabels(p: ProductRow): string[] {
  const labels: string[] = [];
  const push = (label?: string | null) => {
    if (label && !labels.includes(label)) labels.push(label);
  };
  // Only real in-site streams earn the player label — a demo clip alone is not the delivery.
  if (Number(p.playable_count ?? 0) > 0) push('Inbuilt Player');
  for (const link of p.link_types ?? []) push(PROVIDER_LABELS[link]);
  const url = p.premium_resource_url ?? '';
  for (const [pattern, label] of DESTINATION_PATTERNS) if (pattern.test(url)) push(label);
  return labels.length ? labels : ['Inbuilt Player'];
}

/** The label shown on cards and headers: the first, i.e. the primary destination. */
export function platformLabel(p: ProductRow): string {
  return platformLabels(p)[0];
}

export function toVideo(p: ProductRow): Video {
  const durationSeconds = Number(p.duration_seconds ?? 0);
  return {
    productId: p.id,
    id: String(p.id),
    slug: p.slug,
    title: p.title,
    description: p.description ?? '',
    thumbnail: p.thumbnail ?? '',
    backdrop: p.thumbnail ?? '',
    previewUrl: p.demo_type === 'VIDEO' ? p.demo_url ?? '' : '',
    streamUrl: null,
    duration: formatDuration(durationSeconds),
    durationSeconds,
    isFree: Number(p.price) === 0,
    creditPrice: Number(p.price ?? 0),
    category: p.category ?? 'Uncategorised',
    tags: (p.tags ?? '').split(',').map(t => t.trim()).filter(Boolean),
    rating: Number(p.rating ?? 0),
    ratingCount: Number(p.rating_count ?? 0),
    views: Number(p.views ?? 0),
    publishedAt: p.created_at ?? '',
    status: p.status,
    access: p.user_access ?? null,
    lessonCount: Number(p.lesson_count ?? 0),
    isFeatured: p.icon === 'star' || p.slug.includes('featured'),
    isTrending: Number(p.views ?? 0) > 0,
    isNewRelease: !!p.created_at && Date.now() - new Date(p.created_at).getTime() < 1000 * 60 * 60 * 24 * 14,
  };
}

export function toPack(p: ProductRow): DigitalPack {
  return {
    productId: p.id,
    id: String(p.id),
    slug: p.slug,
    title: p.title,
    description: p.description ?? '',
    coverImage: p.thumbnail ?? '',
    platform: platformLabel(p),
    platforms: platformLabels(p),
    category: p.category ?? 'Uncategorised',
    fileCount: Number(p.file_count ?? 0),
    totalBytes: 0,
    creditPrice: Number(p.price ?? 0),
    files: [],
    videoCount: Number(p.playable_count ?? 0),
    demoUrl: p.demo_type === 'VIDEO' ? p.demo_url ?? '' : '',
    previewPhotos: [],
    previewClips: [],
    videos: [],
    publishedAt: p.created_at ?? '',
    status: p.status,
    rating: Number(p.rating ?? 0),
    ratingCount: Number(p.rating_count ?? 0),
    salesCount: Number(p.purchases_count ?? 0),
    access: p.user_access ?? null,
  };
}

/** Full stream URL + resume point, available only from an authorised /content/:id/access call. */
export function applyStreamAccess(video: Video, access: ContentAccess): Video {
  const lesson = (access.lessons ?? []).find(l => l.video_url) ?? null;
  const durationSeconds = Number(lesson?.duration_seconds ?? video.durationSeconds ?? 0);
  return {
    ...video,
    streamUrl: lesson?.video_url ?? access.product.premium_resource_url ?? null,
    durationSeconds,
    duration: formatDuration(durationSeconds),
    access: access.access ?? video.access,
  };
}

/** Deliverable files for a pack, available only from an authorised /content/:id/access call. */
export function applyPackAccess(pack: DigitalPack, access: ContentAccess, files: MediaRow[]): DigitalPack {
  const withSize = files.map(f => ({ ...f, url: f.url ?? null }));
  return {
    ...pack,
    files: withSize,
    totalBytes: withSize.reduce((sum, f) => sum + Number(f.size_bytes ?? 0), 0),
    videos: (access.lessons ?? [])
      .filter(l => isPlayableVideoUrl(l.video_url))
      .map((l): PackVideo => ({
        id: l.id,
        title: l.title,
        url: l.video_url as string,
        durationSeconds: Number(l.duration_seconds ?? 0),
      })),
    access: access.access ?? pack.access,
  };
}

/** Public preview photos and demo clips, from the unauthenticated product detail call. */
export function applyPackPreview(pack: DigitalPack, media: MediaRow[]): DigitalPack {
  const open = media.filter(m => m.access_level === 'DEMO' && !!m.url);
  return {
    ...pack,
    previewPhotos: open.filter(m => m.media_type === 'DEMO_PHOTO'),
    previewClips: open.filter(m => m.media_type === 'DEMO_VIDEO'),
  };
}

export const GUEST_USER: User = {
  id: 0,
  name: '',
  email: '',
  avatar: '',
  role: 'guest',
  walletBalance: 0,
  currency: 'CREDITS',
  unlockedVideoIds: [],
  unlockedPackIds: [],
  favorites: [],
  watchHistory: [],
};

interface OwnedProducts {
  videos: Video[];
  packs: DigitalPack[];
}

/** Builds the viewer's owned/favourite/resume state from /api/library, classified by premium_type. */
export function toUser(
  session: SessionUser,
  wallet: Wallet | null,
  owned: OwnedProducts,
  library?: { purchased: LibraryEntry[]; continue_watching: LibraryEntry[]; favorites: LibraryEntry[] } | null
): User {
  const videoIds = new Set(owned.videos.map(v => v.id));
  const unlocked: string[] = [];
  const history: WatchProgress[] = [];

  (library?.purchased ?? []).forEach(entry => {
    if (entry.access?.has_access) unlocked.push(String(entry.product_id));
  });
  (library?.continue_watching ?? []).forEach(entry => {
    if (entry.access?.has_access && !unlocked.includes(String(entry.product_id))) unlocked.push(String(entry.product_id));
    const duration = entry.progress?.duration_seconds ?? 0;
    history.push({
      videoId: String(entry.product_id),
      progressSeconds: entry.progress?.position_seconds ?? 0,
      durationSeconds: duration,
      lastWatchedAt: entry.access?.expires_at ?? new Date().toISOString(),
      completionPercent: entry.progress?.completion_percent ?? 0,
    });
  });
  // A product the catalogue classifies as a video belongs in unlockedVideoIds, the rest in packs.
  const unlockedVideoIds = unlocked.filter(id => videoIds.has(id));
  const unlockedPackIds = unlocked.filter(id => !videoIds.has(id));

  return {
    id: session.id,
    name: session.username,
    email: session.email,
    avatar: session.avatar_url ?? '',
    role: session.role,
    walletBalance: Number(wallet?.balance ?? 0),
    currency: wallet?.currency ?? 'CREDITS',
    unlockedVideoIds,
    unlockedPackIds,
    favorites: (library?.favorites ?? []).map(f => String(f.product_id)),
    watchHistory: history,
  };
}

export function toTransaction(row: TransactionRow): Transaction {
  return {
    id: String(row.id),
    reference: row.reference ?? `#${row.id}`,
    type: row.type,
    amount: Number(row.amount),
    balanceAfter: Number(row.balance_after),
    balanceBefore: Number(row.balance_before),
    description: row.description ?? row.type,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function toNotification(row: NotificationRow): NotificationItem {
  return {
    id: String(row.id),
    title: row.title,
    message: row.message,
    type: row.type,
    read: row.is_read === 1,
    createdAt: row.created_at,
    link: row.link,
  };
}
