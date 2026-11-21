import {
  BookmarkPlus,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Pause,
  Play,
  RotateCcw,
  Wind,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
      'You do not have to figure out the whole month right now. Focus gently on what helps you stay safe in this hour.',
  },
  {
    id: 'aff-2',
    theme: 'Ubuntu & Connection',
    quote: 'Umntu ngumntu ngabantu — you do not have to carry heavy things in silence.',
    reflection:
      'Reaching out to a trusted friend, relative, or helpline is a sign of courage, not weakness.',
  },
  {
    id: 'aff-3',
    theme: 'Urge & Pause',
    quote: 'A craving or wave of anger is like weather passing through — it rises, peaks, and softens.',
    reflection:
      'Give yourself five quiet minutes before reacting. Even a short pause creates room for a safer choice.',
  },
  {
    id: 'aff-4',
    theme: 'Steady Today',
    quote: 'Healing is not a straight line. Having a hard day does not erase the steps you have already taken.',
    reflection:
      'Speak to yourself with the same patience you would offer a younger sibling who is trying again.',
  },
  {
    id: 'aff-5',
    theme: 'Urge & Pause',
    quote: 'Saying no to people or places that pull you toward harm is a way of protecting your peace.',
    reflection:
      'Choosing your safety and future first is healthy, even when old habits or pressure feel loud.',
  },
  {
    id: 'aff-6',
    theme: 'Ubuntu & Connection',
    quote: 'Small progress still counts, even when nobody else sees the effort it took to make it.',
    reflection:
      'Every morning you choose rest, honesty, or one small helpful routine is worth acknowledging.',
  },
  {
    id: 'aff-7',
    theme: 'Steady Today',
    quote: 'Your past does not own your next decision. This moment is a fresh place to begin.',
    reflection:
      'Let go of shame where you can, and put that energy into one kind thing for your body or mind today.',
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

const GROUNDING_STEPS = [
  {
    id: 'see-5',
    count: '5',
    prompt: 'Notice 5 things you can see right where you are',
    detail: 'A colour on a wall, light through a window, your shoes, or a familiar object.',
  },
  {
    id: 'feel-4',
    count: '4',
    prompt: 'Notice 4 things you can physically feel',
    detail: 'Your feet resting on the ground, fabric on your arms, or cool air on your skin.',
  },
  {
    id: 'hear-3',
    count: '3',
    prompt: 'Listen for 3 quiet or everyday sounds',
    detail: 'Distant traffic, birds, voices outside, or the hum of a room.',
  },
  {
    id: 'smell-2',
    count: '2',
    prompt: 'Notice 2 scents or take 2 slow breaths',
    detail: 'Fresh air, tea, soap, or simply the coolness of breathing in.',
  },
  {
    id: 'kind-1',
    count: '1',
    prompt: 'Offer yourself 1 kind, steady thought for today',
    detail: 'For example: “I am taking this one moment at a time.”',
  },
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
  const [savedAffirmationId, setSavedAffirmationId] = useState<string | null>(null);

  const [patternId, setPatternId] = useState<string>(BREATHING_PATTERNS[0].id);
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(BREATHING_PATTERNS[0].phases[0].seconds);
  const [completedCycles, setCompletedCycles] = useState(0);

  const [checkedGrounding, setCheckedGrounding] = useState<Set<string>>(() => new Set());

  const filteredAffirmations = useMemo(() => {
    if (selectedTheme === 'All') return AFFIRMATIONS;
    return AFFIRMATIONS.filter((item) => item.theme === selectedTheme);
  }, [selectedTheme]);

  const safeAffirmationIndex = affirmationIndex % filteredAffirmations.length;
  const activeAffirmation = filteredAffirmations[safeAffirmationIndex];

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
  };

  const handlePrevAffirmation = () => {
    setAffirmationIndex(
      (prev) => (prev - 1 + filteredAffirmations.length) % filteredAffirmations.length
    );
  };

  const handleNextAffirmation = () => {
    setAffirmationIndex((prev) => (prev + 1) % filteredAffirmations.length);
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

  const toggleGroundingItem = (id: string) => {
    setCheckedGrounding((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const todayFormatted = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#182d4a] px-4 sm:px-8 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <section className="pb-6 border-b border-[#dce3ec] dark:border-[#2d4b73]">
          <p className="text-xs font-medium text-[#4a6280] dark:text-[#c5d3e6]">
            {todayFormatted} · Non-clinical daily grounding
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1f3a5f] dark:text-[#f6f4f1] mt-2 text-balance">
            Quiet moments for rest and steadiness
          </h1>
          <p className="text-sm sm:text-base text-[#4a6280] dark:text-[#c5d3e6] mt-2.5 leading-relaxed max-w-[65ch]">
            Simple everyday affirmations and breathing exercises to help your body slow down when things feel heavy. Nothing here is medical treatment—go gently and skip anything that does not feel right today.
          </p>
        </section>

        {/* Section 1: Daily Wellness Affirmations */}
        <section aria-labelledby="affirmations-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2
                id="affirmations-heading"
                className="font-serif text-xl font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]"
              >
                Daily Affirmation
              </h2>
              <p className="text-sm text-[#4a6280] dark:text-[#c5d3e6] mt-0.5">
                A gentle reminder to read slowly or keep with you today.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Affirmation themes"
              className="flex items-center gap-1 p-1 bg-[#f6f4f1] dark:bg-[#12233b] border border-[#dce3ec] dark:border-[#2d4b73] rounded-lg overflow-x-auto"
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
                    className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-[#213f66] text-[#1f3a5f] dark:text-[#f6f4f1] border border-[#dce3ec] dark:border-[#3c5e8a]'
                        : 'text-[#4a6280] dark:text-[#c5d3e6] hover:text-[#1f3a5f] dark:hover:text-[#f6f4f1]'
                    }`}
                  >
                    {theme}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 rounded-xl bg-[#e3ecf6] dark:bg-[#213f66] border border-[#dce3ec] dark:border-[#2d4b73] space-y-4">
            <p className="text-xs font-medium text-[#4a6280] dark:text-[#c5d3e6] tabular-nums">
              {activeAffirmation.theme} · {safeAffirmationIndex + 1} of{' '}
              {filteredAffirmations.length}
            </p>

            <blockquote className="font-serif text-xl sm:text-2xl font-medium text-[#1f3a5f] dark:text-[#f6f4f1] leading-snug text-balance">
              “{activeAffirmation.quote}”
            </blockquote>

            <p className="text-sm text-[#4a6280] dark:text-[#c5d3e6] leading-relaxed max-w-[65ch]">
              {activeAffirmation.reflection}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#c5d1e0] dark:border-[#355682]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevAffirmation}
                  aria-label="Previous affirmation"
                  className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-lg bg-white dark:bg-[#182d4a] border border-[#dce3ec] dark:border-[#2d4b73] text-[#1f3a5f] dark:text-[#f6f4f1] hover:border-[#6994c6] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleNextAffirmation}
                  className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-medium rounded-lg bg-white dark:bg-[#182d4a] border border-[#dce3ec] dark:border-[#2d4b73] text-[#1f3a5f] dark:text-[#f6f4f1] hover:border-[#6994c6] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Next affirmation</span>
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveAffirmationStep}
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-medium rounded-lg bg-[#3d6a9e] text-white hover:bg-[#2f5582] dark:bg-[#6994c6] dark:text-[#0f1f36] dark:hover:bg-[#7da6d4] transition-colors whitespace-nowrap cursor-pointer"
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
        </section>

        {/* Section 2: Simple Breathing Exercise */}
        <section
          aria-labelledby="breathing-heading"
          className="pt-6 border-t border-[#dce3ec] dark:border-[#2d4b73] space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2
                id="breathing-heading"
                className="font-serif text-xl font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]"
              >
                Guided Breathing
              </h2>
              <p className="text-sm text-[#4a6280] dark:text-[#c5d3e6] mt-0.5">
                Follow the pace gently at your own comfort.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Breathing pattern"
              className="flex items-center gap-1 p-1 bg-[#f6f4f1] dark:bg-[#12233b] border border-[#dce3ec] dark:border-[#2d4b73] rounded-lg overflow-x-auto"
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
                    className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-[#213f66] text-[#1f3a5f] dark:text-[#f6f4f1] border border-[#dce3ec] dark:border-[#3c5e8a]'
                        : 'text-[#4a6280] dark:text-[#c5d3e6] hover:text-[#1f3a5f] dark:hover:text-[#f6f4f1]'
                    }`}
                  >
                    {pattern.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 rounded-xl bg-[#f6f4f1] dark:bg-[#12233b] border border-[#dce3ec] dark:border-[#2d4b73] grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Visual Breath Circle */}
            <div className="md:col-span-5 flex flex-col items-center justify-center py-4">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <div
                  aria-hidden="true"
                  className={`absolute inset-0 rounded-full bg-[#e3ecf6] dark:bg-[#213f66] border border-[#c5d1e0] dark:border-[#3c5e8a] transition-transform duration-1000 ease-in-out ${
                    isBreathingActive ? currentPhase.scaleClass : 'scale-85'
                  }`}
                />
                <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
                  <Wind
                    className="w-5 h-5 text-[#3d6a9e] dark:text-[#8eb4e0] mb-1.5"
                    aria-hidden="true"
                  />
                  <span className="font-serif text-lg font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]">
                    {isBreathingActive ? currentPhase.label : 'Ready'}
                  </span>
                  <span
                    aria-live="polite"
                    className="font-mono text-2xl font-semibold text-[#3d6a9e] dark:text-[#8eb4e0] tabular-nums mt-0.5"
                  >
                    {secondsLeft}s
                  </span>
                </div>
              </div>
            </div>

            {/* Instructions & Controls */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <p className="text-xs font-medium text-[#4a6280] dark:text-[#c5d3e6]">
                  {activePattern.summary}
                </p>
                <p className="text-base font-medium text-[#1f3a5f] dark:text-[#f6f4f1] mt-1.5">
                  {isBreathingActive
                    ? currentPhase.instruction
                    : 'Press Start whenever you would like to take a few calm breaths.'}
                </p>
                <p className="text-sm text-[#4a6280] dark:text-[#c5d3e6] mt-1.5 leading-relaxed">
                  {activePattern.note}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBreathingActive((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-medium rounded-lg bg-[#3d6a9e] text-white hover:bg-[#2f5582] dark:bg-[#6994c6] dark:text-[#0f1f36] dark:hover:bg-[#7da6d4] transition-colors whitespace-nowrap cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-lg bg-white dark:bg-[#182d4a] border border-[#dce3ec] dark:border-[#2d4b73] text-[#1f3a5f] dark:text-[#f6f4f1] hover:border-[#6994c6] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-[#3d6a9e] dark:text-[#8eb4e0]" aria-hidden="true" />
                  <span>Reset</span>
                </button>

                <span className="text-xs text-[#4a6280] dark:text-[#c5d3e6] tabular-nums ml-1">
                  {completedCycles} {completedCycles === 1 ? 'cycle' : 'cycles'} completed
                </span>
              </div>

              <p className="text-xs text-[#4a6280] dark:text-[#c5d3e6]">
                Stop anytime if you feel dizzy or uncomfortable, and return to your natural breathing.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Gentle 5-4-3-2-1 Grounding Pause */}
        <section
          aria-labelledby="grounding-heading"
          className="pt-6 border-t border-[#dce3ec] dark:border-[#2d4b73] space-y-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="grounding-heading"
                className="font-serif text-xl font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]"
              >
                5-4-3-2-1 Grounding Check-In
              </h2>
              <p className="text-sm text-[#4a6280] dark:text-[#c5d3e6] mt-0.5">
                Tap through these five sensory steps to bring your attention back to the room around you.
              </p>
            </div>

            {checkedGrounding.size > 0 && (
              <button
                type="button"
                onClick={() => setCheckedGrounding(new Set())}
                className="text-xs font-medium text-[#3d6a9e] hover:text-[#2f5582] dark:text-[#8eb4e0] dark:hover:text-[#b4cff0] hover:underline py-1 cursor-pointer whitespace-nowrap"
              >
                Clear check-in
              </button>
            )}
          </div>

          <ul className="divide-y divide-[#dce3ec] dark:divide-[#2d4b73] border border-[#dce3ec] dark:border-[#2d4b73] rounded-xl bg-white dark:bg-[#12233b]">
            {GROUNDING_STEPS.map((item) => {
              const checked = checkedGrounding.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggleGroundingItem(item.id)}
                    className="w-full p-4 flex items-start gap-3.5 text-left hover:bg-[#f6f4f1] dark:hover:bg-[#182d4a] transition-colors cursor-pointer"
                  >
                    {checked ? (
                      <CheckCircle2
                        className="w-5 h-5 text-[#3d6a9e] dark:text-[#8eb4e0] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="w-5 h-5 text-[#4a6280] dark:text-[#c5d3e6] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm leading-snug ${
                          checked
                            ? 'line-through text-[#4a6280] dark:text-[#9cb1cc]'
                            : 'text-[#1f3a5f] dark:text-[#f6f4f1] font-medium'
                        }`}
                      >
                        <span className="font-mono font-semibold text-[#3d6a9e] dark:text-[#8eb4e0] mr-2 tabular-nums">
                          {item.count}
                        </span>
                        {item.prompt}
                      </p>
                      <p className="text-xs text-[#4a6280] dark:text-[#c5d3e6] mt-1">
                        {item.detail}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
