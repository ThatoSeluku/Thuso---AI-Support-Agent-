import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { triggerHaptic } from '../utils/haptics.ts';

export interface TourStep {
  id: string;
  selector: string;
  title: string;
  text: string;
}

export const THUSO_TOUR_STEPS: TourStep[] = [
  {
    id: 'talk-to-thuso',
    selector: '[data-tour="chat-input"]',
    title: 'Talk to Thuso',
    text: "Type what's on your mind in English, isiZulu, Sesotho, Afrikaans or Setswana. Thuso listens first, with no judgement.",
  },
  {
    id: 'anonymous-private',
    selector: '[data-tour="privacy-line"]',
    title: 'Anonymous and private',
    text: "No sign-up and no name needed. Thuso doesn't save your chats, and 'Clear chat' removes them from this device.",
  },
  {
    id: 'small-steps',
    selector: '[data-tour="small-steps-tab"]',
    title: 'Small Steps',
    text: 'Turn a conversation into one small, doable step. Saved steps stay on this device.',
  },
  {
    id: 'self-care',
    selector: '[data-tour="self-care-target"]',
    title: 'Self-care',
    text: 'Quick ideas to calm down and reset when things feel heavy.',
  },
  {
    id: 'urgent-help',
    selector: '[data-tour="urgent-help-btn"]',
    title: 'Need help now?',
    text: "If you're in danger, tap here any time for emergency numbers.",
  },
];

interface CoachMarksTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

function findVisibleTarget(selector: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(selector);
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return el;
    }
  }
  return null;
}

