/**
 * Typed client for the Desi Ero Express API (see ../premium-main/server.ts).
 *
 * Every method here maps to a real route; there is no local fallback data.
 * The session travels in the httpOnly `desiero_token` cookie, so callers must not
 * try to attach an Authorization header themselves.
 */

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

/**
 * Hosted media is fetched from the API origin directly, never through this app's own /uploads path.
 * A proxy in front of a video swallows the Range header, and a browser that cannot seek gets a
 * mid-file fragment and reports a format error — desktop tolerates it, mobile does not.
 */
export const MEDIA_ORIGIN = String(
  import.meta.env.VITE_MEDIA_ORIGIN ?? (import.meta.env.DEV ? '' : 'https://desi-ero-production.up.railway.app')
).replace(/\/+$/, '');

/** Absolute address for anything stored in the server's upload folder. */
export function mediaUrl(url: string | null | undefined): string {
  const value = String(url ?? '').trim();
  if (!value.startsWith('/uploads/')) return value;
  return MEDIA_ORIGIN ? `${MEDIA_ORIGIN}${value}` : value;
}

/** True for a file this site hosts itself, whether relative or already prefixed. */
export function isHostedMedia(url: string | null | undefined): boolean {
  const value = String(url ?? '');
  if (value.startsWith('/uploads/')) return true;
  return !!MEDIA_ORIGIN && value.startsWith(`${MEDIA_ORIGIN}/uploads/`);
}

export interface ApiFailure extends Error {
  code: string;
  status: number;
  payload: any;
}

export interface SessionUser {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  avatar_url: string | null;
  created_at?: string;
}

export interface Wallet {
  balance: number;
  currency: string;
  updated_at?: string;
}

export interface WalletStats {
  total_deposited: number;
  total_spent: number;
  total_bonus: number;
}

export interface AccessState {
  has_access: boolean;
  is_expired: boolean;
  is_lifetime: boolean;
  remaining_seconds: number | null;
  expires_at: string | null;
}

