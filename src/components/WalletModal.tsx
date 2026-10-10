import React, { useEffect, useState } from 'react';
import type { PaymentMode, PaymentProvider } from '../services/api';
import { store } from '../services/store';
import type { Transaction } from '../types';
import {
  X,
  Coins,
  Clock,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Tag,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface WalletModalProps {
  onClose: () => void;
  onToast: (msg: string) => void;
}

interface Channel {
  provider: PaymentProvider;
  mode: PaymentMode;
}

/** Every channel the storefront can actually take payment through right now. */
function usableChannels(providers: PaymentProvider[]): Channel[] {
  return providers
    .flatMap(provider =>
      provider.modes
        .filter(m => m.status === 'ACTIVE' && (m.mode === 'MANUAL' || (m.mode === 'LINK' && m.link_url)))
        .map(mode => ({ provider, mode }))
    );
}

function fiatForCredits(provider: PaymentProvider, credits: number): string {
  const rate = Number(provider.credit_rate ?? 1);
  const fiat = credits * rate;
  return `${fiat.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${provider.currency}`;
}

const PRESETS = [100, 250, 500, 1000];

export const WalletModal: React.FC<WalletModalProps> = ({ onClose, onToast }) => {
  const user = store.getUser();
  const channels = usableChannels(store.getPaymentProviders());

  const [credits, setCredits] = useState<number>(100);
  const [customCredits, setCustomCredits] = useState('');
  const [channelKey, setChannelKey] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<{ message: string; reference: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const [ledgerTab, setLedgerTab] = useState<'all' | 'topups' | 'purchases'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>(() => store.getTransactions());

  const activeChannel = channels.find(c => `${c.provider.code}:${c.mode.mode}` === channelKey) ?? channels[0] ?? null;

  useEffect(() => {
    setFieldValues({});
    setOutcome(null);
  }, [activeChannel?.provider.code, activeChannel?.mode.mode]);

  const chosenCredits = Math.max(0, Math.floor(Number(customCredits || credits) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChannel) return;
    const required = activeChannel.mode.input_fields.filter(f => f.required);
    const missing = required.filter(f => !String(fieldValues[f.key] ?? '').trim());
    if (missing.length) {
      setError(`${missing.map(f => f.label).join(', ')} ${missing.length === 1 ? 'is' : 'are'} required.`);
      return;
    }
    if (chosenCredits <= 0) {
      setError('Enter how many credits you want to buy.');
      return;
    }

    setError(null);
    setSubmitting(true);
    const referenceKey = activeChannel.mode.input_fields.some(f => f.key === 'reference_id')
      ? 'reference_id'
      : required[0]?.key ?? 'reference_id';
    const result = await store.requestTopUp({
      method: activeChannel.provider.code,
      credits: chosenCredits,
      reference_id: String(fieldValues[referenceKey] ?? '').trim(),
      sender_info: String(fieldValues.sender_info ?? '').trim() || undefined,
      notes: notes.trim() || undefined,
      extra: fieldValues
    });
    setSubmitting(false);
    if (result.success) {
      setOutcome({ message: result.message, reference: String(fieldValues[referenceKey] ?? '').trim() });
      setFieldValues({});
      setNotes('');
      setTransactions(store.getTransactions());
    } else {
      setError(result.message);
    }
    onToast(result.message);
  };

  const handleCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const res = await store.validateCoupon(couponCode.trim().toUpperCase(), chosenCredits || undefined);
    setCouponMsg(
      res.success
        ? { text: `${couponCode.trim().toUpperCase()} is active — worth ${res.bonusCredits} credits off a purchase.`, isError: false }
        : { text: res.message, isError: true }
    );
  };

  const filteredTransactions = transactions.filter(t => {
    if (ledgerTab === 'topups') return t.type === 'TOP_UP' || t.type === 'BONUS' || t.type === 'GIFT';
    if (ledgerTab === 'purchases') return t.type === 'PURCHASE';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#10121f] border border-white/15 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0c0e18]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Wallet & Credits</h2>
              <p className="text-xs text-slate-400">Send a payment, submit its reference, and the owner credits your wallet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6">

          {/* Balance */}
          <div className="rounded-2xl p-6 bg-gradient-to-r from-purple-950/70 via-[#181a2e] to-pink-950/40 border border-purple-500/30 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Current Wallet Balance</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display font-black text-4xl text-white tabular-nums">{user.walletBalance}</span>
                <span className="text-purple-300 text-sm font-bold">{user.currency}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Signed in as {user.name || user.email}. Credits are shared by videos and paid packs.
              </p>
            </div>
            <button
              onClick={() => void store.refreshSession().then(() => setTransactions(store.getTransactions()))}
              className="text-[11px] font-semibold text-purple-200 bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/30 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              Check for approved credits
            </button>
          </div>

          {!store.isAuthenticated() ? (
            <div className="rounded-xl border border-white/10 bg-[#141626] p-5 text-sm text-slate-300">
              Sign in before adding credits — top-ups are tied to your account and its wallet.
            </div>
          ) : channels.length === 0 ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-5 text-sm text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                No payment channel is open right now. The owner enables channels in Control Panel → Payments, and they
                appear here automatically.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Amount */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">1. How many credits?</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => { setCredits(preset); setCustomCredits(''); }}
                      className={`p-3.5 rounded-xl border text-center transition-all ${!customCredits && credits === preset
                        ? 'bg-purple-950/50 border-purple-500 shadow-md shadow-purple-950/40 ring-1 ring-purple-500'
                        : 'bg-[#141626] border-white/10 hover:border-white/20'}`}
                    >
                      <div className="font-display font-black text-xl text-white tabular-nums">+{preset}</div>
                      <div className="text-[11px] text-purple-300 font-semibold">Credits</div>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={customCredits}
                    onChange={e => setCustomCredits(e.target.value)}
                    placeholder="Or enter a custom amount"
                    className="bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-56 tabular-nums"
                  />
                  {activeChannel && chosenCredits > 0 && (
                    <span className="text-xs text-slate-400">
                      Send <span className="font-bold text-white tabular-nums">{fiatForCredits(activeChannel.provider, chosenCredits)}</span> per{' '}
                      {chosenCredits} credits
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Channel */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">2. Pay with</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {channels.map(channel => {
                    const key = `${channel.provider.code}:${channel.mode.mode}`;
                    const isSelected = activeChannel && key === `${activeChannel.provider.code}:${activeChannel.mode.mode}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setChannelKey(key)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${isSelected
                          ? 'bg-purple-950/40 border-purple-500 text-white'
                          : 'bg-[#141626] border-white/10 text-slate-400 hover:text-white'}`}
                      >
                        <ShieldCheck className={`w-5 h-5 ${isSelected ? 'text-purple-400' : 'text-slate-400'}`} />
                        <span className="text-xs font-semibold">{channel.provider.name}</span>
                        <span className="text-[10px] text-slate-500">{channel.provider.currency}</span>
                      </button>
                    );
                  })}
                </div>

                {activeChannel && (
                  <div className="p-4 rounded-xl bg-[#0d0f1b] border border-white/10 space-y-2 text-xs">
                    <div className="font-semibold text-white">{activeChannel.mode.label || `${activeChannel.provider.name} deposit`}</div>
                    {activeChannel.mode.instructions && (
                      <p className="text-slate-300 leading-relaxed whitespace-pre-line">{activeChannel.mode.instructions}</p>
                    )}
                    {activeChannel.mode.mode === 'LINK' && activeChannel.mode.link_url && (
                      <a
                        href={activeChannel.mode.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-purple-300 hover:text-purple-200 font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open the payment page
                      </a>
                    )}
                    <p className="text-slate-500 pt-1 border-t border-white/5">
                      Pay {activeChannel.provider.description || activeChannel.provider.name.toLowerCase()} — then fill in the
                      reference below so the owner can match it.
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Proof */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">3. Submit your payment reference</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {activeChannel?.mode.input_fields.map(field => (
                    <label key={field.key} className="block">
                      <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
                        {field.label}
                        {field.required && <span className="text-pink-400"> *</span>}
                      </span>
                      <input
                        type="text"
                        value={fieldValues[field.key] ?? ''}
                        onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="mt-1 w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </label>
                  ))}
                </div>
                <label className="block">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Note for the reviewer (optional)</span>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. sent from my JazzCash business account"
                    className="mt-1 w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </label>

                {error && (
                  <div className="text-xs flex items-center gap-1.5 text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !activeChannel}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 transition-all"
                >
                  <Coins className="w-4 h-4" />
                  {submitting ? 'Submitting for verification…' : `Send ${chosenCredits} credit top-up for review`}
                </button>

                <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
                  <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-purple-400" />
                  <span>
                    Nothing is credited automatically. The owner checks your reference against their account statement and
                    then adds the credits; you will see the entry in the ledger below once they approve it.
                  </span>
                </p>
              </div>
            </form>
          )}

          {outcome && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-bold text-emerald-100 mb-0.5">Reference {outcome.reference} submitted</div>
                <p className="leading-relaxed text-emerald-200/90">{outcome.message}</p>
              </div>
            </div>
          )}

          {/* Coupon */}
          <div className="p-4 rounded-xl bg-[#141626] border border-white/10 space-y-2">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-400" />
              Check a promo code
            </div>
            <form onSubmit={handleCoupon} className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                placeholder="Enter a code from our support team"
                className="bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 flex-1 uppercase"
              />
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shrink-0"
              >
                Check
              </button>
            </form>
            {couponMsg && (
              <div className={`text-xs flex items-center gap-1.5 ${couponMsg.isError ? 'text-rose-400' : 'text-emerald-400'}`}>
                {couponMsg.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                <span>{couponMsg.text}</span>
              </div>
            )}
            <p className="text-[10px] text-slate-500">
              Codes discount a purchase at checkout — they do not add free credits to the wallet.
            </p>
          </div>

          {/* Ledger */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Wallet Ledger</h3>
              <div className="flex gap-1 text-[11px] bg-black/40 p-0.5 rounded-lg border border-white/10">
                {(['all', 'topups', 'purchases'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setLedgerTab(tab)}
                    className={`px-2.5 py-1 rounded-md capitalize font-semibold ${ledgerTab === tab ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    {tab === 'topups' ? 'Top-ups' : tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0d0f1b] overflow-hidden">
              <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
                {filteredTransactions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No wallet entries for this filter yet.</div>
                ) : (
                  filteredTransactions.map(txn => {
                    const isCredit = txn.amount > 0;
                    return (
                      <div key={txn.id} className="p-3 flex items-center justify-between text-xs hover:bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate max-w-[16rem]">{txn.description}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {txn.type} · Ref {txn.reference} · {new Date(txn.createdAt).toLocaleString()} · {txn.status}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-bold tabular-nums ${isCredit ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {isCredit ? `+${txn.amount}` : txn.amount} credits
                          </div>
                          <div className="text-[10px] text-slate-500 tabular-nums">Bal: {txn.balanceAfter}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
