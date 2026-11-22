import {
  BookmarkPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Wind,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GlassCard } from './GlassCard.tsx';

type AffirmationTheme = 'All' | 'Steady Today' | 'Ubuntu & Connection' | 'Urge & Pause';

interface AffirmationItem {
  id: string;
  theme: Exclude<AffirmationTheme, 'All'>;
  quote: string;
  reflection: string;
}

interface BreathingPhase {
  label: string;
  instruction: string;
  seconds: number;
  scaleClass: string;
}

interface BreathingPattern {
  id: string;
  name: string;
  summary: string;
  note: string;
  phases: BreathingPhase[];
}

interface SelfCareViewProps {
  onSaveAsStep: (text: string) => void;
}

const AFFIRMATION_THEMES: AffirmationTheme[] = [
  'All',
  'Steady Today',
  'Ubuntu & Connection',
  'Urge & Pause',
];

const AFFIRMATIONS: AffirmationItem[] = [
  {
    id: 'aff-1',
    theme: 'Steady Today',
    quote: 'One steady breath and one honest hour at a time is enough for today.',
    reflection:
      'Focus gently on what helps you stay safe in this hour.',
  },
  {
    id: 'aff-2',
    theme: 'Ubuntu & Connection',
    quote: 'Umntu ngumntu ngabantu — you do not have to carry heavy things alone.',
    reflection:
      'Reaching out to someone you trust is a quiet sign of courage.',
  },
  {
    id: 'aff-3',
    theme: 'Urge & Pause',
    quote: 'A craving or wave of anger is passing weather — it rises, peaks, and softens.',
    reflection:
      'Five quiet minutes create room for a safer next choice.',
  },
  {
    id: 'aff-4',
    theme: 'Steady Today',
    quote: 'A hard day does not erase the steps you have already taken.',
    reflection:
      'Speak to yourself with the patience you would offer someone you care about.',
  },
  {
    id: 'aff-5',
    theme: 'Urge & Pause',
    quote: 'Saying no to unsafe spaces is a way of protecting your peace.',
    reflection:
      'Choosing your wellbeing first is healthy, even when pressure feels loud.',
  },
  {
    id: 'aff-6',
    theme: 'Ubuntu & Connection',
    quote: 'Small progress still counts, even when nobody else sees the effort.',
    reflection:
      'Every honest routine or moment of rest deserves credit.',
  },
  {
    id: 'aff-7',
    theme: 'Steady Today',
    quote: 'Your past does not own your next decision. This moment is fresh.',
    reflection:
      'Put your energy into one kind thing for your mind or body today.',
  },
];

const BREATHING_PATTERNS: BreathingPattern[] = [
  {
    id: 'calm-446',
    name: '4-4-6 Calming Breath',
    summary: '4s inhale · 4s hold · 6s slow exhale',
    note: 'A longer, gentle exhale helps your body settle when stress or cravings feel intense.',
    phases: [
      {
        label: 'Inhale',
        instruction: 'Breathe in gently through your nose',
        seconds: 4,
        scaleClass: 'scale-100',
      },
      {
        label: 'Hold',
        instruction: 'Hold your breath lightly without straining',
        seconds: 4,
        scaleClass: 'scale-100',
      },
      {
        label: 'Exhale',
        instruction: 'Breathe out slowly through your mouth',
        seconds: 6,
        scaleClass: 'scale-75',
      },
    ],
  },
  {
    id: 'box-4444',
    name: 'Box Breathing',
    summary: '4s inhale · 4s hold · 4s exhale · 4s rest',
    note: 'An even, steady rhythm for grounding yourself when your thoughts feel crowded.',
    phases: [
      {
        label: 'Inhale',
        instruction: 'Breathe in steadily',
        seconds: 4,
        scaleClass: 'scale-100',
      },
      {
        label: 'Hold',
        instruction: 'Pause gently at the top',
        seconds: 4,
        scaleClass: 'scale-100',
      },
      {
        label: 'Exhale',
        instruction: 'Let the air out evenly',
        seconds: 4,
        scaleClass: 'scale-75',
      },
      {
        label: 'Rest',
        instruction: 'Pause quietly before the next breath',
        seconds: 4,
        scaleClass: 'scale-75',
      },
    ],
  },
];

const COMPLETION_BURST_PARTICLES = [
  { x: '-58px', y: '-38px', size: 8, color: '#6994c6', delay: '0ms' },
  { x: '-30px', y: '-56px', size: 6, color: '#3d6a9e', delay: '60ms' },
  { x: '0px', y: '-62px', size: 8, color: '#6994c6', delay: '30ms' },
  { x: '34px', y: '-52px', size: 7, color: '#3d6a9e', delay: '80ms' },
  { x: '58px', y: '-34px', size: 8, color: '#6994c6', delay: '40ms' },
  { x: '-64px', y: '6px', size: 6, color: '#3d6a9e', delay: '90ms' },
  { x: '64px', y: '8px', size: 6, color: '#3d6a9e', delay: '70ms' },
  { x: '-42px', y: '34px', size: 7, color: '#6994c6', delay: '110ms' },
  { x: '44px', y: '34px', size: 7, color: '#6994c6', delay: '100ms' },
];

