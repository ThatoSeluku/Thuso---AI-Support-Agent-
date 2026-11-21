import { PhoneCall, ShieldAlert, X, Wind } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SupportResource } from '../types.ts';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f3a5f]/40 dark:bg-[#091424]/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90dvh] overflow-y-auto bg-white dark:bg-[#182d4a] border border-[#dce3ec] dark:border-[#2d4b73] rounded-xl p-6 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#dce3ec] dark:border-[#2d4b73]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FEF3F2] dark:bg-[#331618] border border-[#F3C5C5] dark:border-[#7A271A] text-[#B42318] dark:text-[#FDA29B] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="urgent-help-title"
                className="font-serif text-xl font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]"
              >
                Immediate South African Support
              </h2>
              <p className="text-sm text-[#4a6280] dark:text-[#c5d3e6] mt-1">
                If you or someone near you is in immediate danger, please call one of these free lines right now.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close urgent help"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#4a6280] dark:text-[#c5d3e6] hover:text-[#1f3a5f] dark:hover:text-[#f6f4f1] hover:bg-[#e3ecf6] dark:hover:bg-[#213f66] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Breathing grounding anchor */}
        <div className="mt-4 p-4 rounded-lg bg-[#f6f4f1] dark:bg-[#12233b] border border-[#dce3ec] dark:border-[#2d4b73] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Wind className="w-5 h-5 text-[#3d6a9e] dark:text-[#8eb4e0] shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-[#1f3a5f] dark:text-[#f6f4f1]">{breathInstruction}</p>
              {breathPhase !== 'idle' && (
                <p className="text-xs font-mono tabular-nums text-[#3d6a9e] dark:text-[#8eb4e0] mt-0.5">
                  {breathSeconds}s remaining
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={startBreathing}
            className="px-4 py-2 min-h-[40px] text-sm font-medium rounded-lg border border-[#c5d1e0] dark:border-[#2d4b73] bg-white dark:bg-[#182d4a] text-[#1f3a5f] dark:text-[#f6f4f1] hover:bg-[#e3ecf6] dark:hover:bg-[#213f66] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {breathPhase === 'idle' ? 'Start breathing' : 'Stop'}
          </button>
        </div>

        {/* Urgent Numbers List (fetched from backend) */}
        <div className="mt-4 divide-y divide-[#dce3ec] dark:divide-[#2d4b73] border border-[#dce3ec] dark:border-[#2d4b73] rounded-lg bg-white dark:bg-[#12233b]">
          {urgentResources.length === 0 ? (
            <div className="p-4 text-sm text-[#4a6280] dark:text-[#c5d3e6]">
              Loading emergency numbers from the server...
            </div>
          ) : (
            urgentResources.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]">{item.name}</p>
                  <p className="text-xs text-[#4a6280] dark:text-[#c5d3e6] mt-0.5">
                    {item.hours} · {item.cost}
                    {item.secondaryContact ? ` · ${item.secondaryContact}` : ''}
                  </p>
                </div>
                <a
                  href={item.telHref}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-[#B42318] text-white text-sm font-mono font-semibold tabular-nums hover:bg-[#912018] transition-colors whitespace-nowrap shrink-0"
                >
                  <PhoneCall className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.phone}</span>
                </a>
              </div>
            ))
          )}
        </div>

        <p className="mt-4 text-xs text-[#4a6280] dark:text-[#c5d3e6] leading-relaxed">
          If you cannot talk aloud, you can dial <span className="font-mono font-medium text-[#1f3a5f] dark:text-[#f6f4f1]">*120*7867#</span> (Please Call Me for GBV) or SMS <span className="font-mono font-medium text-[#1f3a5f] dark:text-[#f6f4f1]">31393</span> (SADAG) or <span className="font-mono font-medium text-[#1f3a5f] dark:text-[#f6f4f1]">32312</span> (Substance Abuse).
        </p>
      </div>
    </div>
  );
}
