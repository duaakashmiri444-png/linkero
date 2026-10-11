import React, { useEffect, useState } from 'react';
import { store } from '../../services/store';
import { Card, EmptyRow, Field, IconButton, Pill, SearchBox, Td, Th, compact } from './ui';
import { Check, Pencil, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';

type Row = { id: number; name: string; slug: string; icon?: string; product_count?: number; is_active: number };

/**
 * The catalogue tags the storefront sections are built from. Renaming one re-labels its shelf
 * everywhere at once, so the delete action is guarded: a tag still holding listings would strand
 * them in an unclassified pile.
 */
export const CategoriesPanel: React.FC<{ onToast: (msg: string) => void }> = ({ onToast }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: number; name: string; icon: string } | null>(null);

  const load = () => void store.loadCategories().then(setRows);
  useEffect(load, []);

  const visible = rows.filter(row => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return row.name.toLowerCase().includes(needle) || row.slug.includes(needle);
  });

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await store.createCategory(name.trim(), icon.trim() || undefined);
    setBusy(false);
    onToast(result.message);
    if (result.success) {
      setName('');
      setIcon('');
      load();
    }
  };

  const rename = async () => {
    if (!editing) return;
    const result = await store.updateCategory(editing.id, {
      name: editing.name.trim(),
      ...(editing.icon.trim() ? { icon: editing.icon.trim() } : {})
    });
    onToast(result.message);
    setEditing(null);
    load();
  };

  const toggle = async (row: Row) => {
    const result = await store.updateCategory(row.id, { is_active: row.is_active ? 0 : 1 });
    onToast(result.message);
    load();
  };

  const remove = async (row: Row) => {
    const linked = Number(row.product_count || 0);
    if (linked > 0) {
      onToast(`“${row.name}” still labels ${linked} published listing${linked === 1 ? '' : 's'}. Move them first.`);
      return;
    }
    if (!window.confirm(`Delete the “${row.name}” tag? Listings never assigned to it are unaffected.`)) return;
    const result = await store.deleteCategory(row.id);
    onToast(result.message);
    load();
  };

  const restore = async () => {
    setBusy(true);
    const result = await store.restoreDefaultCategories();
    setBusy(false);
    onToast(result.message);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-bold text-white text-lg mr-auto">
          Categories <span className="text-slate-500 text-sm font-semibold">{rows.length}</span>
        </h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <SearchBox value={search} onChange={setSearch} placeholder="Find a tag" className="pl-8 w-44" />
        </div>
        <button
          onClick={() => void restore()}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restore defaults
        </button>
      </div>

      <Card title="New tag">
        <form onSubmit={create} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <Field label="Name" value={name} onChange={setName} placeholder="Fitness Workouts" hint="A shelf appears on the storefront as soon as a listing uses it." />
          </div>
          <div className="w-32">
            <Field label="Icon" value={icon} onChange={setIcon} placeholder="dumbbell" hint="Optional lucide icon name." />
          </div>
          <button
            type="submit"
            disabled={busy || name.trim().length < 2}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add tag
          </button>
        </form>
      </Card>

      <div className="rounded-2xl border border-white/10 bg-[#121422] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5">
              <tr>
                <Th>Category</Th>
                <Th>Slug</Th>
                <Th className="text-right">Listings</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map(row => {
                const isEditing = editing?.id === row.id;
                return (
                  <tr key={row.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <Td>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <input
                            value={editing.name}
                            onChange={e => setEditing({ ...editing, name: e.target.value })}
                            className="bg-[#0f1120] border border-purple-500/50 rounded-lg px-2 py-1 text-xs text-white w-40"
                          />
                          <input
                            value={editing.icon}
                            onChange={e => setEditing({ ...editing, icon: e.target.value })}
                            placeholder="icon"
                            className="bg-[#0f1120] border border-white/10 rounded-lg px-2 py-1 text-xs text-white w-24"
                          />
                        </div>
                      ) : (
                        <span className="font-semibold text-white">{row.name}</span>
                      )}
                    </Td>
                    <Td className="font-mono text-slate-500">{row.slug}</Td>
                    <Td className="text-right tabular-nums text-slate-300">{compact(row.product_count)}</Td>
                    <Td>
                      <Pill value={row.is_active ? 'ACTIVE' : 'DISABLED'} />
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        {isEditing ? (
                          <>
                            <IconButton onClick={() => void rename()} title="Save name">
                              <Check className="w-3.5 h-3.5" />
                            </IconButton>
                            <IconButton onClick={() => setEditing(null)} title="Cancel">
                              <X className="w-3.5 h-3.5" />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton
                              onClick={() => setEditing({ id: row.id, name: row.name, icon: row.icon || '' })}
                              title="Rename"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </IconButton>
                            <button
                              onClick={() => void toggle(row)}
                              className="px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/5"
                            >
                              {row.is_active ? 'Hide' : 'Show'}
                            </button>
                            <IconButton tone="danger" onClick={() => void remove(row)} title="Delete tag">
                              <Trash2 className="w-3.5 h-3.5" />
                            </IconButton>
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {!visible.length && <EmptyRow colSpan={5}>No tags match this search.</EmptyRow>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
