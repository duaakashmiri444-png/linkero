import React, { useEffect, useState } from 'react';
import { store } from '../../services/store';
import type { AdminAuditRow } from '../../services/api';
import { Card, dateTime, EmptyRow, SearchBox, Select, Td, Th } from './ui';
import { Search } from 'lucide-react';

const LIMITS = [
  { value: '50', label: 'Latest 50' },
  { value: '200', label: 'Latest 200' },
  { value: '500', label: 'Latest 500' }
];

/** Colouring by verb lets an owner spot a deletion in a long list without reading every row. */
function actionTone(action: string): string {
  const key = action.toUpperCase();
  if (key.startsWith('DELETE') || key.includes('REJECT') || key.includes('BAN') || key.includes('SUSPEND')) return 'text-rose-300 border-rose-500/30 bg-rose-500/10';
  if (key.startsWith('CREATE') || key.includes('APPROVE') || key.includes('PUBLISH')) return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
  if (key.includes('UPDATE') || key.includes('SET') || key.includes('ADJUST')) return 'text-sky-300 border-sky-500/30 bg-sky-500/10';
  return 'text-slate-300 border-white/10 bg-white/5';
}

/**
 * Every staff mutation the backend accepted, newest first. This is the record the owner reads when
 * a listing, a wallet balance or a role changed without anyone remembering who did it.
 */
export const AuditPanel: React.FC<{ isSuper: boolean }> = ({ isSuper }) => {
  const [logs, setLogs] = useState<AdminAuditRow[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [limit, setLimit] = useState('200');

  useEffect(() => {
    if (!isSuper) return;
    const timer = setTimeout(() => {
      void store.loadAuditLogs({ q: search.trim(), action: action || undefined, limit: Number(limit) }).then(result => {
        if (!result) return;
        setLogs(result.logs);
        setActions(result.actions);
      });
    }, 220);
    return () => clearTimeout(timer);
  }, [isSuper, search, action, limit]);

  if (!isSuper) {
    return (
      <Card title="Staff activity log">
        <p className="text-xs text-slate-400">
          Only the owner account can read the activity log. Ask the owner if you need to check who changed something.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-bold text-white text-lg mr-auto">
          Activity log <span className="text-slate-500 text-sm font-semibold">{logs.length}</span>
        </h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <SearchBox value={search} onChange={setSearch} placeholder="Name, action or target" className="pl-8 w-52" />
        </div>
        <span className="w-44">
          <Select
            value={action}
            onChange={setAction}
            options={[{ value: '', label: 'All actions' }, ...actions.map(a => ({ value: a, label: a }))]}
          />
        </span>
        <span className="w-32">
          <Select value={limit} onChange={setLimit} options={LIMITS} />
        </span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#121422] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5">
              <tr>
                <Th>When</Th>
                <Th>Who</Th>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th>Details</Th>
                <Th className="hidden lg:table-cell">IP</Th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <Td className="whitespace-nowrap text-slate-400">{dateTime(log.created_at)}</Td>
                  <Td>
                    <span className="block font-semibold text-white">{log.actor_name || 'System'}</span>
                    <span className="block text-[10px] text-slate-500">{log.actor_email || ''}</span>
                  </Td>
                  <Td>
                    <span className={`inline-block px-2 py-0.5 rounded-md border font-mono text-[10px] font-bold whitespace-nowrap ${actionTone(log.action)}`}>
                      {log.action}
                    </span>
                  </Td>
                  <Td className="text-slate-300 whitespace-nowrap">
                    {log.target_type ? `${log.target_type} ${log.target_id ?? ''}`.trim() : '—'}
                  </Td>
                  <Td className="text-slate-400 max-w-[42ch]">{log.details || '—'}</Td>
                  <Td className="hidden lg:table-cell font-mono text-[10px] text-slate-600">{log.ip_address || '—'}</Td>
                </tr>
              ))}
              {!logs.length && <EmptyRow colSpan={6}>Nothing recorded for these filters yet.</EmptyRow>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
