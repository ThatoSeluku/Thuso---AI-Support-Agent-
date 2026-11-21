import { ShieldCheck, X } from 'lucide-react';
import { useEffect } from 'react';
import { LAYER2_FULL_NOTICE } from '../data/privacyNotice.ts';

interface PrivacyNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyNoticeModal({ isOpen, onClose }: PrivacyNoticeModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="popia-full-notice-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f3a5f]/40 dark:bg-[#091424]/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88dvh] flex flex-col bg-white dark:bg-[#182d4a] border border-[#dce3ec] dark:border-[#2d4b73] rounded-xl shadow-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-start justify-between gap-4 p-6 border-b border-[#dce3ec] dark:border-[#2d4b73]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#e3ecf6] dark:bg-[#213f66] border border-[#dce3ec] dark:border-[#2d4b73] text-[#3d6a9e] dark:text-[#8eb4e0] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="popia-full-notice-title"
                className="font-serif text-xl font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]"
              >
                {LAYER2_FULL_NOTICE.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#4a6280] dark:text-[#c5d3e6] mt-1">
                {LAYER2_FULL_NOTICE.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close privacy notice"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#4a6280] dark:text-[#c5d3e6] hover:text-[#1f3a5f] dark:hover:text-[#f6f4f1] hover:bg-[#e3ecf6] dark:hover:bg-[#213f66] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {LAYER2_FULL_NOTICE.sections.map((section) => (
            <div
              key={section.label}
              className="pb-4 border-b border-[#dce3ec] dark:border-[#2d4b73] last:border-b-0 last:pb-0"
            >
              <h3 className="text-sm font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]">
                {section.label}
              </h3>
              <p className="text-sm text-[#4a6280] dark:text-[#c5d3e6] mt-1 leading-relaxed">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        <div className="shrink-0 p-4 border-t border-[#dce3ec] dark:border-[#2d4b73] bg-[#f6f4f1] dark:bg-[#12233b] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 min-h-[44px] rounded-lg bg-[#3d6a9e] text-white text-sm font-medium hover:bg-[#2f5582] dark:bg-[#6994c6] dark:text-[#0f1f36] dark:hover:bg-[#7da6d4] transition-colors cursor-pointer"
          >
            Back to notice
          </button>
        </div>
      </div>
    </div>
  );
}