export function CoachMarksTour({
  isOpen,
  onComplete,
  onSkip,
}: CoachMarksTourProps) {
  const titleId = useId();
  const descId = useId();

  const [visibleSteps, setVisibleSteps] = useState<TourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));
  const [cardSize, setCardSize] = useState({ width: 352, height: 220 });

  const cardRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const measureAndSync = useCallback(() => {
    if (!isOpen) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setViewport({ width: vw, height: vh });

    const available = THUSO_TOUR_STEPS.filter(
      (step) => findVisibleTarget(step.selector) !== null
    );

    if (available.length === 0) {
      onSkip();
      return;
    }

    setVisibleSteps(available);
    setStepIndex((prev) => Math.min(prev, available.length - 1));
  }, [isOpen, onSkip]);

  // Initialize steps & focus when tour opens; restore focus when tour closes
  useEffect(() => {
    if (!isOpen) {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
      setTargetRect(null);
      setStepIndex(0);
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setStepIndex(0);
    measureAndSync();

    const focusTimer = window.requestAnimationFrame(() => {
      cardRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(focusTimer);
  }, [isOpen, measureAndSync]);

  const activeStep = visibleSteps[stepIndex] ?? null;

  // Measure target rect & card dimensions on step change, resize, or scroll
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !activeStep) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setViewport({ width: vw, height: vh });

    const el = findVisibleTarget(activeStep.selector);
    if (!el) {
      // Silently skip missing step
      const remaining = THUSO_TOUR_STEPS.filter(
        (s) => findVisibleTarget(s.selector) !== null
      );
      if (remaining.length === 0) {
        onSkip();
        return;
      }
      setVisibleSteps(remaining);
      setStepIndex((prev) => Math.min(prev, remaining.length - 1));
      return;
    }

    const r = el.getBoundingClientRect();
    setTargetRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
      bottom: r.bottom,
      right: r.right,
    });

    if (cardRef.current) {
      const cr = cardRef.current.getBoundingClientRect();
      if (cr.width > 0 && cr.height > 0) {
        setCardSize({ width: cr.width, height: cr.height });
      }
    }
  }, [isOpen, activeStep, onSkip]);

  useLayoutEffect(() => {
    if (!isOpen || !activeStep) return;

    const el = findVisibleTarget(activeStep.selector);
    if (el) {
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      el.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    }

    updateTargetPosition();
    const raf = window.requestAnimationFrame(updateTargetPosition);

    const handleResizeOrScroll = () => {
      updateTargetPosition();
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, {
        capture: true,
      });
    };
  }, [isOpen, activeStep, updateTargetPosition]);

  const handleNext = useCallback(() => {
    if (stepIndex >= visibleSteps.length - 1) {
      onComplete();
    } else {
      setStepIndex((prev) => Math.min(prev + 1, visibleSteps.length - 1));
    }
  }, [stepIndex, visibleSteps.length, onComplete]);

  const handleBack = useCallback(() => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Keyboard navigation: Esc to skip, Enter for Next (when not on Back/Skip), Tab focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
        return;
      }

      if (e.key === 'Tab' && cardRef.current) {
        const focusable = Array.from(
          cardRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            document.activeElement === cardRef.current
          ) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      if (e.key === 'Enter') {
        const active = document.activeElement;
        if (
          active instanceof HTMLButtonElement &&
          cardRef.current?.contains(active)
        ) {
          // Let native button activation run (Skip tour, Back, Next/Got it)
          return;
        }
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSkip, handleNext]);

  if (!isOpen || !activeStep || !targetRect) {
    return null;
  }

  const isMobile = viewport.width < 768;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === visibleSteps.length - 1;

  // Spotlight cutout coordinates
  const pad = 6;
  const cutoutTop = Math.max(0, targetRect.top - pad);
  const cutoutLeft = Math.max(0, targetRect.left - pad);
  const cutoutWidth = Math.min(viewport.width - cutoutLeft, targetRect.width + pad * 2);
  const cutoutHeight = Math.min(viewport.height - cutoutTop, targetRect.height + pad * 2);

  // Mobile: steps 1..4 sit at top safe-area so bottom nav stays visible and tappable;
  // step 5 (last step) keeps its bottom position.
  // Desktop: pointer card placed above or below the spotlighted element.
  let cardStyle: React.CSSProperties = {};
  let pointerDirection: 'top' | 'bottom' | null = null;
  let pointerLeftPx = 40;

  if (isMobile) {
    cardStyle = !isLast
      ? {
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          left: '12px',
          right: '12px',
        }
      : {
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          left: '12px',
          right: '12px',
        };
  } else {
    const margin = 16;
    const gap = 14;
    const width = Math.min(352, viewport.width - margin * 2);
    const estHeight = cardSize.height || 220;

    const spaceBelow = viewport.height - cutoutTop - cutoutHeight - gap - margin;
    const spaceAbove = cutoutTop - gap - margin;

    let top: number;
    if (spaceBelow >= estHeight || spaceBelow >= spaceAbove) {
      top = Math.min(
        viewport.height - estHeight - margin,
        cutoutTop + cutoutHeight + gap
      );
      pointerDirection = 'top';
    } else {
      top = Math.max(margin, cutoutTop - estHeight - gap);
      pointerDirection = 'bottom';
    }

    const targetCenterX = cutoutLeft + cutoutWidth / 2;
    const left = Math.max(
      margin,
      Math.min(viewport.width - width - margin, targetCenterX - width / 2)
    );

    pointerLeftPx = Math.max(20, Math.min(width - 28, targetCenterX - left - 6));

    cardStyle = {
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${Math.round(width)}px`,
    };
  }

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {/* Click-shield backdrop: leaves mobile bottom nav tappable on steps 1..4 */}
      <div
        aria-hidden="true"
        className={`fixed inset-x-0 top-0 z-[60] bg-transparent pointer-events-auto ${
          isMobile && !isLast
            ? 'bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))]'
            : 'bottom-0'
        }`}
      />

      {/* Spotlight cutout & highlight ring */}
      <div
        aria-hidden="true"
        className="fixed z-[61] pointer-events-none rounded-[20px] border-2 border-white transition-all duration-200 ease-out"
        style={{
          top: `${Math.round(cutoutTop)}px`,
          left: `${Math.round(cutoutLeft)}px`,
          width: `${Math.round(cutoutWidth)}px`,
          height: `${Math.round(cutoutHeight)}px`,
          boxShadow: '0 0 0 9999px rgba(30, 27, 75, 0.72)',
        }}
      />

      {/* Coach Mark Card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        style={cardStyle}
        className={`fixed z-[62] pointer-events-auto bg-white text-[#1f3a5f] border border-white/60 rounded-[24px] shadow-2xl p-6 focus:outline-none ${
          isMobile
            ? `max-w-md mx-auto ${
                !isLast
                  ? 'max-h-[calc(100dvh-env(safe-area-inset-top,0px)-140px)] overflow-y-auto'
                  : ''
              }`
            : ''
        }`}
      >
        {/* Directional caret on desktop */}
        {!isMobile && pointerDirection === 'top' && (
          <div
            aria-hidden="true"
            style={{ left: `${Math.round(pointerLeftPx)}px` }}
            className="absolute -top-2 w-3.5 h-3.5 rotate-45 bg-white"
          />
        )}
        {!isMobile && pointerDirection === 'bottom' && (
          <div
            aria-hidden="true"
            style={{ left: `${Math.round(pointerLeftPx)}px` }}
            className="absolute -bottom-2 w-3.5 h-3.5 rotate-45 bg-white"
          />
        )}

        {/* Screen-reader live announcement */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {`Step ${stepIndex + 1} of ${visibleSteps.length}: ${activeStep.title}. ${activeStep.text}`}
        </div>

        {/* Top row: Step counter + Skip tour at top right */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6D3FE0] tabular-nums">
            {stepIndex + 1} of {visibleSteps.length}
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="min-h-[44px] px-2 -mr-2 inline-flex items-center justify-center text-xs font-semibold text-[#1f3a5f]/70 hover:text-[#1f3a5f] hover:underline rounded-full cursor-pointer"
          >
            Skip tour
          </button>
        </div>

        <h2
          id={titleId}
          className="text-lg font-bold tracking-tight text-[#1f3a5f] mt-1"
        >
          {activeStep.title}
        </h2>

        <p
          id={descId}
          className="text-sm text-[#1f3a5f]/85 leading-relaxed mt-2"
        >
          {activeStep.text}
        </p>

        {/* Bottom navigation controls */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={isFirst}
            className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-full text-[#1f3a5f]/75 hover:text-[#1f3a5f] disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isLast) {
                triggerHaptic('light');
              }
              handleNext();
            }}
            className="min-h-[44px] px-6 py-2 text-sm font-semibold rounded-full bg-[#6D3FE0] text-white hover:bg-[#5c32c7] transition-colors cursor-pointer"
          >
            {isLast ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
