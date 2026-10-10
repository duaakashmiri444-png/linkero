import { Video, DigitalPack, User, SEOSettings, NotificationItem, Transaction } from '../types';

// Reliable public HTML5 playable streaming video clips for previews and full videos
const SAMPLE_VIDEOS = {
  flower: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  sintel: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  tears: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  bunny: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  elephants: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  subaru: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4'
};

// Rich thumbnail SVG generators so thumbnails are 100% reliable, aesthetic, and never broken
export function generateThumbnailSvg(title: string, tag: string, colorScheme: string, icon = '▶'): string {
  const gradients: Record<string, { start: string; mid: string; end: string }> = {
    purple: { start: '#5925a1', mid: '#2c144d', end: '#0e0b1c' },
    pink: { start: '#8a1f68', mid: '#4a1239', end: '#0d0914' },
    cyan: { start: '#126078', mid: '#0e3848', end: '#09131a' },
    amber: { start: '#784610', mid: '#48260b', end: '#140d08' },
    emerald: { start: '#13684a', mid: '#0c3828', end: '#08140f' },
    rose: { start: '#7e1742', mid: '#440f25', end: '#13080e' },
    indigo: { start: '#2e2ca1', mid: '#191854', end: '#0a0a1a' },
    ruby: { start: '#8e1b34', mid: '#47101d', end: '#11080b' }
  };

  const scheme = gradients[colorScheme] || gradients.purple;
  const safeTitle = title.replace(/[<>&"]/g, '');
  const safeTag = tag.replace(/[<>&"]/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%">
    <defs>
      <linearGradient id="g_${colorScheme}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${scheme.start}"/>
        <stop offset="50%" stop-color="${scheme.mid}"/>
        <stop offset="100%" stop-color="${scheme.end}"/>
      </linearGradient>
      <radialGradient id="r_${colorScheme}" cx="75%" cy="25%" r="65%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.18)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
      </radialGradient>
      <linearGradient id="scrim" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="35%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(8,9,16,0.92)"/>
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#g_${colorScheme})"/>
    <circle cx="500" cy="90" r="140" fill="url(#r_${colorScheme})"/>
    <circle cx="120" cy="270" r="180" fill="rgba(255,255,255,0.03)"/>
    <rect width="640" height="360" fill="url(#scrim)"/>
    <!-- Decorative Center Icon -->
    <g transform="translate(320, 160)" opacity="0.35">
      <circle cx="0" cy="0" r="50" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
      <text x="3" y="10" font-family="system-ui, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle">${icon}</text>
    </g>
    <!-- Card Info Overlay -->
    <g transform="translate(24, 310)">
      <text x="0" y="-22" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#e2d4ff" letter-spacing="1">${safeTag.toUpperCase()}</text>
      <text x="0" y="2" font-family="system-ui, sans-serif" font-size="19" font-weight="800" fill="#ffffff">${safeTitle}</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const INITIAL_VIDEOS: Video[] = [
  {
    id: 'vid-101',
    title: 'Lahore Nights — VIP Master Cinematic',
    description: 'Exclusive 4K showcase capturing night city vibes, music culture, and creator spotlight with authentic local styling and high-fidelity production.',
    thumbnail: generateThumbnailSvg('Lahore Nights — VIP Master', 'Featured • 4K', 'purple', '▶'),
    backdrop: generateThumbnailSvg('Lahore Nights — VIP Master', 'Featured Video', 'purple', '★'),
    videoUrl: SAMPLE_VIDEOS.tears,
    duration: '22:15',
    durationSeconds: 1335,
    isFree: false,
    creditPrice: 4,
    previewTrimSeconds: 20,
    category: 'Pakistani',
    tags: ['Lahore', 'Cinematic', 'Nightlife', 'Exclusive', 'Creator'],
    creator: { name: 'Dua Kashmiri', handle: '@duakashmiri', avatar: 'DK', verified: true },
    rating: 4.9,
    views: 48200,
    publishedAt: '2026-09-28',
    isFeatured: true,
    isTrending: true,
    isNewRelease: true,
    linkedPackId: 'pack-201'
  },
  {
    id: 'vid-102',
    title: 'Free Demo: Short Film Showcase',
    description: 'Completely free-to-watch sample video playing in the built-in player. Tests uninterrupted full playback with zero credit deduction.',
    thumbnail: generateThumbnailSvg('Free Demo: Short Film', '100% Free Video', 'emerald', '▶'),
    backdrop: generateThumbnailSvg('Free Demo: Short Film', 'Free Access', 'emerald', '▶'),
    videoUrl: SAMPLE_VIDEOS.flower,
    duration: '06:40',
    durationSeconds: 400,
    isFree: true,
    creditPrice: 0,
    previewTrimSeconds: 0,
    category: 'Pakistani',
    tags: ['Free', 'Demo', 'Pakistani', 'Creative', 'Short Film'],
    creator: { name: 'Studio Desi', handle: '@studiodesi', avatar: 'SD', verified: true },
    rating: 4.8,
    views: 62100,
    publishedAt: '2026-10-01',
    isTrending: true
  },
  {
    id: 'vid-103',
    title: 'Master Demo: Trending ABACS 9GB Pack',
    description: 'A comprehensive master demo video walking through every folder, resolution, and archive file included in the Trending ABACS MEGA release.',
    thumbnail: generateThumbnailSvg('Master Demo: Trending ABACS', 'Pack Walkthrough', 'ruby', '▣'),
    backdrop: generateThumbnailSvg('Master Demo: Trending ABACS', 'Master Demo', 'ruby', '▣'),
    videoUrl: SAMPLE_VIDEOS.sintel,
    duration: '14:20',
    durationSeconds: 860,
    isFree: false,
    creditPrice: 12,
    previewTrimSeconds: 30,
    category: 'Trending ABACS',
    tags: ['Master Demo', 'MEGA', '9 GB', 'ABACS', 'Archive'],
    creator: { name: 'Vault Curator', handle: '@vaultmaster', avatar: 'VC', verified: true },
    rating: 4.9,
    views: 31400,
    publishedAt: '2026-10-04',
    isMasterDemo: true,
    isTrending: true,
    linkedPackId: 'pack-201'
  },
  {
    id: 'vid-104',
    title: 'Karachi Street Beats & Dance Studio',
    description: 'High energy dance studio performance and street rhythm reels featuring premier Pakistani urban creators.',
    thumbnail: generateThumbnailSvg('Karachi Street Beats', 'Urban Rhythm', 'amber', '▶'),
    backdrop: generateThumbnailSvg('Karachi Street Beats', 'Karachi Studio', 'amber', '▶'),
    videoUrl: SAMPLE_VIDEOS.bunny,
    duration: '18:50',
    durationSeconds: 1130,
    isFree: false,
    creditPrice: 4,
    previewTrimSeconds: 15,
    category: 'Pakistani',
    tags: ['Karachi', 'Dance', 'Beats', 'Creators', 'Music'],
    creator: { name: 'Ali K & Crew', handle: '@alikbeats', avatar: 'AK' },
    rating: 4.7,
    views: 19800,
    publishedAt: '2026-09-25'
  },
  {
    id: 'vid-105',
    title: 'Mumbai Spotlight: Fashion & Glamour',
    description: 'Glamour editorial studio shoot featuring top Indian creators with runway lighting and behind-the-scenes master footage.',
    thumbnail: generateThumbnailSvg('Mumbai Spotlight', 'Indian Spotlight', 'pink', '▶'),
    backdrop: generateThumbnailSvg('Mumbai Spotlight', 'Editorial Shoot', 'pink', '▶'),
    videoUrl: SAMPLE_VIDEOS.elephants,
    duration: '26:30',
    durationSeconds: 1590,
    isFree: false,
    creditPrice: 6,
    previewTrimSeconds: 25,
    category: 'Indian',
    tags: ['Mumbai', 'Editorial', 'Glamour', 'BTS', 'Fashion'],
    creator: { name: 'Priya Sharma', handle: '@priyastyle', avatar: 'PS', verified: true },
    rating: 4.8,
    views: 45300,
    publishedAt: '2026-09-29',
    isTrending: true,
    linkedPackId: 'pack-202'
  },
  {
    id: 'vid-106',
    title: 'Free TikTokers Viral Clips Comp',
    description: 'Free viral compilation of this month’s most shared TikTok moments, dance routines, and comedic sketches.',
    thumbnail: generateThumbnailSvg('Viral Clips Comp', '100% Free', 'cyan', '▶'),
    backdrop: generateThumbnailSvg('Viral Clips Comp', 'Trending TikTok', 'cyan', '▶'),
    videoUrl: SAMPLE_VIDEOS.flower,
    duration: '08:15',
    durationSeconds: 495,
    isFree: true,
    creditPrice: 0,
    previewTrimSeconds: 0,
    category: 'TikTok Creators',
    tags: ['TikTok', 'Viral', 'Free', 'Comedy', 'Reels'],
    creator: { name: 'Reels Hub', handle: '@reelshub', avatar: 'RH' },
    rating: 4.6,
    views: 89000,
    publishedAt: '2026-10-05',
    isNewRelease: true
  },
  {
    id: 'vid-107',
    title: 'Models & Creators: Exclusive Runway Sessions',
    description: 'Premium behind-the-scenes pass to international fashion week shows, creator interviews, and slow-motion highlights.',
    thumbnail: generateThumbnailSvg('Exclusive Runway Sessions', 'Models & Creators', 'rose', '▶'),
    backdrop: generateThumbnailSvg('Exclusive Runway Sessions', 'Runway VIP', 'rose', '▶'),
    videoUrl: SAMPLE_VIDEOS.tears,
    duration: '31:10',
    durationSeconds: 1870,
    isFree: false,
    creditPrice: 8,
    previewTrimSeconds: 20,
    category: 'Models & Creators',
    tags: ['Models', 'Runway', 'High Fashion', 'VIP', 'Exclusive'],
    creator: { name: 'Couture Collective', handle: '@couturecoll', avatar: 'CC', verified: true },
    rating: 4.9,
    views: 27500,
    publishedAt: '2026-10-02',
    isFeatured: true,
    linkedPackId: 'pack-203'
  },
  {
    id: 'vid-108',
    title: 'Master Demo: Google Drive 4.2GB Creator Pack',
    description: 'Detailed file walkthrough of the Indian Spotlight 4.2GB Google Drive folder with download instructions and sample inspection.',
    thumbnail: generateThumbnailSvg('Drive 4.2GB Master Demo', 'Master Pack Demo', 'indigo', '▣'),
    backdrop: generateThumbnailSvg('Drive 4.2GB Master Demo', 'Google Drive', 'indigo', '▣'),
    videoUrl: SAMPLE_VIDEOS.subaru,
    duration: '11:45',
    durationSeconds: 705,
    isFree: false,
    creditPrice: 10,
    previewTrimSeconds: 20,
    category: 'Master Demos',
    tags: ['Google Drive', 'Master Demo', '4.2 GB', 'Indian', 'Pack'],
    creator: { name: 'Desi Archivist', handle: '@desiarchivist', avatar: 'DA' },
    rating: 4.8,
    views: 22100,
    publishedAt: '2026-09-20',
    isMasterDemo: true,
    linkedPackId: 'pack-202'
  },
  {
    id: 'vid-109',
    title: 'Northern Valleys 4K Drone Journey',
    description: 'Peaceful and breathtaking 4K aerial shots of Hunza, Skardu, and Fairy Meadows with traditional acoustic music score.',
    thumbnail: generateThumbnailSvg('Northern Valleys 4K', 'Cinematic Aerial', 'emerald', '▶'),
    backdrop: generateThumbnailSvg('Northern Valleys 4K', 'Scenic Journey', 'emerald', '▶'),
    videoUrl: SAMPLE_VIDEOS.sintel,
    duration: '16:40',
    durationSeconds: 1000,
    isFree: true,
    creditPrice: 0,
    previewTrimSeconds: 0,
    category: 'Pakistani',
    tags: ['Hunza', 'Drone', '4K', 'Free', 'Travel'],
    creator: { name: 'Karakoram Views', handle: '@karakoram', avatar: 'KV' },
    rating: 4.9,
    views: 54000,
    publishedAt: '2026-09-18'
  },
  {
    id: 'vid-110',
    title: 'TikTokers Backstage & Lip-Sync Bloopers',
    description: 'Unfiltered, candid moments from top TikTok creators filming collaborative reels, including bloopers and preparation.',
    thumbnail: generateThumbnailSvg('Backstage Bloopers', 'Creator Studio', 'purple', '▶'),
    backdrop: generateThumbnailSvg('Backstage Bloopers', 'Candid Moments', 'purple', '▶'),
    videoUrl: SAMPLE_VIDEOS.bunny,
    duration: '12:30',
    durationSeconds: 750,
    isFree: false,
    creditPrice: 4,
    previewTrimSeconds: 15,
    category: 'TikTok Creators',
    tags: ['TikTok', 'Bloopers', 'Backstage', 'Fun', 'Exclusive'],
    creator: { name: 'Ayesha Khan', handle: '@ayeshakhan', avatar: 'AK' },
    rating: 4.7,
    views: 38200,
    publishedAt: '2026-10-06',
    isNewRelease: true
  },
  {
    id: 'vid-111',
    title: 'Goa Sunset Sessions: Acoustic DJ Set',
    description: 'Live sunset beach performance with fusion sitar, electronic basslines, and immersive lighting.',
    thumbnail: generateThumbnailSvg('Goa Sunset Sessions', 'Music & Visuals', 'amber', '▶'),
    backdrop: generateThumbnailSvg('Goa Sunset Sessions', 'Sunset Set', 'amber', '▶'),
    videoUrl: SAMPLE_VIDEOS.tears,
    duration: '45:00',
    durationSeconds: 2700,
    isFree: false,
    creditPrice: 6,
    previewTrimSeconds: 30,
    category: 'Indian',
    tags: ['Goa', 'Music', 'Live Set', 'Fusion', 'DJ'],
    creator: { name: 'Rohan Beats', handle: '@rohanbeats', avatar: 'RB' },
    rating: 4.8,
    views: 29400,
    publishedAt: '2026-09-22'
  },
  {
    id: 'vid-112',
    title: 'Master Demo: Telegram VIP Channel Archive',
    description: 'Preview walkthrough of the VIP Telegram collection covering daily uploads, group discussions, and high-speed link access.',
    thumbnail: generateThumbnailSvg('Telegram VIP Demo', 'Channel Preview', 'cyan', '▣'),
    backdrop: generateThumbnailSvg('Telegram VIP Demo', 'Telegram Master', 'cyan', '▣'),
    videoUrl: SAMPLE_VIDEOS.elephants,
    duration: '09:20',
    durationSeconds: 560,
    isFree: false,
    creditPrice: 5,
    previewTrimSeconds: 15,
    category: 'Master Demos',
    tags: ['Telegram', 'Master Demo', 'VIP Channel', 'Community'],
    creator: { name: 'Link Verifier', handle: '@verifylinks', avatar: 'LV' },
    rating: 4.6,
    views: 18500,
    publishedAt: '2026-10-03',
    isMasterDemo: true,
    linkedPackId: 'pack-204'
  },
  {
    id: 'vid-113',
    title: 'Trending ABACS Creators Vol. 2',
    description: 'Curated high-demand episodic release featuring new viral sensations and backstage footage from the ABACS network.',
    thumbnail: generateThumbnailSvg('Trending ABACS Vol. 2', 'ABACS Series', 'ruby', '▶'),
    backdrop: generateThumbnailSvg('Trending ABACS Vol. 2', 'Episode 2', 'ruby', '▶'),
    videoUrl: SAMPLE_VIDEOS.sintel,
    duration: '28:15',
    durationSeconds: 1695,
    isFree: false,
    creditPrice: 8,
    previewTrimSeconds: 30,
    category: 'Trending ABACS',
    tags: ['ABACS', 'Vol 2', 'Trending', 'Episodes', 'Exclusive'],
    creator: { name: 'Vault Curator', handle: '@vaultmaster', avatar: 'VC', verified: true },
    rating: 4.9,
    views: 41200,
    publishedAt: '2026-10-07',
    isNewRelease: true
  },
  {
    id: 'vid-114',
    title: 'Studio Lighting & Color Grading Breakdown',
    description: 'Free technical masterclass showing how cinematic desaturated grading and warm skin tones are achieved in Desi productions.',
    thumbnail: generateThumbnailSvg('Color Grading Masterclass', 'Free Masterclass', 'indigo', '▶'),
    backdrop: generateThumbnailSvg('Color Grading Masterclass', 'Tutorial', 'indigo', '▶'),
    videoUrl: SAMPLE_VIDEOS.flower,
    duration: '15:10',
    durationSeconds: 910,
    isFree: true,
    creditPrice: 0,
    previewTrimSeconds: 0,
    category: 'Other',
    tags: ['Tutorial', 'Color Grading', 'Free', 'Filmmaking'],
    creator: { name: 'Cinema Guru', handle: '@cinemaguru', avatar: 'CG' },
    rating: 4.9,
    views: 15200,
    publishedAt: '2026-09-15'
  }
];

export const INITIAL_PACKS: DigitalPack[] = [
  {
    id: 'pack-201',
    title: 'Trending ABACS 9 GB MEGA Mega-Archive',
    description: 'The flagship complete archive hosted on MEGA. Includes 4K video exports, behind the scenes clips, master demo, and organized episode folders.',
    coverImage: generateThumbnailSvg('Trending ABACS 9GB Pack', 'MEGA • 9 GB', 'ruby', '☁'),
    platform: 'MEGA',
    category: 'Trending ABACS',
    fileSize: '9.0 GB',
    creditPrice: 90,
    itemCount: 48,
    includedItems: [
      'Master Demo Video (1080p walkthrough)',
      '18 Extended Cut 4K Videos',
      '24 Backstage Photo Archives (.RAW + .JPG)',
      'High-speed MEGA decrypt key + direct mirror'
    ],
    masterDemoVideoId: 'vid-103',
    accessUrl: 'https://mega.nz/folder/DESI_PRO_ABACS_9GB_SECURE_TOKEN_V8472',
    publishedAt: '2026-10-04',
    rating: 4.9,
    salesCount: 142,
    isFeatured: true
  },
  {
    id: 'pack-202',
    title: 'Indian Spotlight 4.2 GB Google Drive Collection',
    description: 'Organized Google Drive directory featuring Mumbai studio sessions, runway coverage, creator reels, and high-res photo albums with 1-click Drive clone.',
    coverImage: generateThumbnailSvg('Indian Spotlight 4.2GB', 'Google Drive • 4.2 GB', 'pink', '▤'),
    platform: 'Google Drive',
    category: 'Indian',
    fileSize: '4.2 GB',
    creditPrice: 70,
    itemCount: 32,
    includedItems: [
      'Master Demo Video (Drive overview)',
      '12 Studio Master Cut Videos',
      'Shared Team Drive direct link with read permission',
      'Zip mirror for bulk download'
    ],
    masterDemoVideoId: 'vid-108',
    accessUrl: 'https://drive.google.com/drive/folders/DESI_PRO_GDRIVE_INDIAN_SPOTLIGHT_42GB',
    publishedAt: '2026-09-29',
    rating: 4.8,
    salesCount: 98,
    isFeatured: true
  },
  {
    id: 'pack-203',
    title: 'Models & Creators 3.1 GB Telegram VIP Feed',
    description: 'Direct Telegram channel link with daily updates, uncompressed cloud storage, creator tags, and member-only discussions.',
    coverImage: generateThumbnailSvg('Models & Creators 3.1GB', 'Telegram • 3.1 GB', 'rose', '➤'),
    platform: 'Telegram',
    category: 'Models & Creators',
    fileSize: '3.1 GB',
    creditPrice: 65,
    itemCount: 85,
    includedItems: [
      'Permanent invite link to private Telegram VIP channel',
      'Telegram bot auto-verification token',
      'Cloud storage file index with instant preview'
    ],
    masterDemoVideoId: 'vid-107',
    accessUrl: 'https://t.me/+DESI_ERO_PRO_TELEGRAM_VIP_CHANNEL_TOKEN_882',
    publishedAt: '2026-10-02',
    rating: 4.9,
    salesCount: 176
  },
  {
    id: 'pack-204',
    title: 'Pakistani Creators 1.8 GB MEGA Pack',
    description: 'Curated collection of Lahore and Karachi viral releases, creative dance reels, and high-definition creator footage.',
    coverImage: generateThumbnailSvg('Pakistani Creators 1.8GB', 'MEGA • 1.8 GB', 'purple', '☁'),
    platform: 'MEGA',
    category: 'Pakistani',
    fileSize: '1.8 GB',
    creditPrice: 55,
    itemCount: 22,
    includedItems: [
      'Full 1080p video collection',
      'Folder structure organized by creator',
      'Direct MEGA folder key'
    ],
    masterDemoVideoId: 'vid-101',
    accessUrl: 'https://mega.nz/folder/DESI_PRO_PAK_CREATORS_18GB_KEY',
    publishedAt: '2026-09-28',
    rating: 4.7,
    salesCount: 84
  },
  {
    id: 'pack-205',
    title: 'TikTokers Viral Highlight 2.5 GB Drive Pack',
    description: 'The biggest TikTok sensation pack with uncompressed original sound clips, raw choreography angles, and creator assets.',
    coverImage: generateThumbnailSvg('TikTokers Viral 2.5GB', 'Google Drive • 2.5 GB', 'cyan', '▤'),
    platform: 'Google Drive',
    category: 'TikTok Creators',
    fileSize: '2.5 GB',
    creditPrice: 45,
    itemCount: 40,
    includedItems: [
      '40 Raw 1080p 60fps MP4 video files',
      'Audio stems & lip-sync reference cuts',
      'Google Drive fast sync access'
    ],
    masterDemoVideoId: 'vid-106',
    accessUrl: 'https://drive.google.com/drive/folders/DESI_PRO_TIKTOK_VIRAL_25GB',
    publishedAt: '2026-10-05',
    rating: 4.8,
    salesCount: 65
  },
  {
    id: 'pack-206',
    title: 'WhatsApp VIP Community & Link Directory',
    description: 'Verified WhatsApp community group directory with moderated links, member-verified drops, and direct creator announcements.',
    coverImage: generateThumbnailSvg('WhatsApp VIP Community', 'WhatsApp Directory', 'emerald', '◉'),
    platform: 'WhatsApp',
    category: 'Pakistani',
    fileSize: 'Online Directory',
    creditPrice: 15,
    itemCount: 15,
    includedItems: [
      'Verified admin-moderated WhatsApp Community invite',
      'Daily drop notification channel',
      'Member safety and anti-spam verification rules'
    ],
    accessUrl: 'https://chat.whatsapp.com/DESI_ERO_PRO_OFFICIAL_COMMUNITY_VERIFIED',
    publishedAt: '2026-10-06',
    rating: 4.6,
    salesCount: 110
  }
];

export const INITIAL_USER: User = {
  id: 'user-001',
  name: 'Dua Kashmiri',
  email: 'duaakashmiri444@gmail.com',
  avatar: 'DK',
  role: 'admin',
  walletBalance: 250, // Started with 250 demo credits as seen in previous mockups
  membershipTier: 'vip_monthly',
  unlockedVideoIds: ['vid-102', 'vid-109'], // Free videos already accessible
  unlockedPackIds: [],
  favorites: ['vid-101', 'pack-201'],
  watchHistory: [
    {
      videoId: 'vid-101',
      progressSeconds: 240,
      durationSeconds: 1335,
      lastWatchedAt: '2026-10-09T14:20:00Z'
    },
    {
      videoId: 'vid-104',
      progressSeconds: 610,
      durationSeconds: 1130,
      lastWatchedAt: '2026-10-08T19:45:00Z'
    }
  ]
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'txn-101',
    reference: 'TXN-9021-GRANT',
    userId: 'user-001',
    type: 'deposit',
    amount: 250,
    balanceAfter: 250,
    status: 'completed',
    createdAt: '2026-10-08T10:00:00Z',
    paymentMethod: 'Promo Starter Grant'
  }
];

export const INITIAL_SEO: SEOSettings = {
  metaTitle: 'Desi Ero PRO — Video Streaming & Digital Content Marketplace',
  metaDescription: 'Browse full-length videos, watch master demos before buying, and unlock digital packs on MEGA, Google Drive, and Telegram with verified credit delivery.',
  canonicalUrl: 'https://desiero.pro',
  robotsIndex: true,
  ogImage: generateThumbnailSvg('Desi Ero PRO', 'Official Streaming Platform', 'purple', '▶'),
  keywords: 'Desi Ero, streaming, video catalog, master demos, digital packs, MEGA, Google Drive, Telegram, Pakistani videos, Indian creators, credit wallet'
};

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    userId: 'user-001',
    title: 'Welcome to Desi Ero PRO!',
    message: 'Your wallet has been credited with 250 demo credits. Explore the Demo Room or browse digital packs.',
    type: 'promo',
    read: false,
    createdAt: '2026-10-09T08:00:00Z'
  },
  {
    id: 'notif-2',
    userId: 'user-001',
    title: 'New Release: Trending ABACS Vol. 2',
    message: 'A brand new master demo and episode cut has just landed in the catalog.',
    type: 'system',
    read: false,
    createdAt: '2026-10-09T12:30:00Z'
  }
];