export interface ProductRow {
  id: number;
  slug: string;
  title: string;
  category: string | null;
  icon: string | null;
  thumbnail: string | null;
  description: string | null;
  price: number;
  access_duration_type: string | null;
  custom_duration_days: number | null;
  demo_type: string | null;
  demo_url: string | null;
  demo_description: string | null;
  premium_type: string | null;
  premium_resource_url?: string | null;
  premium_resource_meta?: string | null;
  /** The seller's own headline for how big a pack is, e.g. "9 GB". Shown exactly as typed. */
  size_label?: string | null;
  /** ...and how much it holds, e.g. "1100+ videos". */
  contents_label?: string | null;
  tags: string | null;
  status: string;
  views: number;
  demo_views: number;
  purchases_count: number;
  rating: number;
  rating_count: number;
  content_format?: string | null;
  is_favorite?: boolean;
  user_access?: AccessState | null;
  file_count?: number;
  lesson_count?: number;
  /** Lesson rows whose URL really streams in the site player (a Telegram invite is not one). */
  playable_count?: number;
  duration_seconds?: number | null;
  is_streamable?: boolean;
  link_types?: string[];
  categories?: { id: number; name: string; slug: string }[];
  progress_percent?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LessonRow {
  id: number;
  product_id: number;
  title: string;
  description: string | null;
  video_url: string | null;
  video_provider: string | null;
  subtitles_url: string | null;
  subtitles_label: string | null;
  duration_seconds: number;
  sort_order: number;
  is_free_preview: number;
}

export interface MediaRow {
  id: number;
  product_id: number;
  media_type: string;
  url: string | null;
  caption: string | null;
  label: string | null;
  provider: string | null;
  size_bytes: number | null;
  access_level: 'DEMO' | 'PREMIUM';
  sort_order: number;
  locked?: boolean;
}

export interface ReviewRow {
  id: number;
  product_id: number;
  user_id: number;
  username?: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export interface ProductDetail {
  product: ProductRow;
  lessons: LessonRow[];
  media: MediaRow[];
  reviews: ReviewRow[];
  related: ProductRow[];
}

/** Response of GET /api/content/:id/access - the only authorised source of premium URLs. */
export interface ContentAccess {
  authorized: boolean;
  product: {
    id: number;
    title: string;
    premium_type: string | null;
    premium_resource_url: string | null;
    premium_resource_meta: any;
  };
  access: AccessState;
  lessons: LessonRow[];
  files: MediaRow[];
  saved_progress: { position_seconds: number; duration_seconds: number; completion_percent: number } | null;
}

export interface Receipt {
  purchase_id: number;
  product_title: string;
  price_paid: number;
  currency: string;
  balance_remaining: number;
  starts_at: string;
  expires_at: string | null;
  is_lifetime: boolean;
  access_duration_type: string | null;
  reference: string;
}

export interface TransactionRow {
  id: number;
  user_id: number;
  type: 'TOP_UP' | 'PURCHASE' | 'BONUS' | 'GIFT' | 'REFUND' | 'ADJUSTMENT';
  amount: number;
  balance_before: number;
  balance_after: number;
  reference: string | null;
  status: string;
  description: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  link: string | null;
  created_at: string;
}

export interface LibraryEntry {
  purchase_id: number | null;
  product_id: number;
  title: string;
  slug: string;
  category: string | null;
  thumbnail: string | null;
  price: number;
  access_duration_type: string | null;
  premium_type: string | null;
  price_paid?: number;
  starts_at?: string | null;
  expires_at?: string | null;
  purchase_status?: string | null;
  access: AccessState;
  progress: { position_seconds: number; duration_seconds: number; completion_percent: number } | null;
}

export interface LibraryPayload {
  continue_watching: LibraryEntry[];
  purchased: LibraryEntry[];
  completed: LibraryEntry[];
  expired: LibraryEntry[];
  favorites: LibraryEntry[];
}

export interface InputField {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

export interface PaymentMode {
  mode: 'MANUAL' | 'AUTO' | 'LINK';
  status: string;
  label: string | null;
  instructions: string | null;
  input_fields: InputField[];
  link_configured: boolean;
  link_url: string | null;
  gateway_name: string | null;
  gateway_ready: boolean;
}

export interface PaymentProvider {
  code: string;
  name: string;
  description: string | null;
  currency: string;
  credit_rate: number;
  region: string | null;
  modes: PaymentMode[];
}

export interface TopupRow {
  id: number;
  user_id: number;
  method: string;
  amount_credits: number;
  amount_fiat: number;
  currency: string;
  sender_info: string | null;
  reference_id: string;
  proof_image_url: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  network: string | null;
  notes: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  created_at: string;
  username?: string;
  email?: string;
}

export interface MediaAsset {  id: number;
  kind: 'VIDEO' | 'IMAGE' | 'SUBTITLE' | 'ARCHIVE' | 'DOCUMENT' | 'OTHER';
  file_name: string;
  url: string;
  mime_type: string | null;
  size_bytes: number;
  product_id: number | null;
  product_title?: string | null;
  stored_name?: string;
  uploaded_by_name?: string;
  created_at?: string;
}

export interface SupportChannelsPublic {
  whatsapp?: { number?: string; url?: string };
  telegram?: { username?: string; url?: string };
  email?: string;
  hours?: string;
  configured?: boolean;
}

export interface PlatformSettingRow {
  key: string;
  value: string;
  label: string | null;
  description: string | null;
  updated_at: string;
}

export interface AdminProductPayload {
  title: string;
  description?: string;
  price: number;
  category?: string;
  icon?: string;
  thumbnail?: string;
  access_duration_type?: string;
  custom_duration_days?: number | null;
  demo_type?: string;
  demo_url?: string;
  demo_description?: string;
  premium_type?: string;
  premium_resource_url?: string;
  size_label?: string;
  contents_label?: string;
  tags?: string;
  status?: string;
  rights_confirmed: true;
  lessons?: Record<string, unknown>[];
  files?: Record<string, unknown>[];
  /** Public preview photos, written as DEMO access media so shoppers see them before paying. */
  demo_media?: Record<string, unknown>[];
}

/** One day of the dashboard chart. The server zero-fills quiet days so the line has no gaps. */
export interface SeriesPoint {
  day: string;
  revenue?: number;
  sales?: number;
  signups?: number;
  resumes?: number;
}

export interface AdminOverview {
  success: boolean;
  days: number;
  /** A delta of null means there was nothing to compare against, so the UI must not claim growth. */
  kpis: Record<string, number | null>;
  series: { revenue: SeriesPoint[]; signups: SeriesPoint[]; watching: SeriesPoint[] };
  top_products: Array<{ id: number; title: string; slug: string; price: number; status: string; sales: number; revenue: number }>;
  most_viewed: Array<{ id: number; title: string; slug: string; price: number; status: string; views: number; purchases_count: number }>;
  content_mix: Array<{ name: string; count: number }>;
  categories: Array<{ id: number; name: string; count: number }>;
}

export interface AdminUserRow {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  avatar_url: string | null;
  status: string;
  created_at: string;
  wallet_balance: number;
  purchases_count: number;
  spent_credits: number;
  topped_up_credits: number;
  favorites_count: number;
  reviews_count: number;
  watched_count: number;
  last_activity: string | null;
}

export interface AdminPurchaseRow {
  id: number;
  price_paid: number;
  status: string;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  user_id: number;
  username: string;
  email: string;
  product_id: number;
  product_title: string;
  product_slug: string;
  still_valid: number;
}

export interface AdminWalletRow {
  id: number;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference: string | null;
  status: string;
  description: string | null;
  created_at: string;
  user_id: number;
  username: string;
  email: string;
}

export interface AdminCouponRow {
  id: number;
  code: string;
  discount_type: 'PERCENTAGE' | 'FIXED_CREDITS' | string;
  discount_value: number;
  start_date: string | null;
  end_date: string | null;
  usage_limit: number;
  times_used: number;
  min_purchase: number;
  is_active: number;
  redemptions?: number;
  buyers?: number;
}

export interface AdminAuditRow {
  id: number;
  actor_id: number | null;
  actor_name: string;
  actor_email?: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

function errorFrom(status: number, payload: any): ApiFailure {
  const err = new Error(
    payload?.message || payload?.error || `Request failed with status ${status}`
  ) as ApiFailure;
  err.code = payload?.error || `HTTP_${status}`;
  err.status = status;
  err.payload = payload;
  return err;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Plain objects are JSON-encoded; a FormData body is sent as multipart. */
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  if (!isForm && options.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(path, {
    method: options.method ?? 'GET',
    credentials: 'same-origin',
    headers,
    body: isForm ? (options.body as FormData) : options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    /* 204 and proxy failures return no body */
  }

  if (!res.ok || (payload && payload.success === false)) throw errorFrom(res.status, payload);
  return payload as T;
}

/**
 * Multipart upload through XMLHttpRequest so callers get byte progress; a 400 MB
 * video with no progress bar reads as a hung page.
 */
function uploadRequest(
  body: FormData,
  onProgress?: (percent: number) => void
): Promise<MediaAsset> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/uploads');
    xhr.withCredentials = true;
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let payload: any = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        /* fall through to the status-based error below */
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload?.success) resolve(payload.asset as MediaAsset);
      else reject(errorFrom(xhr.status, payload));
    };
    xhr.onerror = () => reject(errorFrom(0, { error: 'NETWORK_ERROR', message: 'Upload failed: cannot reach the server.' }));
    xhr.onabort = () => reject(errorFrom(0, { error: 'ABORTED', message: 'Upload cancelled.' }));
    xhr.send(body);
  });
}

const q = (params: Record<string, string | number | boolean | undefined | null>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const str = search.toString();
  return str ? `?${str}` : '';
};

export const api = {
  auth: {
    me: () =>
      request<{ success: boolean; user: SessionUser | null; wallet: Wallet | null; stats?: { unreadNotifications: number; activePurchases: number } }>(
        '/api/auth/me'
      ),
    login: (email: string, password: string) =>
      request<{ success: boolean; user: SessionUser; wallet: Wallet }>('/api/auth/login', { method: 'POST', body: { email, password } }),
    register: (email: string, username: string, password: string) =>
      request<{ success: boolean; user: SessionUser; wallet: Wallet }>('/api/auth/register', {
        method: 'POST',
        body: { email, username, password },
      }),
    logout: () => request<{ success: boolean; message: string }>('/api/auth/logout', { method: 'POST' }),
  },

  catalogue: {
    list: (params: { category?: string; search?: string; sort?: string; price?: string; limit?: number; page?: number } = {}) =>
      request<{ success: boolean; products: ProductRow[]; total: number; has_more: boolean }>(`/api/products${q(params)}`),
    detail: (idOrSlug: number | string) =>
      request<{ success: boolean } & ProductDetail>(`/api/products/${idOrSlug}`),
    purchase: (productId: number, couponCode?: string) =>
      request<{ success: boolean; message: string; receipt: Receipt }>(`/api/products/${productId}/purchase`, {
        method: 'POST',
        body: couponCode ? { coupon_code: couponCode } : {},
      }),
    toggleFavorite: (productId: number) =>
      request<{ success: boolean; is_favorite: boolean; message: string }>(`/api/products/${productId}/favorite`, { method: 'POST' }),
    submitReview: (productId: number, rating: number, reviewText: string) =>
      request<{ success: boolean; message: string }>(`/api/products/${productId}/reviews`, {
        method: 'POST',
        body: { rating, review_text: reviewText },
      }),
  },

  content: {
    access: (productId: number) => request<ContentAccess & { success: boolean }>(`/api/content/${productId}/access`),
    saveProgress: (payload: { product_id: number; lesson_id?: number | null; position_seconds: number; duration_seconds: number }) =>
      request<{ success: boolean; completion_percent: number }>('/api/content/progress', { method: 'POST', body: payload }),
  },

  library: {
    get: () => request<{ success: boolean; library: LibraryPayload; counts: Record<string, number> }>('/api/library'),
  },

  wallet: {
    get: () => request<{ success: boolean; wallet: Wallet; stats: WalletStats }>('/api/wallet'),
    transactions: () => request<{ success: boolean; transactions: TransactionRow[] }>('/api/wallet/transactions'),
    /**
     * Config-driven manual top-up: the route reads the provider's credit_rate and the
     * mode's own input_fields, so what the buyer is told to send matches what the
     * owner sees in the review queue.
     */
    requestTopUp: (body: {
      method: string;
      credits: number;
      reference_id: string;
      sender_info?: string;
      network?: string;
      notes?: string;
      [key: string]: string | number | undefined;
    }) =>
      request<{ success: boolean; message: string; order_ref: string; topup_id: number; status: 'PENDING' }>(
        '/api/payments/topup/manual',
        { method: 'POST', body }
      ),
    validateCoupon: (code: string, amount?: number) =>
      request<{ success: boolean; coupon: { code: string; discount_type: string; discount_value: number; discount_credits: number } }>(
        '/api/wallet/coupon/validate',
        { method: 'POST', body: { code, amount } }
      ),
  },

  payments: {
    methods: () => request<{ success: boolean; providers: PaymentProvider[]; notice: string | null }>('/api/payments/methods'),
  },

  notifications: {
    list: () => request<{ success: boolean; notifications: NotificationRow[]; unread_count: number }>('/api/notifications'),
    markRead: (id: number) => request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: () => request<{ success: boolean }>('/api/notifications/read-all', { method: 'POST' }),
  },

  settings: {
    public: () => request<{ success: boolean; support: SupportChannelsPublic; catalogue?: { section_size: number } }>('/api/settings/public'),
  },

  admin: {
    stats: () => request<{ success: boolean; stats: Record<string, number | string> }>('/api/admin/stats'),
    /** Every number on the owner dashboard, aggregated from real rows by the server. */
    overview: (days?: number) => request<AdminOverview>(`/api/admin/analytics/overview${q({ days })}`),
    users: (params: { q?: string; role?: string; status?: string } = {}) =>
      request<{ success: boolean; users: AdminUserRow[]; total: number }>(`/api/admin/users${q(params)}`),
    userDetail: (id: number) =>
      request<{
        success: boolean;
        user: AdminUserRow & { currency: string };
        purchases: Array<{ id: number; title: string; price_paid: number; status: string; starts_at: string; expires_at: string | null; created_at: string }>;
        transactions: Array<{ id: number; type: string; amount: number; balance_after: number; status: string; description: string | null; created_at: string }>;
        topups: TopupRow[];
        favorites: Array<{ id: number; title: string; created_at: string }>;
      }>(`/api/admin/users/${id}`),
    setUserRole: (id: number, role: string) =>
      request<{ success: boolean; message: string }>(`/api/admin/users/${id}/role`, { method: 'PUT', body: { role } }),
    setUserStatus: (id: number, status: string, reason?: string) =>
      request<{ success: boolean; message: string }>(`/api/admin/users/${id}/status`, { method: 'PUT', body: { status, reason } }),
    adjustBalance: (id: number, body: { amount: number; reason: string }) =>
      request<{ success: boolean; message: string; new_balance: number }>(`/api/admin/users/${id}/adjust-balance`, { method: 'POST', body }),
    deleteUser: (id: number) => request<{ success: boolean; message: string }>(`/api/admin/users/${id}`, { method: 'DELETE' }),
    purchases: (params: { q?: string; status?: string; limit?: number } = {}) =>
      request<{ success: boolean; purchases: AdminPurchaseRow[]; total: number; credits: number }>(`/api/admin/purchases${q(params)}`),
    walletTransactions: (params: { q?: string; type?: string; status?: string; limit?: number } = {}) =>
      request<{ success: boolean; transactions: AdminWalletRow[]; total: number; credits: number }>(
        `/api/admin/wallet-transactions${q(params)}`
      ),
    coupons: () => request<{ success: boolean; coupons: AdminCouponRow[] }>('/api/admin/coupons'),
    createCoupon: (body: Partial<AdminCouponRow>) =>
      request<{ success: boolean; message: string; id: number }>('/api/admin/coupons', { method: 'POST', body }),
    updateCoupon: (id: number, body: Partial<AdminCouponRow>) =>
      request<{ success: boolean; message: string }>(`/api/admin/coupons/${id}`, { method: 'PUT', body }),
    deleteCoupon: (id: number) => request<{ success: boolean; message: string }>(`/api/admin/coupons/${id}`, { method: 'DELETE' }),
    auditLogs: (params: { q?: string; action?: string; limit?: number } = {}) =>
      request<{ success: boolean; logs: AdminAuditRow[]; actions: string[] }>(`/api/admin/audit-logs${q(params)}`),
    products: () => request<{ success: boolean; products: ProductRow[] }>('/api/admin/products'),
    product: (id: number) =>
      request<{ success: boolean; product: ProductRow; lessons: LessonRow[]; media: MediaRow[]; categories: unknown[]; assets: MediaAsset[] }>(
        `/api/admin/products/${id}`
      ),
    createProduct: (payload: AdminProductPayload) =>
      request<{ success: boolean; message: string; product_id: number; slug: string; lessons: LessonRow[]; files: MediaRow[] }>(
        '/api/admin/products',
        { method: 'POST', body: payload }
      ),
    updateProduct: (id: number, payload: Partial<AdminProductPayload>) =>
      request<{ success: boolean; message: string; product_id: number }>(`/api/admin/products/${id}`, {
        method: 'PUT',
        body: payload,
      }),
    deleteProduct: (id: number) =>
      request<{ success: boolean; message: string }>(`/api/admin/products/${id}`, { method: 'DELETE' }),
    /** Trim a teaser out of the paid video, attach an uploaded clip, or remove the preview. */
    setPreview: (
      id: number,
      body: { mode: 'trim' | 'upload' | 'none'; asset_id?: number; duration_seconds?: number; start_seconds?: number }
    ) =>
      request<{ success: boolean; message: string; demo_url?: string; seconds?: number }>(
        `/api/admin/products/${id}/preview`,
        { method: 'POST', body }
      ),
    /** Read a cover frame from the listing's own video, attach an uploaded image, or clear it. */
    setCover: (id: number, body: { mode: 'auto' | 'upload' | 'none'; asset_id?: number; at_seconds?: number }) =>
      request<{ success: boolean; message: string; thumbnail?: string }>(
        `/api/admin/products/${id}/thumbnail`,
        { method: 'POST', body }
      ),
    attachAsset: (
      productId: number,
      body: {
        asset_id: number;
        media_type?: string;
        caption?: string;
        label?: string;
        provider?: string;
        access_level?: 'DEMO' | 'PREMIUM';
        sort_order?: number;
      }
    ) => request<{ success: boolean; message: string; media: MediaRow }>(`/api/admin/products/${productId}/media`, { method: 'POST', body }),
    addLesson: (productId: number, body: { title: string; video_url: string; duration_seconds?: number; is_free_preview?: number; video_provider?: string }) =>
      request<{ success: boolean; lesson: LessonRow }>(`/api/admin/products/${productId}/lessons`, { method: 'POST', body }),
    deleteLesson: (lessonId: number) => request<{ success: boolean }>(`/api/admin/lessons/${lessonId}`, { method: 'DELETE' }),
    deleteMedia: (mediaId: number) => request<{ success: boolean }>(`/api/admin/media/${mediaId}`, { method: 'DELETE' }),
    upload: (file: File, kind: string, productId: number | null, onProgress?: (percent: number) => void) => {
      const body = new FormData();
      body.set('file', file);
      body.set('kind', kind);
      if (productId) body.set('product_id', String(productId));
      return uploadRequest(body, onProgress);
    },
    uploads: (params: { product_id?: number; kind?: string } = {}) =>
      request<{ success: boolean; assets: MediaAsset[]; totals: { count: number; bytes: number; max_upload_mb: number } }>(
        `/api/uploads${q(params)}`
      ),
    deleteUpload: (assetId: number) => request<{ success: boolean; message: string }>(`/api/uploads/${assetId}`, { method: 'DELETE' }),
    topups: (status?: string) => request<{ success: boolean; topups: TopupRow[] }>(`/api/admin/topups${q({ status })}`),
    approveTopup: (id: number) => request<{ success: boolean; message: string }>(`/api/admin/topups/${id}/approve`, { method: 'POST' }),
    rejectTopup: (id: number, reason?: string) =>
      request<{ success: boolean; message: string }>(`/api/admin/topups/${id}/reject`, { method: 'POST', body: { reason } }),
    categories: () =>
      request<{ success: boolean; categories: { id: number; name: string; slug: string; icon?: string; product_count?: number; is_active: number }[] }>(
        '/api/categories'
      ),
    createCategory: (body: { name: string; slug?: string; icon?: string; description?: string }) =>
      request<{ success: boolean; category: { id: number; name: string; slug: string } }>('/api/categories', { method: 'POST', body }),
    updateCategory: (id: number, body: { name?: string; slug?: string; icon?: string; description?: string; is_active?: number; sort_order?: number }) =>
      request<{ success: boolean; message: string; category: { id: number; name: string; slug: string } }>(`/api/categories/${id}`, {
        method: 'PUT',
        body,
      }),
    deleteCategory: (id: number, force = false) =>
      request<{ success: boolean; message: string }>(`/api/categories/${id}${force ? '?force=1' : ''}`, { method: 'DELETE' }),
    restoreDefaultCategories: () =>
      request<{ success: boolean; message: string; added: number }>('/api/categories/restore-defaults', { method: 'POST' }),
    settings: () => request<{ success: boolean; settings: PlatformSettingRow[] }>('/api/admin/config/settings'),
    saveSettings: (settings: Record<string, string>) =>
      request<{ success: boolean; message: string; settings: PlatformSettingRow[] }>('/api/admin/config/settings', {
        method: 'PUT',
        body: { settings },
      }),
  },
};
