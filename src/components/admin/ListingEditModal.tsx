import React, { useEffect, useState } from 'react';
import { store } from '../../services/store';
import type { ProductRow, SeriesRow } from '../../services/api';
import { Field, SeriesFields, Select, type SeriesDraft } from './ui';

const VISIBILITY = [
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Draft (hidden)' }
];

/**
 * Words-only edit for a listing that already has its media. Re-uploading a file to fix a typo would
 * re-run the whole publish pipeline, so this sends just the text columns to the same PUT endpoint.
 * The form starts from the stored row rather than the card, so a pack — whose card shows no tags —
 * still saves the tags it really has.
 */
export const ListingEditModal: React.FC<{
  productId: number;
  kind: 'video' | 'pack';
  categories: { id: number; name: string }[];
  onClose: () => void;
  onToast: (msg: string) => void;
}> = ({ productId, kind, categories, onClose, onToast }) => {
  const [row, setRow] = useState<ProductRow | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [sizeLabel, setSizeLabel] = useState('');
  const [contentsLabel, setContentsLabel] = useState('');
  const [series, setSeries] = useState<SeriesDraft>({ name: '', part: '', price: '' });
  const [seriesOptions, setSeriesOptions] = useState<SeriesRow[]>([]);
  const [status, setStatus] = useState('PUBLISHED');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void store.loadSeriesList().then(setSeriesOptions);
    void store.loadListingDetail(productId).then(detail => {
      if (!detail) return;
      const row = detail.product;
      setRow(row);
      setTitle(row.title);
      setDescription(row.description || '');
      setPrice(String(row.price ?? 0));
      setCategory(row.category || categories[0]?.name || '');
      setTags(row.tags || '');
      setSizeLabel(row.size_label || '');
      setContentsLabel(row.contents_label || '');
      setSeries({
        name: detail.series?.title ?? '',
        part: row.part_number ? String(row.part_number) : '',
        price: detail.series?.bundle_price ? String(detail.series.bundle_price) : '',
      });
      setStatus(row.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED');
    });
  }, [productId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    setBusy(true);
    const result = await store.updateListing(productId, {
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      category,
      tags: tags.trim(),
      // A video has no pack headline to advertise, so the fields are left off entirely rather than
      // sent blank — the endpoint keeps whatever it already holds for anything omitted.
      ...(kind === 'pack' ? { size_label: sizeLabel.trim(), contents_label: contentsLabel.trim() } : {}),
      // Always sent: an empty name is the owner saying "this one stands alone again", and the
      // endpoint would otherwise keep the series it already has.
      collection_name: series.name.trim(),
      part_number: series.name.trim() && series.part.trim() ? Number(series.part) : null,
      collection_bundle_price: series.name.trim() && series.price.trim() ? Number(series.price) : null,
      status
    });
    setBusy(false);
    onToast(result.message);
    if (result.success) onClose();
  };

  const invalid = title.trim().length < 3 || !Number.isFinite(Number(price)) || Number(price) < 0;

  if (!row) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <p className="text-xs text-slate-400">Loading listing…</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#141626] p-5 space-y-4 my-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-base">Edit {kind === 'pack' ? 'pack' : 'video'} details</h3>
            <p className="text-[11px] text-slate-500">Listing #{productId} · media, buyer access and price history stay untouched.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none" aria-label="Close">
            ×
          </button>
        </div>

        <Field label="Title" value={title} onChange={setTitle} />

        <label className="block">
          <span className="block text-[11px] font-semibold text-slate-400 mb-1">Description</span>
          <textarea
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-[#0f1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500/60 focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Price (credits)" value={price} onChange={setPrice} type="number" />
          <div className="sm:col-span-2">
            <Select
              label="Category"
              value={category}
              onChange={setCategory}
              options={categories.map(c => ({ value: c.name, label: c.name }))}
            />
          </div>
          <Select label="Visibility" value={status} onChange={setStatus} options={VISIBILITY} />
        </div>

        <Field
          label="Tags"
          value={tags}
          onChange={setTags}
          placeholder="4K, Featured"
          hint={`Comma separated. Stored as “${row.tags || 'nothing'}”.`}
        />

        <SeriesFields
          listId="edit-series-names"
          knownNames={seriesOptions.map(s => s.title)}
          value={series}
          onChange={setSeries}
        />

        {kind === 'pack' && (
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Data size buyers see"
              value={sizeLabel}
              onChange={setSizeLabel}
              placeholder="9 GB"
              hint="Typed as it appears on the card. Leave empty to show the counted files instead."
            />
            <Field
              label="Contents buyers see"
              value={contentsLabel}
              onChange={setContentsLabel}
              placeholder="1100+ videos"
              hint={`Stored as “${row.contents_label || 'nothing'}”.`}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={busy || invalid}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
