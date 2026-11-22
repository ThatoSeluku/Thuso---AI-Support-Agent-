import { PhoneCall, ShieldAlert, X, Wind } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SupportResource } from '../types.ts';
import { GlassCard } from './GlassCard.tsx';

interface UrgentHelpModalProps {
  isOpen: boolean;
  urgentResources: SupportResource[];
  onClose: () => void;
}

export function UrgentHelpModal({
  isOpen,
  urgentResources,
  onClose,
}: UrgentHelpModalProps) {
  const [breathPhase, setBreathPhase] = useState<'idle' | 'in' | 'hold' | 'out'>('idle');
  const [breathSeconds, setBreathSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setBreathPhase('idle');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (breathPhase === 'idle') return;

    const timer = window.setInterval(() => {
      setBreathSeconds((prev) => {
        if (prev <= 1) {
          if (breathPhase === 'in') {
            setBreathPhase('hold');
            return 4;
          }
          if (breathPhase === 'hold') {
            setBreathPhase('out');
            return 6;
          }
          setBreathPhase('in');
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [breathPhase]);

  if (!isOpen) return null;

  const startBreathing = () => {
    if (breathPhase === 'idle') {
      setBreathPhase('in');
      setBreathSeconds(4);
    } else {
      setBreathPhase('idle');
      setBreathSeconds(0);
    }
  };

  const breathInstruction =
    breathPhase === 'in'
      ? 'Breathe in slowly through your nose'
      : breathPhase === 'hold'
        ? 'Hold gently'
        : breathPhase === 'out'
          ? 'Breathe out slowly through your mouth'
          : 'Take a slow breath with me (4 · 4 · 6)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="urgent-help-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16143a]/75"
      onClick={onClose}
    >
      <GlassCard
        variant="modal"
        className="w-full max-w-xl max-h-[90dvh] overflow-y-auto text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/15">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#9F1239]/55 border border-[#FDA4AF]/45 text-[#FECDD3] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                24/7 Emergency Helplines
              </p>
              <h2
                id="urgent-help-title"
                className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1"
              >
                Immediate South African Support
              </h2>
              <p className="text-sm text-white/70 mt-1 leading-relaxed">
                If you or someone near you is in immediate danger, please call one of these free lines right now.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close urgent help"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Breathing grounding anchor */}
        <div className="mt-5 p-4 rounded-[20px] bg-white/[0.12] border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Wind className="w-5 h-5 text-white shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-white">{breathInstruction}</p>
              {breathPhase !== 'idle' && (
                <p className="text-xs font-mono tabular-nums text-white/70 mt-0.5">
                  {breathSeconds}s remaining
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={startBreathing}
            className="px-4 py-2 min-h-[40px] text-sm font-medium rounded-full text-white/85 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {breathPhase === 'idle' ? 'Start breathing' : 'Stop'}
          </button>
        </div>

        {/* Urgent Numbers List (fetched from backend) */}
        <div className="mt-5 divide-y divide-white/15 border border-white/20 rounded-[24px] bg-white/[0.10]">
          {urgentResources.length === 0 ? (
            <div className="p-5 text-sm text-white/70">
              Loading emergency numbers from the server...
            </div>
          ) : (
            urgentResources.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-white/70 mt-0.5">
                    {item.hours} · {item.cost}
                    {item.secondaryContact ? ` · ${item.secondaryContact}` : ''}
                  </p>
                </div>
                <a
                  href={item.telHref}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-full bg-white text-[#6D3FE0] text-sm font-mono font-bold tabular-nums hover:bg-white/90 transition-colors whitespace-nowrap shrink-0 shadow-sm"
                >
                  <PhoneCall className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.phone}</span>
                </a>
              </div>
            ))
          )}
        </div>

        <p className="mt-5 text-xs text-white/70 leading-relaxed">
          If you cannot talk aloud, you can dial <span className="font-mono font-semibold text-white">*120*7867#</span> (Please Call Me for GBV) or SMS <span className="font-mono font-semibold text-white">31393</span> (SADAG) or <span className="font-mono font-semibold text-white">32312</span> (Substance Abuse).
        </p>
      </GlassCard>
    </div>
  );
}
