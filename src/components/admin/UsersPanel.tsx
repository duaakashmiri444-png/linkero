import React, { useEffect, useState } from 'react';
import { store } from '../../services/store';
import type { AdminUserRow } from '../../services/api';
import { Avatar, Card, EmptyRow, Field, IconButton, Pill, SearchBox, Select, Td, Th, credits, dateTime, shortDate, timeAgo } from './ui';
import { Pencil, ShieldAlert, Trash2, UserRound, Wallet } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'USER', label: 'Buyers' },
  { value: 'ADMIN', label: 'Staff' },
  { value: 'SUPER_ADMIN', label: 'Owner' }
];

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'BANNED', label: 'Banned' }
];

type Drawer = { user: AdminUserRow; purchases: any[]; transactions: any[]; topups: any[]; favorites: any[] } | null;

export const UsersPanel: React.FC<{ isSuper: boolean; onToast: (msg: string) => void; onChanged: () => void }> = ({
  isSuper,
  onToast,
  onChanged
}) => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [adjustFor, setAdjustFor] = useState<AdminUserRow | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      void store.loadUsers({ q: search, role, status }).then(rows => {
        if (!cancelled) {
          setUsers(rows);
          setLoading(false);
        }
      });
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, role, status]);

  const open = async (user: AdminUserRow) => {
    if (!isSuper) {
      onToast('Only the owner can read a buyer account.');
      return;
    }
    const detail = await store.loadUserDetail(user.id);
    if (detail) setDrawer({ ...detail, user: detail.user || user });
  };

  const setRoleFor = async (user: AdminUserRow, next: string) => {
    const result = await store.setUserRole(user.id, next);
    onToast(result.message);
    if (result.success) {
      onChanged();
      setUsers(await store.loadUsers({ q: search, role, status }));
    }
  };

  const setStatusFor = async (user: AdminUserRow, next: string) => {
    const result = await store.setUserStatus(user.id, next, next === 'ACTIVE' ? undefined : 'Suspended by the owner from the control panel.');
    onToast(result.message);
    if (result.success) {
      onChanged();
      setUsers(await store.loadUsers({ q: search, role, status }));
    }
  };

  const remove = async (user: AdminUserRow) => {
    if (!window.confirm(`Delete @${user.username} completely? Their purchases, wallet history and progress go with it.`)) return;
    const result = await store.deleteUser(user.id);
    onToast(result.message);
    if (result.success) {
      onChanged();
      setUsers(await store.loadUsers({ q: search, role, status }));
    }
  };

  const submitAdjust = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adjustFor) return;
    const result = await store.adjustBalance(adjustFor.id, Number(amount), reason.trim());
    onToast(result.message);
    if (result.success) {
      setAdjustFor(null);
      setAmount('');
      setReason('');
      onChanged();
      setUsers(await store.loadUsers({ q: search, role, status }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-white text-lg">
          People <span className="text-slate-500 text-sm font-semibold">{users.length}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Name or email" className="w-44" />
          <Select value={role} onChange={setRole} options={ROLE_OPTIONS} />
          <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#121422] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5">
              <tr>
                <Th>Buyer</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th className="text-right">Wallet</Th>
                <Th className="text-right">Spent</Th>
                <Th className="text-right">Unlocks</Th>
                <Th>Last seen</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <Td>
                    <button onClick={() => void open(user)} className="flex items-center gap-2.5 text-left group">
                      <Avatar name={user.username} src={user.avatar_url} />
                      <span className="min-w-0">
                        <span className="block font-bold text-white group-hover:text-purple-300 truncate max-w-[160px]">@{user.username}</span>
                        <span className="block text-[10px] text-slate-500 truncate max-w-[160px]">{user.email}</span>
                      </span>
                    </button>
                  </Td>
                  <Td>
                    {isSuper && user.id !== store.getUser().id ? (
                      <select
                        value={user.role}
                        onChange={e => void setRoleFor(user, e.target.value)}
                        className="bg-[#0f1120] border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-slate-300 focus:outline-none"
                      >
                        <option value="USER">Buyer</option>
                        <option value="ADMIN">Staff</option>
                        <option value="SUPER_ADMIN">Owner</option>
                      </select>
                    ) : (
                      <Pill value={user.role === 'SUPER_ADMIN' ? 'OWNER' : user.role === 'ADMIN' ? 'STAFF' : 'BUYER'} />
                    )}
                  </Td>
                  <Td>
                    <Pill value={user.status} />
                  </Td>
                  <Td className="text-right tabular-nums text-purple-300 font-bold">{credits(user.wallet_balance)}</Td>
                  <Td className="text-right tabular-nums">{credits(user.spent_credits)}</Td>
                  <Td className="text-right tabular-nums">{user.purchases_count}</Td>
                  <Td className="text-slate-400">{timeAgo(user.last_activity)}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <IconButton onClick={() => void open(user)} title="Open account">
                        <UserRound className="w-3.5 h-3.5" />
                      </IconButton>
                      {isSuper && (
                        <IconButton onClick={() => setAdjustFor(user)} title="Adjust balance">
                          <Wallet className="w-3.5 h-3.5" />
                        </IconButton>
                      )}
                      {isSuper && user.id !== store.getUser().id && (
                        <>
                          <IconButton onClick={() => void setStatusFor(user, user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')} title={user.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}>
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </IconButton>
                          <IconButton tone="danger" onClick={() => void remove(user)} title="Delete account">
                            <Trash2 className="w-3.5 h-3.5" />
                          </IconButton>
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
              {!users.length && (
                <EmptyRow colSpan={8}>{loading ? 'Loading accounts…' : 'No account matches those filters.'}</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isSuper && (
        <p className="text-[11px] text-slate-500">Staff accounts can read this list. Roles, suspensions and balance changes belong to the owner.</p>
      )}

      {drawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end" onClick={() => setDrawer(null)}>
          <div
            className="w-full max-w-md h-full bg-[#0f1120] border-l border-white/10 overflow-y-auto p-5 space-y-5"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={drawer.user.username} src={drawer.user.avatar_url} />
                <div>
                  <h3 className="font-black text-white text-lg leading-tight">@{drawer.user.username}</h3>
                  <p className="text-[11px] text-slate-500">{drawer.user.email}</p>
                </div>
              </div>
              <button onClick={() => setDrawer(null)} className="text-slate-500 hover:text-white text-xl leading-none">
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Stat label="Wallet" value={credits(drawer.user.wallet_balance)} />
              <Stat label="Lifetime spend" value={credits(drawer.user.spent_credits)} />
              <Stat label="Top-ups" value={credits(drawer.user.topped_up_credits)} />
              <Stat label="Joined" value={shortDate(drawer.user.created_at)} />
              <Stat label="Watch progress" value={`${drawer.user.watched_count} items`} />
              <Stat label="Favourites" value={String(drawer.user.favorites_count)} />
            </div>

            <Card title={`Unlocks (${drawer.purchases.length})`}>
              {drawer.purchases.length ? (
                <ul className="space-y-2">
                  {drawer.purchases.slice(0, 12).map((purchase: any) => (
                    <li key={purchase.id} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-white truncate">{purchase.title}</span>
                      <span className="text-slate-500 shrink-0">{dateTime(purchase.created_at)}</span>
                      <Pill value={purchase.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">Has not unlocked anything yet.</p>
              )}
            </Card>

            <Card title={`Wallet history (${drawer.transactions.length})`}>
              {drawer.transactions.length ? (
                <ul className="space-y-2">
                  {drawer.transactions.slice(0, 12).map((entry: any) => (
                    <li key={entry.id} className="flex items-center justify-between gap-2 text-[11px]">
                      <Pill value={entry.type} />
                      <span className={`tabular-nums font-bold ${Number(entry.amount) < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                        {Number(entry.amount) > 0 ? '+' : ''}
                        {entry.amount}
                      </span>
                      <span className="text-slate-500 truncate flex-1">{entry.description}</span>
                      <span className="text-slate-600 shrink-0">{dateTime(entry.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No credit movements recorded.</p>
              )}
            </Card>
          </div>
        </div>
      )}

      {adjustFor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setAdjustFor(null)}>
          <form
            onSubmit={submitAdjust}
            onClick={event => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-[#141626] border border-white/10 p-5 space-y-4"
          >
            <div>
              <h3 className="font-bold text-white">Adjust @{adjustFor.username}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Current balance {credits(adjustFor.wallet_balance)}. A reason is required and goes in the audit log.
              </p>
            </div>
            <Field label="Credits (negative to take back)" value={amount} onChange={setAmount} type="number" placeholder="e.g. 50 or -20" />
            <Field label="Reason" value={reason} onChange={setReason} placeholder="e.g. Goodwill credit for a failed download" />
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setAdjustFor(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!amount.trim() || !reason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Apply
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
    <span className="block text-[10px] text-slate-500 uppercase tracking-wide">{label}</span>
    <span className="block text-sm font-bold text-white mt-0.5">{value}</span>
  </div>
);
