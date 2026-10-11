import React, { useEffect, useState } from 'react';
import { store } from '../../services/store';
import type { AdminCouponRow } from '../../services/api';
import { Card, EmptyRow, Field, IconButton, Pill, Select, Td, Th, shortDate } from './ui';
import { Plus, Trash2 } from 'lucide-react';

const TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage off' },
  { value: 'FIXED_CREDITS', label: 'Fixed credits off' }
];

const BLANK = { code: '', discount_type: 'PERCENTAGE', discount_value: '10', usage_limit: '100', min_purchase: '0', end_date: '' };

/**
 * Discount codes a buyer can paste at checkout. Switching a code off keeps its redemption history,
 * which is what the owner needs when a promotion is disputed.
 */
export const CouponsPanel: React.FC<{ onToast: (msg: string) => void }> = ({ onToast }) => {
  const [coupons, setCoupons] = useState<AdminCouponRow[]>([]);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  const load = () => void store.loadCoupons().then(setCoupons);
  useEffect(load, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await store.saveCoupon({
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      usage_limit: Number(form.usage_limit),
      min_purchase: Number(form.min_purchase),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null
    });
    setBusy(false);
    onToast(result.message);
    if (result.success) {
      setForm(BLANK);
      load();
    }
  };

  const toggle = async (coupon: AdminCouponRow) => {
    const result = await store.saveCoupon({ is_active: coupon.is_active ? 0 : 1 }, coupon.id);
    onToast(result.message);
    load();
  };

  const remove = async (coupon: AdminCouponRow) => {
    if (!window.confirm(`Delete "${coupon.code}" for good? Buyers who still have it will get an invalid-code error.`)) return;
    const result = await store.deleteCoupon(coupon.id);
    onToast(result.message);
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-white text-lg">
        Coupons <span className="text-slate-500 text-sm font-semibold">{coupons.length}</span>
      </h2>

      <Card title="New code">
        <form onSubmit={submit} className="grid grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <Field label="Code" value={form.code} onChange={value => setForm({ ...form, code: value })} placeholder="DIWALI25" />
          <Select label="Type" value={form.discount_type} onChange={value => setForm({ ...form, discount_type: value })} options={TYPES} />
          <Field label={form.discount_type === 'PERCENTAGE' ? 'Percent off' : 'Credits off'} value={form.discount_value} onChange={value => setForm({ ...form, discount_value: value })} type="number" />
          <Field label="Uses allowed" value={form.usage_limit} onChange={value => setForm({ ...form, usage_limit: value })} type="number" />
          <Field label="Minimum spend" value={form.min_purchase} onChange={value => setForm({ ...form, min_purchase: value })} type="number" />
          <Field label="Expires" value={form.end_date} onChange={value => setForm({ ...form, end_date: value })} type="date" />
          <button
            type="submit"
            disabled={busy || form.code.trim().length < 3}
            className="col-span-2 lg:col-span-6 justify-self-start bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {busy ? 'Saving…' : 'Create coupon'}
          </button>
        </form>
      </Card>

      <div className="rounded-2xl border border-white/10 bg-[#121422] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5">
              <tr>
                <Th>Code</Th>
                <Th>Discount</Th>
                <Th className="text-right">Used</Th>
                <Th className="text-right">Minimum</Th>
                <Th>Expires</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(coupon => (
                <tr key={coupon.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <Td className="font-mono font-bold text-white">{coupon.code}</Td>
                  <Td className="text-purple-300 font-semibold">
                    {coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}% off` : `${coupon.discount_value} CR off`}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {coupon.times_used}/{coupon.usage_limit}
                    <span className="block text-[10px] text-slate-500">{coupon.redemptions || 0} redeemed</span>
                  </Td>
                  <Td className="text-right tabular-nums">{coupon.min_purchase || '—'}</Td>
                  <Td className="text-slate-400">{coupon.end_date ? shortDate(coupon.end_date) : 'No end date'}</Td>
                  <Td>
                    <Pill value={coupon.is_active ? 'ACTIVE' : 'DISABLED'} />
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => void toggle(coupon)}
                        className="px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/5"
                      >
                        {coupon.is_active ? 'Switch off' : 'Switch on'}
                      </button>
                      <IconButton tone="danger" onClick={() => void remove(coupon)} title="Delete coupon">
                        <Trash2 className="w-3.5 h-3.5" />
                      </IconButton>
                    </div>
                  </Td>
                </tr>
              ))}
              {!coupons.length && <EmptyRow colSpan={7}>No coupons yet. Create one above and tell buyers the code.</EmptyRow>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
