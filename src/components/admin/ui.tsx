import React from 'react';

/**
 * Small building blocks shared by every admin screen, so a status reads the same way in the
 * payment ledger as it does in the users table.
 */

type Tone = 'green' | 'amber' | 'red' | 'purple' | 'blue' | 'slate';

const TONES: Record<Tone, string> = {
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  red: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  blue: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  slate: 'bg-white/5 text-slate-400 border-white/10'
};

/** Anything the platform can name as a state maps to a colour; unknown states stay neutral. */
export function toneFor(value?: string | null): Tone {
  const key = String(value || '').toUpperCase();
  if (['ACTIVE', 'COMPLETED', 'APPROVED', 'PUBLISHED', 'SUCCESS'].includes(key)) return 'green';
  if (['PENDING', 'PROCESSING', 'INGESTING', 'DRAFT', 'EXPIRING'].includes(key)) return 'amber';
  if (['REJECTED', 'BANNED', 'SUSPENDED', 'CANCELLED', 'FAILED', 'EXPIRED', 'REFUNDED'].includes(key)) return 'red';
  if (['TOP_UP', 'BONUS', 'GIFT'].includes(key)) return 'purple';
  if (['PURCHASE', 'ADJUSTMENT'].includes(key)) return 'blue';
  return 'slate';
}

export const Pill: React.FC<{ value?: string | null; children?: React.ReactNode }> = ({ value, children }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${TONES[toneFor(value ?? String(children || ''))]}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current" />
    {children ?? value}
  </span>
);

export const Card: React.FC<{ title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  action,
  children,
  className = ''
}) => (
  <section className={`rounded-2xl bg-[#141626] border border-white/10 p-4 sm:p-5 ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between gap-3 mb-4">
        {title && <h3 className="font-bold text-white text-sm">{title}</h3>}
        {action}
      </div>
    )}
    {children}
  </section>
);

export const Field: React.FC<{
  label: string;
  value: string | number;
  onChange: (next: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}> = ({ label, value, onChange, type = 'text', placeholder, hint }) => (
  <label className="block">
    <span className="block text-[11px] font-semibold text-slate-400 mb-1">{label}</span>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[#0f1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-purple-500/60 focus:outline-none"
    />
    {hint && <span className="block text-[10px] text-slate-500 mt-1">{hint}</span>}
  </label>
);

export const Select: React.FC<{
  label?: string;
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
}> = ({ label, value, onChange, options }) => (
  <label className="block">
    {label && <span className="block text-[11px] font-semibold text-slate-400 mb-1">{label}</span>}
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[#0f1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500/60 focus:outline-none"
    >
      {options.map(option => (
        <option key={option.value} value={option.value} className="bg-[#0f1120]">
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

export const SearchBox: React.FC<{ value: string; onChange: (next: string) => void; placeholder: string; className?: string }> = ({
  value,
  onChange,
  placeholder,
  className = ''
}) => (
  <input
    type="search"
    value={value}
    placeholder={placeholder}
    onChange={e => onChange(e.target.value)}
    className={`bg-[#0f1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-purple-500/60 focus:outline-none ${className}`}
  />
);

export const EmptyRow: React.FC<{ colSpan: number; children: React.ReactNode }> = ({ colSpan, children }) => (
  <tr>
    <td colSpan={colSpan} className="p-8 text-center text-xs text-slate-500">
      {children}
    </td>
  </tr>
);

export const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <th className={`p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${className}`}>{children}</th>
);

export const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`p-3 align-middle ${className}`}>{children}</td>
);

/** Initials avatar — the platform stores no avatar uploads yet, so a face is drawn from the name. */
export const Avatar: React.FC<{ name?: string | null; src?: string | null }> = ({ name, src }) => {
  const label = String(name || '?').trim().slice(0, 2).toUpperCase();
  if (src) {
    return <img src={src} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />;
  }
  return (
    <span className="w-8 h-8 rounded-full bg-purple-600/25 border border-purple-500/30 text-purple-200 text-[11px] font-bold flex items-center justify-center shrink-0">
      {label}
    </span>
  );
};

export const credits = (value?: number | null): string => `${Math.round(Number(value || 0)).toLocaleString()} CR`;

export const compact = (value?: number | null): string => Number(value || 0).toLocaleString();

export function shortDate(iso?: string | null): string {
  if (!iso) return '—';
  const stamp = Date.parse(iso);
  if (!Number.isFinite(stamp)) return String(iso).slice(0, 10);
  return new Date(stamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function dateTime(iso?: string | null): string {
  if (!iso) return '—';
  const stamp = Date.parse(iso);
  if (!Number.isFinite(stamp)) return String(iso);
  return new Date(stamp).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** "3h ago" reads better in an activity feed than a full timestamp. */
export function timeAgo(iso?: string | null): string {
  if (!iso) return 'never';
  const stamp = Date.parse(iso);
  if (!Number.isFinite(stamp)) return 'unknown';
  const seconds = Math.max(0, Math.round((Date.now() - stamp) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days}d ago`;
  return shortDate(iso);
}

export const IconButton: React.FC<{ onClick: () => void; title: string; children: React.ReactNode; tone?: 'default' | 'danger' }> = ({
  onClick,
  title,
  children,
  tone = 'default'
}) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`p-1.5 rounded-lg border transition-colors ${
      tone === 'danger'
        ? 'border-rose-500/30 text-rose-300 hover:bg-rose-500/15'
        : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    {children}
  </button>
);