function getDailyIndex(length: number): number {
  const now = new Date();
  const daySeed = now.getFullYear() * 366 + now.getMonth() * 31 + now.getDate();
  return daySeed % Math.max(1, length);
}

export function SelfCareView({ onSaveAsStep }: SelfCareViewProps) {
  const [selectedTheme, setSelectedTheme] = useState<AffirmationTheme>('All');
  const [affirmationIndex, setAffirmationIndex] = useState(() =>
    getDailyIndex(AFFIRMATIONS.length)
  );
  const [cardDirection, setCardDirection] = useState<'next' | 'prev'>('next');
  const [isDeckCompleted, setIsDeckCompleted] = useState(false);
  const [showCompletionBurst, setShowCompletionBurst] = useState(false);
  const [savedAffirmationId, setSavedAffirmationId] = useState<string | null>(null);
  const burstTimerRef = useRef<number | null>(null);

  const [patternId, setPatternId] = useState<string>(BREATHING_PATTERNS[0].id);
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(BREATHING_PATTERNS[0].phases[0].seconds);
  const [completedCycles, setCompletedCycles] = useState(0);

  useEffect(() => {
    return () => {
      if (burstTimerRef.current !== null) {
        window.clearTimeout(burstTimerRef.current);
      }
    };
  }, []);

  const filteredAffirmations = useMemo(() => {
    if (selectedTheme === 'All') return AFFIRMATIONS;
    return AFFIRMATIONS.filter((item) => item.theme === selectedTheme);
  }, [selectedTheme]);

  const safeAffirmationIndex = affirmationIndex % filteredAffirmations.length;
  const activeAffirmation = filteredAffirmations[safeAffirmationIndex];
  const isLastCard = safeAffirmationIndex === filteredAffirmations.length - 1;

  const activePattern = useMemo(
    () => BREATHING_PATTERNS.find((p) => p.id === patternId) ?? BREATHING_PATTERNS[0],
    [patternId]
  );

  const currentPhase = activePattern.phases[phaseIndex % activePattern.phases.length];

  useEffect(() => {
    if (!isBreathingActive) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prevSeconds) => {
        if (prevSeconds > 1) {
          return prevSeconds - 1;
        }
        const nextPhaseIdx = (phaseIndex + 1) % activePattern.phases.length;
        if (nextPhaseIdx === 0) {
          setCompletedCycles((c) => c + 1);
        }
        setPhaseIndex(nextPhaseIdx);
        return activePattern.phases[nextPhaseIdx].seconds;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isBreathingActive, phaseIndex, activePattern]);

  const handleSelectTheme = (theme: AffirmationTheme) => {
    setSelectedTheme(theme);
    setAffirmationIndex(0);
    setIsDeckCompleted(false);
    setShowCompletionBurst(false);
    setCardDirection('next');
  };

  const handlePrevAffirmation = () => {
    setCardDirection('prev');
    if (isDeckCompleted) {
      setIsDeckCompleted(false);
      setShowCompletionBurst(false);
      setAffirmationIndex(filteredAffirmations.length - 1);
      return;
    }
    setAffirmationIndex(
      (prev) => (prev - 1 + filteredAffirmations.length) % filteredAffirmations.length
    );
  };

  const handleNextAffirmation = () => {
    setCardDirection('next');
    if (isLastCard) {
      setIsDeckCompleted(true);
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      if (!reducedMotion) {
        setShowCompletionBurst(true);
        if (burstTimerRef.current !== null) {
          window.clearTimeout(burstTimerRef.current);
        }
        burstTimerRef.current = window.setTimeout(() => {
          setShowCompletionBurst(false);
        }, 1550);
      } else {
        setShowCompletionBurst(false);
      }
      return;
    }
    setAffirmationIndex((prev) => (prev + 1) % filteredAffirmations.length);
  };

  const handleRestartDeck = () => {
    setCardDirection('next');
    setIsDeckCompleted(false);
    setShowCompletionBurst(false);
    setAffirmationIndex(0);
  };

  const handleSaveAffirmationStep = () => {
    onSaveAsStep(activeAffirmation.quote);
    setSavedAffirmationId(activeAffirmation.id);
    window.setTimeout(() => setSavedAffirmationId(null), 2500);
  };

  const handleSelectPattern = (nextId: string) => {
    const nextPattern =
      BREATHING_PATTERNS.find((p) => p.id === nextId) ?? BREATHING_PATTERNS[0];
    setPatternId(nextId);
    setIsBreathingActive(false);
    setPhaseIndex(0);
    setSecondsLeft(nextPattern.phases[0].seconds);
    setCompletedCycles(0);
  };

  const handleResetBreathing = () => {
    setIsBreathingActive(false);
    setPhaseIndex(0);
    setSecondsLeft(activePattern.phases[0].seconds);
    setCompletedCycles(0);
  };

  const todayFormatted = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scroll-pb-20 px-0.5 pb-8 sm:pb-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header Card */}
        <GlassCard as="section">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
            {todayFormatted} · Non-clinical daily grounding
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2 text-balance">
            Quiet moments for rest and steadiness
          </h1>
          <p className="text-sm sm:text-base text-white/85 mt-2.5 leading-relaxed max-w-[65ch]">
            Short daily affirmations and calming breathing to help you slow down when things feel heavy.
          </p>
        </GlassCard>

        {/* Grouped Self-Care Activities inside one GlassCard with clear dividers */}
        <GlassCard padding="none" className="divide-y divide-white/15">
          {/* Section 1: Daily Affirmation Cards */}
          <section aria-labelledby="affirmations-heading" className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                  Reflection
                </p>
                <h2
                  id="affirmations-heading"
                  className="text-xl font-bold tracking-tight text-white mt-1"
                >
                  Daily Affirmations
                </h2>
              </div>

              <div
                role="tablist"
                aria-label="Affirmation themes"
                className="flex flex-wrap items-center gap-1 p-1.5 bg-white/10 border border-white/25 rounded-[16px] sm:rounded-full w-full sm:w-auto max-w-full"
              >
                {AFFIRMATION_THEMES.map((theme) => {
                  const active = selectedTheme === theme;
                  return (
                    <button
                      key={theme}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => handleSelectTheme(theme)}
                      className={`px-3 py-1.5 min-h-[44px] text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                        active
                          ? 'bg-white text-[#3d6a9e]'
                          : 'text-white/85 hover:text-white'
                      }`}
                    >
                      {theme}
                    </button>
                  );
                })}
              </div>
            </div>

            {isDeckCompleted ? (
              <div
                aria-live="polite"
                className="relative overflow-hidden rounded-[24px] bg-[#e3ecf6] border border-[#6994c6]/45 p-7 sm:p-10 text-center text-[#1f3a5f] shadow-sm"
              >
                {/* Soft decorative corner shape */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[#6994c6]/20"
                />

                <div className="relative z-10 flex flex-col items-center justify-center max-w-md mx-auto">
                  <div className="relative flex items-center justify-center">
                    {showCompletionBurst &&
                      COMPLETION_BURST_PARTICLES.map((p, idx) => (
                        <span
                          key={idx}
                          aria-hidden="true"
                          style={
                            {
                              width: `${p.size}px`,
                              height: `${p.size}px`,
                              backgroundColor: p.color,
                              animationDelay: p.delay,
                              '--burst-x': p.x,
                              '--burst-y': p.y,
                            } as React.CSSProperties
                          }
                          className="absolute rounded-full animate-confetti-burst pointer-events-none"
                        />
                      ))}

                    <span className="w-14 h-14 rounded-full bg-[#3d6a9e] text-white flex items-center justify-center shadow-sm animate-completion-pop">
                      <Check className="w-7 h-7" aria-hidden="true" />
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1f3a5f] mt-4">
                    You showed up for yourself today.
                  </h3>
                  <p className="text-sm text-[#1f3a5f]/85 mt-2">
                    Take one slow breath and carry what helped you into the rest of your day.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handlePrevAffirmation}
                      className="px-4 py-2 min-h-[44px] text-xs font-semibold text-[#1f3a5f] hover:bg-white/60 rounded-full cursor-pointer transition-colors"
                    >
                      Back to last card
                    </button>
                    <button
                      type="button"
                      onClick={handleRestartDeck}
                      className="px-5 py-2 min-h-[44px] text-xs font-semibold rounded-full bg-[#3d6a9e] text-white hover:bg-[#325884] transition-colors cursor-pointer shadow-sm"
                    >
                      Read again
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  key={`${activeAffirmation.id}-${cardDirection}`}
                  className={`relative overflow-hidden rounded-[24px] bg-[#e3ecf6] border border-[#6994c6]/45 p-6 sm:p-8 text-[#1f3a5f] shadow-sm ${
                    cardDirection === 'next'
                      ? 'animate-affirmation-next'
                      : 'animate-affirmation-prev'
                  }`}
                >
                  {/* Soft accent shape */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#6994c6]/20"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-[#f6f4f1]/60"
                  />

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="w-8 h-8 rounded-full bg-[#f6f4f1] text-[#3d6a9e] flex items-center justify-center border border-[#6994c6]/30"
                        >
                          <Sun className="w-4 h-4" />
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#3d6a9e]">
                          {activeAffirmation.theme}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#1f3a5f] tabular-nums">
                        {safeAffirmationIndex + 1} of {filteredAffirmations.length}
                      </span>
                    </div>

                    <blockquote className="text-xl sm:text-2xl font-bold tracking-tight text-[#1f3a5f] leading-snug text-balance">
                      “{activeAffirmation.quote}”
                    </blockquote>

                    <p className="text-sm text-[#1f3a5f]/85 leading-relaxed max-w-[58ch]">
                      {activeAffirmation.reflection}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevAffirmation}
                      aria-label="Previous affirmation"
                      className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full bg-transparent text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextAffirmation}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] text-xs font-semibold rounded-full bg-white/15 border border-white/25 text-white hover:bg-white/25 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <span>{isLastCard ? 'Finish cards' : 'Next affirmation'}</span>
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveAffirmationStep}
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] text-xs font-semibold rounded-full border border-white/30 bg-white/15 text-white hover:bg-white/25 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {savedAffirmationId === activeAffirmation.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Saved to Small Steps</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Save to Small Steps</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Simple Breathing Exercise */}
          <section aria-labelledby="breathing-heading" className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                  Paced Reset
                </p>
                <h2
                  id="breathing-heading"
                  className="text-xl font-bold tracking-tight text-white mt-1"
                >
                  Guided Breathing
                </h2>
                <p className="text-sm text-white/85 mt-0.5">
                  Follow the pace gently at your own comfort.
                </p>
              </div>

              <div
                role="tablist"
                aria-label="Breathing pattern"
                className="flex flex-wrap items-center gap-1 p-1.5 bg-white/10 border border-white/25 rounded-[16px] sm:rounded-full w-full sm:w-auto max-w-full"
              >
                {BREATHING_PATTERNS.map((pattern) => {
                  const active = pattern.id === activePattern.id;
                  return (
                    <button
                      key={pattern.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => handleSelectPattern(pattern.id)}
                      className={`px-3.5 py-1.5 min-h-[44px] text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                        active
                          ? 'bg-white text-[#3d6a9e]'
                          : 'text-white/85 hover:text-white'
                      }`}
                    >
                      {pattern.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-1">
              {/* Visual Breath Circle */}
              <div className="md:col-span-5 flex flex-col items-center justify-center py-3">
                <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center">
                  <div
                    aria-hidden="true"
                    className={`absolute inset-0 rounded-full bg-white/[0.16] border border-white/30 transition-transform duration-1000 ease-in-out ${
                      isBreathingActive ? currentPhase.scaleClass : 'scale-85'
                    }`}
                  />
                  <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
                    <Wind
                      className="w-5 h-5 text-white/90 mb-1.5"
                      aria-hidden="true"
                    />
                    <span className="text-lg font-bold tracking-tight text-white">
                      {isBreathingActive ? currentPhase.label : 'Ready'}
                    </span>
                    <span
                      aria-live="polite"
                      className="font-mono text-2xl font-bold text-white tabular-nums mt-0.5"
                    >
                      {secondsLeft}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Instructions & Controls */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                    {activePattern.summary}
                  </p>
                  <p className="text-base font-semibold text-white mt-1.5">
                    {isBreathingActive
                      ? currentPhase.instruction
                      : 'Press Start whenever you would like to take a few calm breaths.'}
                  </p>
                  <p className="text-sm text-white/85 mt-1.5 leading-relaxed">
                    {activePattern.note}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsBreathingActive((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 min-h-[44px] text-sm font-semibold rounded-full bg-white text-[#3d6a9e] hover:bg-[#f6f4f1] transition-colors whitespace-nowrap cursor-pointer shadow-sm"
                  >
                    {isBreathingActive ? (
                      <>
                        <Pause className="w-4 h-4" aria-hidden="true" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" aria-hidden="true" />
                        <span>Start breathing</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetBreathing}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-sm font-medium rounded-full bg-transparent text-white/85 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    <span>Reset</span>
                  </button>

                  <span className="text-xs text-white/80 tabular-nums ml-1">
                    {completedCycles} {completedCycles === 1 ? 'cycle' : 'cycles'} completed
                  </span>
                </div>

                <p className="text-xs text-white/80">
                  Stop anytime if you feel dizzy or uncomfortable, and return to your natural breathing.
                </p>
              </div>
            </div>
          </section>
        </GlassCard>
      </div>
    </div>
  );
}
