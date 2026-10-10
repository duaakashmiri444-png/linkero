import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#16182c] border border-purple-500/50 text-white px-5 py-3 rounded-2xl text-xs font-semibold shadow-2xl shadow-purple-950/80 animate-bounce-short pointer-events-none max-w-sm text-center">
      {message}
    </div>
  );
};
