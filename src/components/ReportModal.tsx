import React, { useState } from 'react';
import { ContentReport } from '../types';
import { store } from '../services/store';
import { X, Flag, CheckCircle, AlertCircle } from 'lucide-react';

interface ReportModalProps {
  targetId: string;
  targetTitle: string;
  targetType: 'video' | 'pack';
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  targetId,
  targetTitle,
  targetType,
  onClose,
  onToast
}) => {
  const [reason, setReason] = useState<ContentReport['reason']>('broken_link');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.submitReport(targetId, targetTitle, targetType, reason, details);
    setSubmitted(true);
    onToast('Report submitted. Admin moderation team will review this listing.');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[#121424] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <Flag className="w-4 h-4" />
            <span>Report Content / Listing</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="font-bold text-white text-base">Thank You</h3>
            <p className="text-xs text-slate-300">Your report has been logged for admin review.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-xs text-slate-300">
              Reporting: <strong className="text-white">{targetTitle}</strong>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Issue Category
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value as any)}
                className="w-full bg-[#181a2e] border border-white/10 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:border-purple-500"
              >
                <option value="broken_link">Broken Link or Delivery Error</option>
                <option value="preview_mismatch">Preview Doesn't Match Description</option>
                <option value="copyright">Copyright or Intellectual Property</option>
                <option value="inappropriate">Inappropriate or Unauthorized Content</option>
                <option value="other">Other Concern</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Additional Details
              </label>
              <textarea
                rows={3}
                required
                placeholder="Explain what is wrong with this listing or file..."
                value={details}
                onChange={e => setDetails(e.target.value)}
                className="w-full bg-[#181a2e] border border-white/10 text-xs text-white placeholder-slate-500 rounded-xl p-2.5 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white/10 hover:bg-white/15 text-white font-semibold py-2.5 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Submit Report
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
