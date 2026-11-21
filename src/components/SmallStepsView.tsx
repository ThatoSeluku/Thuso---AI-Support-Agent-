import {
  Check,
  CheckCircle2,
  Circle,
  FileDown,
  FileText,
  MessageSquare,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SANCTUARY_SPACE_URL } from '../data/uiContent.ts';
import { SmallStep, TriggerNote } from '../types.ts';
import {
  exportRecordsAsPdf,
  exportRecordsAsText,
} from '../utils/exportRecords.ts';

interface SmallStepsViewProps {
  steps: SmallStep[];
  triggers: TriggerNote[];
  onAddStep: (text: string) => void;
  onToggleStep: (id: string) => void;
  onDeleteStep: (id: string) => void;
  onCheckInWithThuso: (stepText: string) => void;
  onAddTrigger: (note: Omit<TriggerNote, 'id' | 'createdAt'>) => void;
  onDeleteTrigger: (id: string) => void;
}

export function SmallStepsView({
  steps,
  triggers,
  onAddStep,
  onToggleStep,
  onDeleteStep,
  onCheckInWithThuso,
  onAddTrigger,
  onDeleteTrigger,
}: SmallStepsViewProps) {
  const [newStep, setNewStep] = useState('');
  const [situation, setSituation] = useState('');
  const [thought, setThought] = useState('');
  const [helpfulAction, setHelpfulAction] = useState('');
  const [bannerError, setBannerError] = useState(false);
  const [exportedType, setExportedType] = useState<'txt' | 'pdf' | null>(null);
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
  const completedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (completedTimerRef.current !== null) {
        window.clearTimeout(completedTimerRef.current);
      }
    };
  }, []);

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
        ? 'Ready when you are — every small step counts'
        : completedCount === totalSteps
          ? `All ${totalSteps} ${totalSteps === 1 ? 'step' : 'steps'} completed — well done`
          : 'Keep going — one step at a time';

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

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newStep.trim();
    if (!cleaned) return;
    onAddStep(cleaned);
    setNewStep('');
  };

  const handleAddTrigger = (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#182d4a] px-4 sm:px-8 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Editorial Sanctuary Header */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch pb-8 border-b border-[#dce3ec] dark:border-[#2d4b73]">
          <div className="md:col-span-7 flex flex-col justify-center">
            <p className="text-xs font-medium text-[#4a6280] dark:text-[#c5d3e6]">
              Stages of change · One day at a time
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1f3a5f] dark:text-[#f6f4f1] mt-2 text-balance">
              Small, realistic steps toward safety and change
            </h1>
            <p className="text-sm sm:text-base text-[#4a6280] dark:text-[#c5d3e6] mt-3 leading-relaxed max-w-[60ch]">
              Real change rarely happens overnight. Write down one practical thing you want to try this week, or spot the moments that pull you toward old habits. Everything here stays private on your device.
            </p>
            <div className="mt-4 flex items-center gap-4 text-xs text-[#4a6280] dark:text-[#c5d3e6] tabular-nums">
              <span>{steps.length} saved steps</span>
              <span aria-hidden="true">·</span>
              <span>{completedCount} completed</span>
              <span aria-hidden="true">·</span>
              <span>{triggers.length} trigger notes</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportText}
                disabled={!hasRecords}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium rounded-lg border border-[#dce3ec] dark:border-[#2d4b73] bg-[#f6f4f1] dark:bg-[#12233b] text-[#1f3a5f] dark:text-[#f6f4f1] hover:border-[#6994c6] hover:bg-[#e3ecf6] dark:hover:bg-[#213f66] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {exportedType === 'txt' ? (
                  <Check className="w-3.5 h-3.5 text-[#3d6a9e] dark:text-[#8eb4e0]" aria-hidden="true" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-[#3d6a9e] dark:text-[#8eb4e0]" aria-hidden="true" />
                )}
                <span>{exportedType === 'txt' ? 'Saved .txt' : 'Export .txt'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!hasRecords}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium rounded-lg border border-[#dce3ec] dark:border-[#2d4b73] bg-[#f6f4f1] dark:bg-[#12233b] text-[#1f3a5f] dark:text-[#f6f4f1] hover:border-[#6994c6] hover:bg-[#e3ecf6] dark:hover:bg-[#213f66] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {exportedType === 'pdf' ? (
                  <Check className="w-3.5 h-3.5 text-[#3d6a9e] dark:text-[#8eb4e0]" aria-hidden="true" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-[#3d6a9e] dark:text-[#8eb4e0]" aria-hidden="true" />
                )}
                <span>{exportedType === 'pdf' ? 'Saved PDF' : 'Export PDF'}</span>
              </button>

              <span className="text-[11px] text-[#4a6280] dark:text-[#c5d3e6]">
                {hasRecords
                  ? 'Downloaded privately offline'
                  : 'Add a step or note to export'}
              </span>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="h-48 md:h-full min-h-[190px] rounded-xl overflow-hidden border border-[#dce3ec] dark:border-[#2d4b73] bg-[#e3ecf6] dark:bg-[#213f66]">
              {!bannerError ? (
                <img
                  src={SANCTUARY_SPACE_URL}
                  alt="Quiet sunlit South African community support space with wooden table and notebook"
                  referrerPolicy="no-referrer"
                  onError={() => setBannerError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#e3ecf6] dark:bg-[#213f66]">
                  <p className="font-serif text-base font-medium text-[#1f3a5f] dark:text-[#f6f4f1]">
                    Quiet Space for Reflection
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 1: My Small Steps */}
        <section aria-labelledby="small-steps-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2
                id="small-steps-heading"
                className="font-serif text-xl font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]"
              >
                My Small Steps
              </h2>
              <p className="text-sm text-[#4a6280] dark:text-[#c5d3e6] mt-0.5">
                Keep steps tiny and doable for today or this week.
              </p>
            </div>
          </div>

          {/* Visual Step Progress Bar */}
          <div className="p-4 rounded-xl bg-[#f6f4f1] dark:bg-[#12233b] border border-[#dce3ec] dark:border-[#2d4b73] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-medium text-[#1f3a5f] dark:text-[#f6f4f1]">
                {progressEncouragement}
              </span>
              <span className="text-xs font-semibold text-[#3d6a9e] dark:text-[#8eb4e0] tabular-nums">
                {completedCount} of {totalSteps} completed ({progressPercent}%)
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`Small steps progress: ${completedCount} of ${totalSteps} completed`}
              aria-valuemin={0}
              aria-valuemax={totalSteps}
              aria-valuenow={completedCount}
              className="h-2.5 w-full rounded-full bg-[#e3ecf6] dark:bg-[#213f66] overflow-hidden"
            >
              <div
                className="h-full rounded-full bg-[#3d6a9e] dark:bg-[#6994c6] transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleAddStep} className="flex flex-col sm:flex-row gap-2">
            <label htmlFor="new-small-step" className="sr-only">
              Add a small next step
            </label>
            <input
              id="new-small-step"
              type="text"
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              placeholder="e.g., Text my cousin before 5pm when cravings start"
              className="flex-1 min-h-[44px] px-3.5 py-2 text-sm bg-[#f6f4f1] dark:bg-[#12233b] border border-[#c5d1e0] dark:border-[#2d4b73] rounded-lg text-[#1f3a5f] dark:text-[#f6f4f1] placeholder:text-[#5c728f] dark:placeholder:text-[#9cb1cc] focus:bg-white dark:focus:bg-[#162944] focus:border-[#3d6a9e] dark:focus:border-[#8eb4e0] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newStep.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 min-h-[44px] rounded-lg bg-[#3d6a9e] text-white text-sm font-medium hover:bg-[#2f5582] dark:bg-[#6994c6] dark:text-[#0f1f36] dark:hover:bg-[#7da6d4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add step</span>
            </button>
          </form>

          {steps.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#f6f4f1] dark:bg-[#12233b] border border-[#dce3ec] dark:border-[#2d4b73] text-center">
              <p className="text-sm font-medium text-[#1f3a5f] dark:text-[#f6f4f1]">
                No steps saved yet
              </p>
              <p className="text-xs text-[#4a6280] dark:text-[#c5d3e6] mt-1 max-w-md mx-auto">
                Add one small action above, or click “Save a small step” under any message from Thuso.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#dce3ec] dark:divide-[#2d4b73] border border-[#dce3ec] dark:border-[#2d4b73] rounded-xl bg-white dark:bg-[#12233b]">
              {steps.map((step) => {
                const isJustCompleted = justCompletedId === step.id && step.completed;
                return (
                  <li
                    key={step.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-300 ${
                      isJustCompleted
                        ? 'bg-[#e3ecf6]/60 dark:bg-[#213f66]/65'
                        : 'bg-transparent'
                    }`}
                  >
                    <button
                      type="button"
                      aria-pressed={step.completed}
                      onClick={() => handleStepToggle(step)}
                      className="group flex items-start gap-3 text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <span className="relative shrink-0 mt-0.5 flex items-center justify-center">
                        {isJustCompleted && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 rounded-full border-2 border-[#3d6a9e] dark:border-[#8eb4e0] animate-step-ring-ripple pointer-events-none"
                          />
                        )}
                        {step.completed ? (
                          <CheckCircle2
                            className={`w-5 h-5 text-[#3d6a9e] dark:text-[#8eb4e0] transition-transform duration-200 ${
                              isJustCompleted ? 'animate-step-check-pop' : ''
                            }`}
                            aria-hidden="true"
                          />
                        ) : (
                          <Circle
                            className="w-5 h-5 text-[#4a6280] dark:text-[#c5d3e6] group-hover:text-[#3d6a9e] dark:group-hover:text-[#8eb4e0] transition-colors duration-150"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`text-sm leading-snug transition-colors duration-200 ${
                            step.completed
                              ? 'line-through text-[#4a6280] dark:text-[#9cb1cc]'
                              : 'text-[#1f3a5f] dark:text-[#f6f4f1] font-medium'
                          }`}
                        >
                          {step.text}
                        </p>
                        <p className="text-xs text-[#4a6280] dark:text-[#c5d3e6] mt-1 tabular-nums transition-opacity duration-200">
                          {step.completed ? 'Completed' : 'In progress'} · Added {step.createdAt}
                        </p>
                      </div>
                    </button>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onCheckInWithThuso(step.text)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium rounded-lg border border-[#dce3ec] dark:border-[#2d4b73] bg-[#f6f4f1] dark:bg-[#182d4a] text-[#1f3a5f] dark:text-[#f6f4f1] hover:border-[#6994c6] hover:bg-[#e3ecf6] dark:hover:bg-[#213f66] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#3d6a9e] dark:text-[#8eb4e0]" aria-hidden="true" />
                      <span>Check in with Thuso</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteStep(step.id)}
                      aria-label={`Delete step: ${step.text}`}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#4a6280] dark:text-[#c5d3e6] hover:text-[#B42318] hover:bg-[#FEF3F2] dark:hover:text-[#FDA29B] dark:hover:bg-[#331618] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Section 2: CBT Trigger & Thought Reflection */}
        <section
          aria-labelledby="triggers-heading"
          className="pt-6 border-t border-[#dce3ec] dark:border-[#2d4b73] space-y-4"
        >
          <div>
            <h2
              id="triggers-heading"
              className="font-serif text-xl font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]"
            >
              Spotting Triggers & Patterns
            </h2>
            <p className="text-sm text-[#4a6280] dark:text-[#c5d3e6] mt-0.5">
              When cravings, anger, or peer pressure hit, naming the trigger helps you pause before reacting.
            </p>
          </div>

          <form
            onSubmit={handleAddTrigger}
            className="p-5 rounded-xl bg-[#f6f4f1] dark:bg-[#12233b] border border-[#dce3ec] dark:border-[#2d4b73] space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="trigger-situation"
                  className="block text-xs font-medium text-[#1f3a5f] dark:text-[#f6f4f1] mb-1"
                >
                  What triggered you?
                </label>
                <input
                  id="trigger-situation"
                  type="text"
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="e.g., Payday / walking past the corner"
                  className="w-full min-h-[44px] px-3 py-2 text-sm bg-white dark:bg-[#182d4a] border border-[#c5d1e0] dark:border-[#2d4b73] rounded-lg text-[#1f3a5f] dark:text-[#f6f4f1] placeholder:text-[#5c728f] dark:placeholder:text-[#9cb1cc] focus:border-[#3d6a9e] dark:focus:border-[#8eb4e0] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="trigger-thought"
                  className="block text-xs font-medium text-[#1f3a5f] dark:text-[#f6f4f1] mb-1"
                >
                  What thought popped up?
                </label>
                <input
                  id="trigger-thought"
                  type="text"
                  value={thought}
                  onChange={(e) => setThought(e.target.value)}
                  placeholder="e.g., One hit won't hurt / I can't cope"
                  className="w-full min-h-[44px] px-3 py-2 text-sm bg-white dark:bg-[#182d4a] border border-[#c5d1e0] dark:border-[#2d4b73] rounded-lg text-[#1f3a5f] dark:text-[#f6f4f1] placeholder:text-[#5c728f] dark:placeholder:text-[#9cb1cc] focus:border-[#3d6a9e] dark:focus:border-[#8eb4e0] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="trigger-action"
                  className="block text-xs font-medium text-[#1f3a5f] dark:text-[#f6f4f1] mb-1"
                >
                  One safer response next time
                </label>
                <input
                  id="trigger-action"
                  type="text"
                  value={helpfulAction}
                  onChange={(e) => setHelpfulAction(e.target.value)}
                  placeholder="e.g., Walk straight to gogo's house"
                  className="w-full min-h-[44px] px-3 py-2 text-sm bg-white dark:bg-[#182d4a] border border-[#c5d1e0] dark:border-[#2d4b73] rounded-lg text-[#1f3a5f] dark:text-[#f6f4f1] placeholder:text-[#5c728f] dark:placeholder:text-[#9cb1cc] focus:border-[#3d6a9e] dark:focus:border-[#8eb4e0] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!situation.trim() || !helpfulAction.trim()}
                className="px-4 py-2 min-h-[44px] text-sm font-medium rounded-lg bg-[#3d6a9e] text-white hover:bg-[#2f5582] dark:bg-[#6994c6] dark:text-[#0f1f36] dark:hover:bg-[#7da6d4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Save reflection
              </button>
            </div>
          </form>

          {triggers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {triggers.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#12233b] border border-[#dce3ec] dark:border-[#2d4b73] flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-[#4a6280] dark:text-[#c5d3e6] tabular-nums">
                        Trigger · {item.createdAt}
                      </p>
                      <button
                        type="button"
                        onClick={() => onDeleteTrigger(item.id)}
                        aria-label="Delete trigger note"
                        className="p-1 text-[#4a6280] dark:text-[#c5d3e6] hover:text-[#B42318] dark:hover:text-[#FDA29B] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]">
                      {item.situation}
                    </p>
                    {item.thought && (
                      <p className="text-xs text-[#4a6280] dark:text-[#c5d3e6]">
                        Thought: “{item.thought}”
                      </p>
                    )}
                    <p className="text-xs text-[#3d6a9e] dark:text-[#8eb4e0] font-medium">
                      Safer move: {item.helpfulAction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
