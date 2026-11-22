import {
  Check,
  CheckCircle2,
  Circle,
  Compass,
  FileDown,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SANCTUARY_SPACE_URL } from '../data/uiContent.ts';
import { SmallStep, TriggerNote } from '../types.ts';
import {
  exportRecordsAsPdf,
  exportRecordsAsText,
} from '../utils/exportRecords.ts';
import { GlassCard } from './GlassCard.tsx';

interface SmallStepsViewProps {
  steps: SmallStep[];
  triggers: TriggerNote[];
  onAddStep: (text: string) => void;
  onToggleStep: (id: string) => void;
  onDeleteStep: (id: string) => void;
  onClearCompletedSteps: () => void;
  onCheckInWithThuso: (stepText: string) => void;
  onAddTrigger: (note: Omit<TriggerNote, 'id' | 'createdAt'>) => void;
  onDeleteTrigger: (id: string) => void;
}

interface WeeklyDayStat {
  label: string;
  dateKey: string;
  isToday: boolean;
  added: number;
  completed: number;
}

function toLocalDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function resolveStepDateKey(
  isoString: string | undefined,
  fallbackId?: string
): string | null {
  if (isoString) {
    const parsed = new Date(isoString);
    if (!Number.isNaN(parsed.getTime())) {
      return toLocalDateKey(parsed);
    }
  }
  if (fallbackId) {
    const match = /^step-(\d{13})$/.exec(fallbackId);
    if (match) {
      const parsed = new Date(Number(match[1]));
      if (!Number.isNaN(parsed.getTime())) {
        return toLocalDateKey(parsed);
      }
    }
  }
  return null;
}

function buildSmoothCurvePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = ((p0.x + p1.x) / 2).toFixed(1);
    d += ` C ${midX} ${p0.y.toFixed(1)}, ${midX} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

interface AutoGrowInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onEnterSubmit?: () => void;
  placeholder: string;
  className?: string;
}

function AutoGrowInput({
  id,
  value,
  onChange,
  onEnterSubmit,
  placeholder,
  className = '',
}: AutoGrowInputProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(44, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  useEffect(() => {
    window.addEventListener('resize', syncHeight);
    return () => window.removeEventListener('resize', syncHeight);
  }, [syncHeight]);

  return (
    <textarea
      ref={ref}
      id={id}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onEnterSubmit?.();
        }
      }}
      placeholder={placeholder}
      className={`overflow-hidden resize-none ${className}`}
    />
  );
}

export function SmallStepsView({
  steps,
  triggers,
  onAddStep,
  onToggleStep,
  onDeleteStep,
  onClearCompletedSteps,
  onCheckInWithThuso,
  onAddTrigger,
  onDeleteTrigger,
}: SmallStepsViewProps) {
  const chartGradientId = useId();
  const [newStep, setNewStep] = useState('');
  const [situation, setSituation] = useState('');
  const [thought, setThought] = useState('');
  const [helpfulAction, setHelpfulAction] = useState('');
  const [bannerError, setBannerError] = useState(false);
  const [exportedType, setExportedType] = useState<'txt' | 'pdf' | null>(null);
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const completedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (completedTimerRef.current !== null) {
        window.clearTimeout(completedTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!confirmClearOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmClearOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmClearOpen]);

  const handleStepToggle = (step: SmallStep) => {
    if (!step.completed) {
      setJustCompletedId(step.id);
      if (completedTimerRef.current !== null) {
        window.clearTimeout(completedTimerRef.current);
      }
      completedTimerRef.current = window.setTimeout(() => {
        setJustCompletedId(null);
      }, 650);
    } else if (justCompletedId === step.id) {
      setJustCompletedId(null);
    }
    onToggleStep(step.id);
  };

  const completedCount = steps.filter((s) => s.completed).length;
  const totalSteps = steps.length;
  const progressPercent =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const hasRecords = totalSteps > 0 || triggers.length > 0;

  const progressEncouragement =
    totalSteps === 0
      ? 'Your step progress'
      : completedCount === 0
        ? ''
        : completedCount === totalSteps
          ? `All ${totalSteps} ${totalSteps === 1 ? 'step' : 'steps'} completed — well done`
          : 'Keep going — one step at a time';

  // Compute Mon-Sun daily counts for the current local week dynamically from device-only steps
  const weeklyStats: WeeklyDayStat[] = useMemo(() => {
    const now = new Date();
    const todayKey = toLocalDateKey(now);
    const dayOfWeek = (now.getDay() + 6) % 7; // Mon=0 .. Sun=6
    const monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - dayOfWeek
    );
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const buckets: WeeklyDayStat[] = dayLabels.map((label, idx) => {
      const d = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + idx
      );
      const dateKey = toLocalDateKey(d);
      return {
        label,
        dateKey,
        isToday: dateKey === todayKey,
        added: 0,
        completed: 0,
      };
    });

    const bucketMap = new Map<string, WeeklyDayStat>();
    buckets.forEach((b) => bucketMap.set(b.dateKey, b));

    for (const step of steps) {
      const addedKey = resolveStepDateKey(step.createdAtIso, step.id);
      if (addedKey) {
        const addedBucket = bucketMap.get(addedKey);
        if (addedBucket) {
          addedBucket.added += 1;
        }
      }

      if (step.completed) {
        const completedKey =
          resolveStepDateKey(step.completedAtIso, step.id) ?? todayKey;
        const completedBucket = bucketMap.get(completedKey);
        if (completedBucket) {
          completedBucket.completed += 1;
        }
      }
    }

    return buckets;
  }, [steps]);

  const chartGeometry = useMemo(() => {
    const width = 320;
    const height = 138;
    const padLeft = 18;
    const padRight = 18;
    const padTop = 16;
    const padBottom = 26;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const maxVal = Math.max(
      2,
      ...weeklyStats.map((d) => Math.max(d.added, d.completed))
    );

    const addedPoints = weeklyStats.map((d, i) => ({
      x: padLeft + (i / 6) * plotW,
      y: padTop + plotH - (d.added / maxVal) * plotH,
      value: d.added,
      label: d.label,
    }));

    const completedPoints = weeklyStats.map((d, i) => ({
      x: padLeft + (i / 6) * plotW,
      y: padTop + plotH - (d.completed / maxVal) * plotH,
      value: d.completed,
      label: d.label,
    }));

    const addedPath = buildSmoothCurvePath(addedPoints);
    const completedPath = buildSmoothCurvePath(completedPoints);
    const baselineY = padTop + plotH;
    const completedAreaPath =
      completedPoints.length > 0
        ? `${completedPath} L ${completedPoints[completedPoints.length - 1].x.toFixed(1)} ${baselineY.toFixed(1)} L ${completedPoints[0].x.toFixed(1)} ${baselineY.toFixed(1)} Z`
        : '';

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      plotW,
      plotH,
      baselineY,
      addedPoints,
      completedPoints,
      addedPath,
      completedPath,
      completedAreaPath,
    };
  }, [weeklyStats]);

  const handleExportText = () => {
    if (!hasRecords) return;
    exportRecordsAsText(steps, triggers);
    setExportedType('txt');
    window.setTimeout(() => setExportedType(null), 2500);
  };

  const handleExportPdf = () => {
    if (!hasRecords) return;
    exportRecordsAsPdf(steps, triggers);
    setExportedType('pdf');
    window.setTimeout(() => setExportedType(null), 2500);
  };

  const handleConfirmClearCompleted = () => {
    onClearCompletedSteps();
    setConfirmClearOpen(false);
  };

  const submitNewStep = () => {
    const cleaned = newStep.trim();
    if (!cleaned) return;
    onAddStep(cleaned);
    setNewStep('');
  };

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    submitNewStep();
  };

  const submitNewTrigger = () => {
    if (!situation.trim() || !helpfulAction.trim()) return;
    onAddTrigger({
      situation: situation.trim(),
      thought: thought.trim(),
      helpfulAction: helpfulAction.trim(),
    });
    setSituation('');
    setThought('');
    setHelpfulAction('');
  };

  const handleAddTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    submitNewTrigger();
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scroll-pb-20 px-0.5 pb-8 sm:pb-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Editorial Sanctuary Overview Card */}
        <GlassCard as="section" className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-7 flex flex-col justify-center min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
              Stages of change
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2 text-balance">
              Small steps
            </h1>
            <p className="text-sm sm:text-base text-white/85 mt-3 leading-relaxed max-w-[60ch]">
              Write down one practical thing you want to try this week, or spot the moments that pull you toward old habits
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80 tabular-nums">
              <span>{totalSteps} saved steps</span>
              <span aria-hidden="true">·</span>
              <span>{completedCount} completed</span>
              <span aria-hidden="true">·</span>
              <span>{triggers.length} trigger notes</span>
            </div>

            {/* Progress Summary + Weekly Progress Line Graph (Brand Palette Card) */}
            <div className="mt-5 rounded-[20px] bg-[#f6f4f1] border border-[#6994c6]/35 p-4 sm:p-5 text-[#1f3a5f] shadow-sm space-y-4">
              {/* 1. Small Steps: Progress Summary */}
              <div className="space-y-2">
                {progressEncouragement && (
                  <p className="text-xs font-semibold text-[#3d6a9e]">
                    {progressEncouragement}
                  </p>
                )}
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1f3a5f] tabular-nums leading-none">
                    {progressPercent}%
                  </span>
                  <span className="text-sm sm:text-base font-bold text-[#1f3a5f] tabular-nums text-right">
                    {completedCount} of {totalSteps} completed
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`Small steps progress: ${progressPercent}% (${completedCount} of ${totalSteps} completed)`}
                  aria-valuemin={0}
                  aria-valuemax={Math.max(1, totalSteps)}
                  aria-valuenow={completedCount}
                  className="h-1.5 w-full rounded-full bg-[#e3ecf6] overflow-hidden"
                >
                  <div
                    className="h-full rounded-full bg-[#3d6a9e] transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* 2. Weekly Progress Line Graph (Mon–Sun, device-only) */}
              <div className="pt-3 border-t border-[#6994c6]/25">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1f3a5f]">
                    This week (Mon–Sun)
                  </p>
                  {steps.length > 0 && (
                    <div className="flex items-center gap-3 text-[11px] font-medium text-[#1f3a5f]">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="w-2.5 h-2.5 rounded-full bg-[#3d6a9e]"
                        />
                        Completed
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="w-2.5 h-2.5 rounded-full bg-[#6994c6]/60"
                        />
                        Added
                      </span>
                    </div>
                  )}
                </div>

                {steps.length === 0 ? (
                  <div className="rounded-[14px] bg-[#e3ecf6]/70 px-4 py-5 text-center">
                    <p className="text-xs sm:text-sm font-medium text-[#1f3a5f]">
                      Add your first small step to see your week take shape.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[14px] bg-white/85 px-2 pt-2 pb-1">
                    <svg
                      viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                      className="w-full h-auto overflow-visible"
                      role="img"
                      aria-label={`Weekly steps chart from Monday to Sunday: ${weeklyStats
                        .map(
                          (d) =>
                            `${d.label} ${d.completed} completed, ${d.added} added`
                        )
                        .join('; ')}`}
                    >
                      <defs>
                        <linearGradient
                          id={chartGradientId}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#6994c6"
                            stopOpacity="0.28"
                          />
                          <stop
                            offset="100%"
                            stopColor="#e3ecf6"
                            stopOpacity="0.03"
                          />
                        </linearGradient>
                      </defs>

                      {/* Light horizontal gridlines */}
                      {[0, 0.5, 1].map((ratio) => {
                        const y =
                          chartGeometry.padTop +
                          chartGeometry.plotH * (1 - ratio);
                        return (
                          <line
                            key={ratio}
                            x1={chartGeometry.padLeft}
                            y1={y}
                            x2={chartGeometry.width - chartGeometry.padRight}
                            y2={y}
                            stroke="#6994c6"
                            strokeOpacity={ratio === 0 ? 0.32 : 0.18}
                            strokeWidth="1"
                            strokeDasharray={ratio === 0 ? undefined : '3 3'}
                          />
                        );
                      })}

                      {/* Soft area fill under Completed line */}
                      {chartGeometry.completedAreaPath && (
                        <path
                          d={chartGeometry.completedAreaPath}
                          fill={`url(#${chartGradientId})`}
                        />
                      )}

                      {/* Secondary line: Steps added per day */}
                      <path
                        d={chartGeometry.addedPath}
                        fill="none"
                        stroke="#6994c6"
                        strokeOpacity="0.65"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Primary line: Steps completed per day */}
                      <path
                        d={chartGeometry.completedPath}
                        fill="none"
                        stroke="#3d6a9e"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Rounded points for Added */}
                      {chartGeometry.addedPoints.map((pt) => (
                        <circle
                          key={`added-${pt.label}`}
                          cx={pt.x}
                          cy={pt.y}
                          r={pt.value > 0 ? 3 : 2}
                          fill="#ffffff"
                          stroke="#6994c6"
                          strokeOpacity="0.8"
                          strokeWidth="1.75"
                        />
                      ))}

                      {/* Rounded points for Completed */}
                      {chartGeometry.completedPoints.map((pt) => (
                        <circle
                          key={`done-${pt.label}`}
                          cx={pt.x}
                          cy={pt.y}
                          r={pt.value > 0 ? 3.75 : 2.5}
                          fill="#3d6a9e"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      ))}

                      {/* Day labels Mon–Sun */}
                      {weeklyStats.map((d, idx) => {
                        const x =
                          chartGeometry.padLeft +
                          (idx / 6) * chartGeometry.plotW;
                        return (
                          <text
                            key={d.dateKey}
                            x={x}
                            y={chartGeometry.height - 6}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight={d.isToday ? '700' : '500'}
                            fill={d.isToday ? '#1f3a5f' : '#3d6a9e'}
                          >
                            {d.label}
                          </text>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportText}
                disabled={!hasRecords}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-medium rounded-full bg-transparent text-white/85 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {exportedType === 'txt' ? (
                  <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-white/85" aria-hidden="true" />
                )}
                <span>{exportedType === 'txt' ? 'Saved .txt' : 'Export .txt'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!hasRecords}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-medium rounded-full bg-transparent text-white/85 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {exportedType === 'pdf' ? (
                  <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-white/85" aria-hidden="true" />
                )}
                <span>{exportedType === 'pdf' ? 'Saved PDF' : 'Export PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                disabled={completedCount === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-medium rounded-full bg-transparent text-white/85 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-white/85" aria-hidden="true" />
                <span>Clear completed steps</span>
              </button>

              <span className="text-[11px] text-white/80 px-1">
                {hasRecords
                  ? 'Downloaded privately offline'
                  : 'Add a step or note to export'}
              </span>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="h-44 md:h-full min-h-[176px] rounded-[16px] overflow-hidden border border-white/25 bg-white/10">
              {!bannerError ? (
                <img
                  src={SANCTUARY_SPACE_URL}
                  alt="Quiet sunlit South African community support space with wooden table and notebook"
                  referrerPolicy="no-referrer"
                  onError={() => setBannerError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-white/10">
                  <p className="text-base font-semibold text-white">
                    Quiet Space for Reflection
                  </p>
                </div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Section 1: My Small Steps */}
        <GlassCard as="section" aria-labelledby="small-steps-heading" className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
              Action Plan
            </p>
            <h2
              id="small-steps-heading"
              className="text-xl font-bold tracking-tight text-white mt-1"
            >
              My Small Steps
            </h2>
          </div>

          <form onSubmit={handleAddStep} className="flex flex-col sm:flex-row sm:items-start gap-3">
            <label htmlFor="new-small-step" className="sr-only">
              Add a small next step
            </label>
            <AutoGrowInput
              id="new-small-step"
              value={newStep}
              onChange={setNewStep}
              onEnterSubmit={submitNewStep}
              placeholder="e.g., Text my cousin before 5pm when cravings start"
              className="flex-1 min-h-[44px] px-4 py-2.5 text-xs leading-relaxed bg-white/10 border border-white/25 rounded-[16px] text-white placeholder:text-[11.5px] placeholder:text-white/70 focus:bg-white/[0.16] focus:border-white/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newStep.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 min-h-[44px] rounded-full bg-white text-[#3d6a9e] text-sm font-semibold hover:bg-[#f6f4f1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add step</span>
            </button>
          </form>

          {steps.length === 0 ? (
            <div className="pt-4 border-t border-white/15 text-center py-4">
              <p className="text-sm font-semibold text-white">
                No steps saved yet
              </p>
              <p className="text-xs text-white/80 mt-1 max-w-md mx-auto">
                Add one small action above, or click “Save a small step” under any message from Thuso.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/15 border-t border-white/15">
              {steps.map((step) => {
                const isJustCompleted = justCompletedId === step.id && step.completed;
                return (
                  <li
                    key={step.id}
                    className={`py-4 first:pt-4 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-300 ${
                      isJustCompleted ? 'bg-white/10 -mx-2 px-2 rounded-[16px]' : ''
                    }`}
                  >
                    <button
                      type="button"
                      aria-pressed={step.completed}
                      onClick={() => handleStepToggle(step)}
                      className="group flex items-start gap-3 text-left flex-1 min-w-0 min-h-[44px] py-1 cursor-pointer"
                    >
                      <span className="relative shrink-0 mt-0.5 flex items-center justify-center">
                        {isJustCompleted && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 rounded-full border-2 border-white animate-step-ring-ripple pointer-events-none"
                          />
                        )}
                        {step.completed ? (
                          <CheckCircle2
                            className={`w-5 h-5 text-white transition-transform duration-200 ${
                              isJustCompleted ? 'animate-step-check-pop' : ''
                            }`}
                            aria-hidden="true"
                          />
                        ) : (
                          <Circle
                            className="w-5 h-5 text-white/75 group-hover:text-white transition-colors duration-150"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`text-sm leading-snug break-words transition-colors duration-200 ${
                            step.completed
                              ? 'line-through text-white/70'
                              : 'text-white font-medium'
                          }`}
                        >
                          {step.text}
                        </p>
                        <p className="text-xs text-white/80 mt-1 tabular-nums transition-opacity duration-200">
                          {step.completed ? 'Completed' : 'In progress'} · Added {step.createdAt}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {/* 3. Check in with Thuso CTA with inline white 4-point sparkle SVG */}
                      <button
                        type="button"
                        onClick={() => onCheckInWithThuso(step.text)}
                        className="btn-check-thuso inline-flex items-center gap-2 px-4 py-2 min-h-[44px] text-xs font-semibold rounded-full whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="w-3.5 h-3.5 shrink-0 text-white"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M12 2L14.35 9.65L22 12L14.35 14.35L12 22L9.65 14.35L2 12L9.65 9.65L12 2Z" />
                        </svg>
                        <span>Check in with Thuso</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteStep(step.id)}
                        aria-label={`Delete step: ${step.text}`}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-white/80 hover:text-[#FECDD3] hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>

        {/* Section 2: CBT Trigger & Thought Reflection */}
        <GlassCard as="section" aria-labelledby="triggers-heading" className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
              Pause &amp; Reflect
            </p>
            <h2
              id="triggers-heading"
              className="text-xl font-bold tracking-tight text-white mt-1"
            >
              Spotting Triggers &amp; Patterns
            </h2>
            <p className="text-sm text-white/85 mt-0.5">
              When cravings, anger, or peer pressure hit, naming the trigger helps you pause before reacting.
            </p>
          </div>

          <form onSubmit={handleAddTrigger} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-start">
              <div>
                <label
                  htmlFor="trigger-situation"
                  className="block text-xs font-medium text-white mb-1.5"
                >
                  What triggered you?
                </label>
                <AutoGrowInput
                  id="trigger-situation"
                  value={situation}
                  onChange={setSituation}
                  onEnterSubmit={submitNewTrigger}
                  placeholder="e.g., Payday / walking past the corner"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-xs leading-relaxed bg-white/10 border border-white/25 rounded-[16px] text-white placeholder:text-[11.5px] placeholder:text-white/70 focus:bg-white/[0.16] focus:border-white/50 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="trigger-thought"
                  className="block text-xs font-medium text-white mb-1.5"
                >
                  What thought popped up?
                </label>
                <AutoGrowInput
                  id="trigger-thought"
                  value={thought}
                  onChange={setThought}
                  onEnterSubmit={submitNewTrigger}
                  placeholder="e.g., One hit won't hurt / I can't cope"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-xs leading-relaxed bg-white/10 border border-white/25 rounded-[16px] text-white placeholder:text-[11.5px] placeholder:text-white/70 focus:bg-white/[0.16] focus:border-white/50 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="trigger-action"
                  className="block text-xs font-medium text-white mb-1.5"
                >
                  One safer response next time
                </label>
                <AutoGrowInput
                  id="trigger-action"
                  value={helpfulAction}
                  onChange={setHelpfulAction}
                  onEnterSubmit={submitNewTrigger}
                  placeholder="e.g., Walk straight to gogo's house"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-xs leading-relaxed bg-white/10 border border-white/25 rounded-[16px] text-white placeholder:text-[11.5px] placeholder:text-white/70 focus:bg-white/[0.16] focus:border-white/50 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!situation.trim() || !helpfulAction.trim()}
                className="px-5 py-2.5 min-h-[44px] text-sm font-semibold rounded-full bg-[#3d6a9e] text-white border border-[#6994c6] hover:bg-[#325884] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Save reflection
              </button>
            </div>
          </form>

          {/* 5. Triggers presented as clean white cards with #6994c6 border & left accent bar */}
          {triggers.length > 0 && (
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {triggers.map((item) => (
                <article
                  key={item.id}
                  className="bg-white rounded-[20px] border border-[#6994c6]/50 border-l-4 border-l-[#6994c6] shadow-sm p-4 sm:p-5 flex items-start justify-between gap-3 text-[#1f3a5f]"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span
                      aria-hidden="true"
                      className="w-8 h-8 rounded-full bg-[#e3ecf6] text-[#3d6a9e] flex items-center justify-center shrink-0 mt-0.5"
                    >
                      <Compass className="w-4 h-4" />
                    </span>
                    <div className="space-y-1.5 min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#3d6a9e] tabular-nums">
                        Trigger · {item.createdAt}
                      </p>
                      <h3 className="text-sm sm:text-base font-bold text-[#1f3a5f] leading-snug break-words">
                        {item.situation}
                      </h3>
                      {item.thought && (
                        <p className="text-xs text-[#1f3a5f]/85 leading-relaxed break-words">
                          <span className="font-semibold text-[#3d6a9e]">
                            Thought:
                          </span>{' '}
                          “{item.thought}”
                        </p>
                      )}
                      <p className="text-xs text-[#1f3a5f] leading-relaxed break-words">
                        <span className="font-bold text-[#3d6a9e]">
                          Safer move:
                        </span>{' '}
                        {item.helpfulAction}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteTrigger(item.id)}
                    aria-label="Delete trigger note"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#1f3a5f]/70 hover:text-[#9F1239] hover:bg-[#e3ecf6] shrink-0 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Confirmation dialog for clearing all completed steps */}
      {confirmClearOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-completed-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16143a]/75"
          onClick={() => setConfirmClearOpen(false)}
        >
          <GlassCard
            variant="modal"
            className="w-full max-w-md text-white shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                Confirm removal
              </p>
              <h2
                id="clear-completed-title"
                className="text-xl font-bold tracking-tight text-white mt-1"
              >
                Clear completed steps?
              </h2>
              <p className="text-sm text-white/85 mt-2 leading-relaxed">
                This will remove all {completedCount} completed{' '}
                {completedCount === 1 ? 'step' : 'steps'} from your list on this device. Active steps and trigger notes will stay saved.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2.5 min-h-[44px] rounded-full bg-transparent text-sm font-medium text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearCompleted}
                className="px-6 py-2.5 min-h-[44px] rounded-full bg-white text-[#3d6a9e] text-sm font-semibold hover:bg-[#f6f4f1] transition-colors cursor-pointer shadow-sm"
              >
                Clear completed steps
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
