import React, { useCallback, useEffect, useState } from 'react';
import { store } from '../../services/store';
import type { AdminPurchaseRow, AdminWalletRow, TopupRow } from '../../services/api';
import { Avatar, Card, EmptyRow, Pill, SearchBox, Select, Td, Th, credits, dateTime } from './ui';
import { CheckCircle, XCircle } from 'lucide-react';

const LEDGERS = [
  { id: 'unlocks', label: 'Unlocks' },
  { id: 'wallet', label: 'Wallet movements' },
  { id: 'topups', label: 'Top-up review' }
] as const;

type Ledger = (typeof LEDGERS)[number]['id'];

const PURCHASE_STATUS = [
  { value: '', label: 'Any status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

const TX_TYPES = [
  { value: '', label: 'Every movement' },
  { value: 'TOP_UP', label: 'Top-ups' },
  { value: 'PURCHASE', label: 'Purchases' },
  { value: 'REFUND', label: 'Refunds' },
  { value: 'BONUS', label: 'Bonuses' },
  { value: 'ADJUSTMENT', label: 'Staff adjustments' }
];

const LIMITS = [
  { value: '50', label: 'Latest 50' },
  { value: '100', label: 'Latest 100' },
  { value: '200', label: 'Latest 200' }
];

/**
 * The money view. Every row here is a real ledger entry — nothing is marked paid until the owner
 * approves the reference in the review queue.
 */
export const PaymentsPanel: React.FC<{ isSuper: boolean; onToast: (msg: string) => void }> = ({ isSuper, onToast }) => {
  const [ledger, setLedger] = useState<Ledger>('unlocks');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [limit, setLimit] = useState('100');
  const [purchases, setPurchases] = useState<AdminPurchaseRow[]>([]);
  const [transactions, setTransactions] = useState<AdminWalletRow[]>([]);
  const [topups, setTopups] = useState<TopupRow[]>([]);
  const [totals, setTotals] = useState({ count: 0, credits: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (ledger === 'unlocks') {
      const result = await store.loadPurchases({ q: search, status: filter, limit: Number(limit) });
      setPurchases(result?.purchases ?? []);
      setTotals({ count: Number(result?.total || 0), credits: Number(result?.credits || 0) });
    } else if (ledger === 'wallet') {
      const result = await store.loadWalletTransactions({ q: search, type: filter, limit: Number(limit) });
      setTransactions(result?.transactions ?? []);
      setTotals({ count: Number(result?.total || 0), credits: Number(result?.credits || 0) });
    } else {
      const rows = await store.loadTopups(filter || undefined);
      setTopups(rows);
      const creditsSum = rows.filter(row => row.status === 'APPROVED').reduce((sum, row) => sum + Number(row.amount_credits || 0), 0);
      setTotals({ count: rows.length, credits: creditsSum });
    }
    setLoading(false);
  }, [ledger, search, filter, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setFilter('');
  }, [ledger]);

  const review = async (topup: TopupRow, approve: boolean) => {
    // The reason is what the buyer sees in their notification, so the owner types it per reference.
    const reason = approve
      ? undefined
      : window.prompt(
          `Reject top-up #${topup.id} (${topup.amount_credits} credits for ${topup.reference_id})? No credits are added.`,
          'Payment not found in our account'
        );
    if (!approve && reason === null) return;
    const result = approve ? await store.approveTopup(topup.id) : await store.rejectTopup(topup.id, reason ?? undefined);
    onToast(result.message);
    if (result.success) {
      // The sidebar badge counts pending references from the admin stats, so it has to be re-read
      // or the owner keeps chasing a queue they already emptied.
      void store.loadAdmin();
      void load();
    }
  };

  const pending = topups.filter(topup => topup.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-white text-lg">
          Payments <span className="text-slate-500 text-sm font-semibold">{totals.count} rows · {credits(totals.credits)}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Buyer, listing or reference" className="w-52" />
          {ledger === 'unlocks' && <Select value={filter} onChange={setFilter} options={PURCHASE_STATUS} />}
          {ledger === 'wallet' && <Select value={filter} onChange={setFilter} options={TX_TYPES} />}
          {ledger === 'topups' && (
            <Select
              value={filter}
              onChange={setFilter}
              options={[
                { value: '', label: 'All reviews' },
                { value: 'PENDING', label: 'Waiting' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' }
              ]}
            />
          )}
          {ledger !== 'topups' && <Select value={limit} onChange={setLimit} options={LIMITS} />}
        </div>
      </div>

      <div className="flex gap-1 bg-[#121422] p-1 rounded-xl border border-white/10 w-fit">
        {LEDGERS.map(option => (
          <button
            key={option.id}
            onClick={() => setLedger(option.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              ledger === option.id ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {option.label}
            {option.id === 'topups' && pending > 0 && <span className="ml-1.5 text-amber-300">{pending}</span>}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#121422] overflow-hidden">
        <div className="overflow-x-auto">
          {ledger === 'unlocks' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5">
                <tr>
                  <Th>When</Th>
                  <Th>Buyer</Th>
                  <Th>Listing</Th>
                  <Th className="text-right">Paid</Th>
                  <Th>Access until</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(row => (
                  <tr key={row.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <Td className="text-slate-400 whitespace-nowrap">{dateTime(row.created_at)}</Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        <Avatar name={row.username} />
                        <span className="text-white font-semibold">@{row.username}</span>
                      </span>
                    </Td>
                    <Td className="max-w-[240px] truncate text-slate-300">{row.product_title}</Td>
                    <Td className="text-right tabular-nums text-purple-300 font-bold">{credits(row.price_paid)}</Td>
                    <Td className="text-slate-400 whitespace-nowrap">{row.expires_at ? dateTime(row.expires_at) : 'Lifetime'}</Td>
                    <Td>
                      <Pill value={row.status === 'ACTIVE' && !row.still_valid ? 'EXPIRED' : row.status} />
                    </Td>
                  </tr>
                ))}
                {!purchases.length && <EmptyRow colSpan={6}>{loading ? 'Reading the ledger…' : 'No unlock matches those filters.'}</EmptyRow>}
              </tbody>
            </table>
          )}

          {ledger === 'wallet' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5">
                <tr>
                  <Th>When</Th>
                  <Th>Buyer</Th>
                  <Th>Movement</Th>
                  <Th className="text-right">Amount</Th>
                  <Th className="text-right">Balance after</Th>
                  <Th>Reference</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(row => (
                  <tr key={row.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <Td className="text-slate-400 whitespace-nowrap">{dateTime(row.created_at)}</Td>
                    <Td className="text-white font-semibold">@{row.username}</Td>
                    <Td>
                      <Pill value={row.type} />
                    </Td>
                    <Td className={`text-right tabular-nums font-bold ${row.amount < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {row.amount > 0 ? '+' : ''}
                      {row.amount}
                    </Td>
                    <Td className="text-right tabular-nums text-slate-300">{row.balance_after}</Td>
                    <Td className="text-slate-500 font-mono text-[10px]">{row.reference || '—'}</Td>
                    <Td>
                      <Pill value={row.status} />
                    </Td>
                  </tr>
                ))}
                {!transactions.length && <EmptyRow colSpan={7}>{loading ? 'Reading the ledger…' : 'No movement matches those filters.'}</EmptyRow>}
              </tbody>
            </table>
          )}

          {ledger === 'topups' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5">
                <tr>
                  <Th>Submitted</Th>
                  <Th>Buyer</Th>
                  <Th>Method</Th>
                  <Th className="text-right">Credits</Th>
                  <Th className="text-right">Fiat claimed</Th>
                  <Th>Reference</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Decision</Th>
                </tr>
              </thead>
              <tbody>
                {topups.map(row => (
                  <tr key={row.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <Td className="text-slate-400 whitespace-nowrap">{dateTime(row.created_at)}</Td>
                    <Td>
                      <span className="text-white font-semibold">@{row.username}</span>
                      <span className="block text-[10px] text-slate-500">{row.email}</span>
                    </Td>
                    <Td className="text-slate-300">{row.method}</Td>
                    <Td className="text-right tabular-nums text-purple-300 font-bold">{row.amount_credits}</Td>
                    <Td className="text-right tabular-nums">
                      {row.amount_fiat} {row.currency}
                    </Td>
                    <Td className="font-mono text-[10px] text-slate-400">{row.reference_id}</Td>
                    <Td>
                      <Pill value={row.status} />
                    </Td>
                    <Td>
                      {row.status === 'PENDING' && isSuper ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => void review(row, true)}
                            title="Approve and credit the wallet"
                            className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => void review(row, false)}
                            title="Reject — no credits are added"
                            className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="block text-right text-[10px] text-slate-600">
                          {row.status === 'PENDING' ? 'owner only' : dateTime(row.reviewed_at || row.created_at)}
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
                {!topups.length && <EmptyRow colSpan={8}>{loading ? 'Loading reviews…' : 'Nothing waiting for a decision.'}</EmptyRow>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Card>
        <p className="text-[11px] text-slate-500">
          Credits only enter a wallet when you approve the reference. Rejecting leaves the balance untouched.
        </p>
      </Card>
    </div>
  );
};
