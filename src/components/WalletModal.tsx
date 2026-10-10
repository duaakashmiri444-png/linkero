import React, { useState } from 'react';
import { User, Transaction } from '../types';
import { store } from '../services/store';
import { 
  X, 
  Coins, 
  CreditCard, 
  QrCode, 
  CheckCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Tag, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface WalletModalProps {
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ onClose, onToast }) => {
  const [user, setUser] = useState<User>(store.getUser());
  const [transactions, setTransactions] = useState<Transaction[]>(store.getTransactions());
  const [selectedPackage, setSelectedPackage] = useState<number>(100);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto' | 'easypaisa'>('card');
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeLedgerTab, setActiveLedgerTab] = useState<'all' | 'deposits' | 'purchases'>('all');

  const packages = [
    { credits: 50, priceUsd: 5, popular: false },
    { credits: 100, priceUsd: 9, popular: true },
    { credits: 250, priceUsd: 20, popular: false },
    { credits: 500, priceUsd: 35, popular: false }
  ];

  const handleTopUp = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const methodLabel = paymentMethod === 'card' 
        ? 'Credit / Debit Card' 
        : paymentMethod === 'crypto' 
          ? 'Crypto USDT (TRC-20)' 
          : 'EasyPaisa / UPI';

      const res = store.topUpCredits(selectedPackage, methodLabel);
      setIsProcessing(false);
      setUser(store.getUser());
      setTransactions(store.getTransactions());
      onToast(`Successfully added ${selectedPackage} credits! Ref: ${res.reference}`);
    }, 400);
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    const res = store.applyCoupon(couponCode);
    if (res.success) {
      setCouponMsg({ text: res.message, isError: false });
      setCouponCode('');
      setUser(store.getUser());
      setTransactions(store.getTransactions());
      onToast(res.message);
    } else {
      setCouponMsg({ text: res.message, isError: true });
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (activeLedgerTab === 'deposits') return t.type === 'deposit';
    if (activeLedgerTab === 'purchases') return t.type === 'video_unlock' || t.type === 'pack_unlock';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#10121f] border border-white/15 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0c0e18]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Desi Ero Wallet & Credits</h2>
              <p className="text-xs text-slate-400">Manage balance, buy credit top-ups, and review transaction receipts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          
          {/* Balance Spotlight Banner */}
          <div className="rounded-2xl p-6 bg-gradient-to-r from-purple-950/70 via-[#181a2e] to-pink-950/40 border border-purple-500/30 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                Current Wallet Balance
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display font-black text-4xl text-white tabular-nums">
                  {user.walletBalance}
                </span>
                <span className="text-purple-300 text-sm font-bold">Credits</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Use credits across all videos, paid previews, and digital pack archives.
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full inline-block">
                VIP Tier: 10% Bonus
              </span>
            </div>
          </div>

          {/* Section: Add Credits / Top Up Packages */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              1. Select Credit Top-Up Package
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {packages.map(pkg => (
                <button
                  key={pkg.credits}
                  onClick={() => setSelectedPackage(pkg.credits)}
                  className={`p-3.5 rounded-xl border text-center transition-all relative flex flex-col justify-between ${selectedPackage === pkg.credits ? 'bg-purple-950/50 border-purple-500 shadow-md shadow-purple-950/40 ring-1 ring-purple-500' : 'bg-[#141626] border-white/10 hover:border-white/20'}`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-pink-600 text-white px-2 py-0.2 rounded-full uppercase tracking-wider">
                      Popular
                    </span>
                  )}
                  <div className="font-display font-black text-xl text-white tabular-nums">
                    +{pkg.credits}
                  </div>
                  <div className="text-[11px] text-purple-300 font-semibold mb-1">
                    Credits
                  </div>
                  <div className="text-xs font-bold text-slate-300 border-t border-white/10 pt-1.5">
                    ${pkg.priceUsd} USD
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Payment Method Simulator */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              2. Select Payment Method
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'card', name: 'Credit / Debit Card', icon: CreditCard },
                { id: 'crypto', name: 'USDT (TRC20)', icon: QrCode },
                { id: 'easypaisa', name: 'EasyPaisa / UPI', icon: ShieldCheck }
              ].map(method => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${isSelected ? 'bg-purple-950/40 border-purple-500 text-white' : 'bg-[#141626] border-white/10 text-slate-400 hover:text-white'}`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-purple-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold">{method.name}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleTopUp}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 transition-all"
            >
              <Coins className="w-4 h-4" />
              {isProcessing ? 'Processing Transaction...' : `Confirm Deposit of ${selectedPackage} Credits`}
            </button>
          </div>

          {/* Section: Coupon Code */}
          <div className="p-4 rounded-xl bg-[#141626] border border-white/10 space-y-2">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-400" />
              Have a Promo or Referral Coupon?
            </div>
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                placeholder="Try: WELCOME50 or DESIPRO"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                className="bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 flex-1 uppercase"
              />
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shrink-0"
              >
                Apply
              </button>
            </form>
            {couponMsg && (
              <div className={`text-xs flex items-center gap-1.5 ${couponMsg.isError ? 'text-rose-400' : 'text-emerald-400'}`}>
                {couponMsg.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                <span>{couponMsg.text}</span>
              </div>
            )}
          </div>

          {/* Section: Transaction Ledger */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Auditable Transaction Ledger
              </h3>
              <div className="flex gap-1 text-[11px] bg-black/40 p-0.5 rounded-lg border border-white/10">
                {(['all', 'deposits', 'purchases'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveLedgerTab(tab)}
                    className={`px-2.5 py-1 rounded-md capitalize font-semibold ${activeLedgerTab === tab ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0d0f1b] overflow-hidden">
              <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
                {filteredTransactions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No transactions found for this filter.
                  </div>
                ) : (
                  filteredTransactions.map(txn => {
                    const isCredit = txn.amount > 0;
                    return (
                      <div key={txn.id} className="p-3 flex items-center justify-between text-xs hover:bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {txn.itemTitle || (txn.type === 'deposit' ? 'Wallet Deposit' : 'Credit Adjustment')}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Ref: {txn.reference} · {new Date(txn.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`font-bold tabular-nums ${isCredit ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {isCredit ? `+${txn.amount}` : txn.amount} Credits
                          </div>
                          <div className="text-[10px] text-slate-500 tabular-nums">
                            Bal: {txn.balanceAfter} CR
                          </div>
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
