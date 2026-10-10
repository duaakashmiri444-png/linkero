import React, { useMemo, useState } from 'react';
import { store } from '../services/store';
import { X, Flag, AlertCircle, CopyCheck, MessageCircle, Mail, AtSign } from 'lucide-react';

interface ReportModalProps {
  targetId: string;
  targetTitle: string;
  targetType: 'video' | 'pack';
  onClose: () => void;
  onToast: (msg: string) => void;
}

const REASONS = [
  { value: 'broken_link', label: 'Broken link or delivery error' },
  { value: 'preview_mismatch', label: "Preview doesn't match the description" },
  { value: 'copyright', label: 'Copyright or intellectual property' },
  { value: 'inappropriate', label: 'Inappropriate or unauthorised content' },
  { value: 'other', label: 'Other concern' }
];

export const ReportModal: React.FC<ReportModalProps> = ({ targetId, targetTitle, targetType, onClose, onToast }) => {
  const [reason, setReason] = useState(REASONS[0].value);
  const [details, setDetails] = useState('');
  const [copied, setCopied] = useState(false);

  const support = store.getSupport();
  const user = store.getUser();

  const message = useMemo(() => {
    const label = REASONS.find(r => r.value === reason)?.label ?? reason;
    return [
      `Content report — ${targetType} #${targetId}`,
      `Listing: ${targetTitle}`,
      `Issue: ${label}`,
      `Reported by: ${user.name || user.email || 'not signed in'}`,
      '',
      details.trim()
    ]
      .join('\n')
      .trim();
  }, [reason, details, targetId, targetTitle, targetType, user.name, user.email]);

  const whatsappHref = support?.whatsapp?.url
    ? `${support.whatsapp.url}${support.whatsapp.url.includes('?') ? '&' : '?'}text=${encodeURIComponent(message)}`
    : null;
  const telegramHref = support?.telegram?.url ?? null;
  const mailHref = support?.email
    ? `mailto:${support.email}?subject=${encodeURIComponent(`Content report: ${targetTitle}`)}&body=${encodeURIComponent(message)}`
    : null;

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      onToast('Report text copied — paste it to support.');
    } catch {
      onToast('Your browser blocked the clipboard; select the text manually.');
    }
  };

  const nothingConfigured = !whatsappHref && !telegramHref && !mailHref;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#121424] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 my-auto">

        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <Flag className="w-4 h-4" />
            <span>Report this listing</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-300">
          Reporting: <strong className="text-white">{targetTitle}</strong>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Issue category</label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full bg-[#181a2e] border border-white/10 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:border-purple-500"
          >
            {REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">What is wrong?</label>
          <textarea
            rows={3}
            required
            placeholder="e.g. the second archive in this pack returns a 404…"
            value={details}
            onChange={e => setDetails(e.target.value)}
            className="w-full bg-[#181a2e] border border-white/10 text-xs text-white placeholder-slate-500 rounded-xl p-2.5 focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Message preview</div>
          <pre className="text-[11px] text-slate-300 whitespace-pre-wrap font-mono leading-relaxed max-h-28 overflow-y-auto">{message}</pre>
        </div>

        {nothingConfigured ? (
          <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>The owner has not published a support channel yet, so this report cannot be sent. Copy the text above and try again later.</span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400">
              Send it to the review desk — {support?.hours || 'support hours not set'}. Reports are handled by a human;
              nothing is filed automatically.
            </p>
            <div className="flex flex-wrap gap-2">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              )}
              {mailHref && (
                <a
                  href={mailHref}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </a>
              )}
              {telegramHref && (
                <a
                  href={telegramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <AtSign className="w-3.5 h-3.5" />
                  Telegram
                </a>
              )}
              <button
                type="button"
                onClick={() => void copyReport()}
                className="bg-white/10 hover:bg-white/15 text-white font-semibold px-3 py-2.5 rounded-xl text-xs flex items-center gap-1.5"
              >
                <CopyCheck className="w-3.5 h-3.5" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <button type="button" onClick={onClose} className="w-full bg-white/5 hover:bg-white/10 text-slate-300 py-2 rounded-xl text-xs">
          Close
        </button>
      </div>
    </div>
  );
};
