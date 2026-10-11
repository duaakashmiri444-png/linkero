import React from 'react';
import type { AdminAuditRow, AdminOverview } from '../../services/api';
import { humanBytes } from '../../services/mappers';
import { AreaChart, BarChart, Delta, ShareBar } from './Charts';
import { Card, Pill, Td, Th, compact, credits, timeAgo } from './ui';

const MIX_COLORS = ['#a855f7', '#22d3ee', '#f472b6', '#f59e0b', '#34d399', '#60a5fa'];

const WINDOWS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' }
];

const KPI = ({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) => (
  <div className="p-4 rounded-2xl bg-[#141626] border border-white/10">
    <span className="text-[11px] font-semibold text-slate-400">{label}</span>
    <div className="text-2xl font-black text-white mt-1 tabular-nums leading-tight">{value}</div>
    {sub && <div className="mt-1">{sub}</div>}
  </div>
);

export const DashboardPanel: React.FC<{
  overview: AdminOverview | null;
  logs: AdminAuditRow[];
  loading: boolean;
  onDays: (days: number) => void;
  onGo: (tab: string) => void;
}> = ({ overview, logs, loading, onDays, onGo }) => {
  const k = overview?.kpis || {};
  const revenue = (overview?.series.revenue || []).map(point => ({
    label: point.day.slice(5),
    value: Number(point.revenue || 0),
    extra: Number(point.sales || 0),
    extraLabel: 'sales'
  }));
  const signups = (overview?.series.signups || []).map(point => ({ label: point.day.slice(5), value: Number(point.signups || 0) }));
  const watching = (overview?.series.watching || []).map(point => ({ label: point.day.slice(5), value: Number(point.resumes || 0) }));

  const mix = (overview?.content_mix || []).map((row, index) => ({
    label: String(row.name || 'OTHER').replace(/_/g, ' '),
    value: Number(row.count || 0),
    color: MIX_COLORS[index % MIX_COLORS.length]
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-white text-lg">Overview</h2>
        <div className="flex gap-1 bg-[#121422] p-1 rounded-xl border border-white/10">
          {WINDOWS.map(option => (
            <button
              key={option.value}
              onClick={() => onDays(Number(option.value))}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                Number(option.value) === (overview?.days || 30) ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!overview && (
        <p className="text-xs text-slate-500 py-10 text-center">{loading ? 'Reading the ledger…' : 'No numbers to show yet.'}</p>
      )}

      {overview && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPI label="Revenue" value={credits(k.revenue_total)} sub={<Delta value={k.revenue_7d_delta} />} />
            <KPI label="Unlocks" value={compact(k.sales_total)} sub={<Delta value={k.sales_7d_delta} />} />
            <KPI label="Buyers" value={compact(k.users_total)} sub={<span className="text-[11px] text-slate-500">{compact(k.users_new_7d)} joined this week</span>} />
            <KPI label="Credits in wallets" value={credits(k.credits_held)} sub={<span className="text-[11px] text-slate-500">{compact(k.listings_published)} live listings</span>} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <KPI label="Sold this week" value={credits(k.revenue_7d)} sub={<span className="text-[11px] text-slate-500">{compact(k.sales_7d)} unlocks</span>} />
            <KPI
              label="Waiting on you"
              value={compact(k.pending_topups)}
              sub={<span className="text-[11px] text-slate-500">{credits(k.pending_topup_credits)} to approve</span>}
            />
            <KPI label="Streamed minutes" value={compact(k.stream_minutes)} sub={<span className="text-[11px] text-slate-500">{compact(k.lesson_count)} lessons</span>} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Revenue by day">
              <AreaChart points={revenue} />
            </Card>
            <Card title="New buyers by day">
              <BarChart points={signups} color="#34d399" />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Watch activity" className="lg:col-span-1">
              <BarChart points={watching} color="#22d3ee" height={100} />
            </Card>
            <Card title="Catalogue mix">
              {mix.length ? <ShareBar slices={mix} /> : <p className="text-xs text-slate-500">Nothing published yet.</p>}
              <div className="mt-4 space-y-1.5">
                <Row label="Storage used" value={`${humanBytes(Number(k.storage_bytes || 0))} · ${compact(k.media_assets)} files`} />
                <Row label="Views" value={compact(k.views_total)} />
                <Row label="Credits topped up" value={credits(k.credits_topped_up)} />
                <Row label="Credits spent" value={credits(k.credits_spent)} />
              </div>
            </Card>
            <Card title="Staff shortcuts">
              <div className="grid grid-cols-2 gap-2">
                <Shortcut label="Publish a video" onClick={() => onGo('videos')} />
                <Shortcut label="Publish a pack" onClick={() => onGo('packs')} />
                <Shortcut label="Review payments" onClick={() => onGo('payments')} />
                <Shortcut label="Manage buyers" onClick={() => onGo('users')} />
                <Shortcut label="Coupons" onClick={() => onGo('coupons')} />
                <Shortcut label="Platform settings" onClick={() => onGo('settings')} />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Best sellers">
              {overview.top_products.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        <Th>Listing</Th>
                        <Th className="text-right">Sales</Th>
                        <Th className="text-right">Revenue</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.top_products.map(product => (
                        <tr key={product.id} className="border-b border-white/5 last:border-0">
                          <Td className="text-white font-semibold max-w-[220px] truncate">{product.title}</Td>
                          <Td className="text-right tabular-nums">{product.sales}</Td>
                          <Td className="text-right tabular-nums text-purple-300 font-semibold">{credits(product.revenue)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Nothing has sold yet. The list fills in as buyers unlock listings.</p>
              )}
            </Card>

            <Card title="Most viewed">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <Th>Listing</Th>
                      <Th className="text-right">Views</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.most_viewed.map(product => (
                      <tr key={product.id} className="border-b border-white/5 last:border-0">
                        <Td className="text-white max-w-[220px] truncate">{product.title}</Td>
                        <Td className="text-right tabular-nums">{compact(product.views)}</Td>
                        <Td>
                          <Pill value={product.status} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card title="Recent staff activity">
            {logs.length ? (
              <ul className="space-y-2">
                {logs.slice(0, 8).map(log => (
                  <li key={log.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500 w-16 shrink-0">{timeAgo(log.created_at)}</span>
                    <Pill value={log.action} />
                    <span className="text-slate-400 truncate max-w-[420px]">{log.details}</span>
                    <span className="text-slate-600">by {log.actor_name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No staff actions recorded yet.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-[11px]">
    <span className="text-slate-500">{label}</span>
    <span className="text-white font-semibold tabular-nums">{value}</span>
  </div>
);

const Shortcut: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="text-left px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
  >
    {label}
  </button>
);
