import { ShieldCheck, X } from 'lucide-react';
import { useEffect } from 'react';
import { LAYER2_FULL_NOTICE } from '../data/privacyNotice.ts';
import { GlassCard } from './GlassCard.tsx';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16143a]/75"
      onClick={onClose}
    >
      <GlassCard
        padding="none"
        variant="modal"
        className="w-full max-w-2xl max-h-[88dvh] flex flex-col text-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-start justify-between gap-4 p-6 border-b border-white/15">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-white/15 border border-white/25 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                Privacy &amp; POPIA
              </p>
              <h2
                id="popia-full-notice-title"
                className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1"
              >
                {LAYER2_FULL_NOTICE.title}
              </h2>
              <p className="text-xs sm:text-sm text-white/70 mt-1">
                {LAYER2_FULL_NOTICE.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close privacy notice"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {LAYER2_FULL_NOTICE.sections.map((section) => (
            <div
              key={section.label}
              className="pb-4 border-b border-white/15 last:border-b-0 last:pb-0"
            >
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                {section.label}
              </h3>
              <p className="text-sm text-white mt-1.5 leading-relaxed">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-white/15 bg-white/[0.06] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 min-h-[44px] rounded-full bg-white text-[#6D3FE0] text-sm font-semibold hover:bg-white/90 transition-colors cursor-pointer shadow-sm"
          >
            Back to notice
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
