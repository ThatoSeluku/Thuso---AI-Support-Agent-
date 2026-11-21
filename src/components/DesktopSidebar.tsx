import { ArrowRight, CheckCircle2, Circle, PhoneCall } from 'lucide-react';
import { useState } from 'react';
import { AppView, SmallStep, SupportResource } from '../types.ts';

const LEFT_PANEL_IMAGE_URL =
  'https://images.pexels.com/photos/5699454/pexels-photo-5699454.jpeg';

interface DesktopSidebarProps {
  steps: SmallStep[];
  urgentResources: SupportResource[];
  resourcesLoading: boolean;
  onToggleStep: (id: string) => void;
  onNavigate: (view: AppView) => void;
  onStartTour: () => void;
}

export function DesktopSidebar({
  steps,
  urgentResources,
  resourcesLoading,
  onToggleStep,
  onNavigate,
  onStartTour,
}: DesktopSidebarProps) {
  const [imgError, setImgError] = useState(false);
  const pendingSteps = steps.filter((s) => !s.completed).slice(0, 3);

  return (
    <aside className="hidden lg:flex lg:flex-col w-80 shrink-0 border-r border-[#dce3ec] dark:border-[#2d4b73] bg-[#f6f4f1] dark:bg-[#12233b] overflow-y-auto">
      {/* Grounded Counselor Intro */}
      <div className="p-5 border-b border-[#dce3ec] dark:border-[#2d4b73]">
        <div className="aspect-square w-full rounded-xl overflow-hidden border border-[#dce3ec] dark:border-[#2d4b73] bg-[#e3ecf6] dark:bg-[#213f66]">
          {!imgError ? (
            <img
              src={LEFT_PANEL_IMAGE_URL}
              alt="A calm, supportive conversation"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#e3ecf6] dark:bg-[#213f66]">
              <span className="font-serif text-lg font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]">
                Thuso
              </span>
              <span className="text-xs text-[#4a6280] dark:text-[#c5d3e6] mt-1">
                Community Support Space
              </span>
            </div>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-[#4a6280] dark:text-[#c5d3e6]">
          Photo: Alex Green / Pexels
        </p>
        <p className="mt-3 text-sm text-[#1f3a5f] dark:text-[#f6f4f1] font-medium leading-snug">
          “Umntu ngumntu ngabantu”
        </p>
        <p className="mt-1 text-xs text-[#4a6280] dark:text-[#c5d3e6] leading-relaxed">
          Thuso is an AI support guide, not a licensed therapist or doctor. Take things one honest conversation and one small step at a time.
        </p>
      </div>

      {/* Saved Small Steps Quick Tracker */}
      <div className="p-5 border-b border-[#dce3ec] dark:border-[#2d4b73]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-semibold text-[#1f3a5f] dark:text-[#f6f4f1] tracking-wide">
            My Small Steps
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('steps')}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#3d6a9e] hover:text-[#2f5582] dark:text-[#8eb4e0] dark:hover:text-[#b4cff0] hover:underline cursor-pointer whitespace-nowrap"
          >
            <span>Open all</span>
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>

        {pendingSteps.length === 0 ? (
          <p className="text-xs text-[#4a6280] dark:text-[#c5d3e6] leading-relaxed">
            No active steps saved yet. Save a suggestion from your chat or add one in Small Steps.
          </p>
        ) : (
          <ul className="space-y-2">
            {pendingSteps.map((step) => (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => onToggleStep(step.id)}
                  className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg bg-white dark:bg-[#182d4a] border border-[#dce3ec] dark:border-[#2d4b73] hover:border-[#6994c6] hover:bg-[#e3ecf6]/40 dark:hover:bg-[#213f66] transition-colors cursor-pointer"
                >
                  {step.completed ? (
                    <CheckCircle2
                      className="w-4 h-4 text-[#3d6a9e] dark:text-[#8eb4e0] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="w-4 h-4 text-[#4a6280] dark:text-[#c5d3e6] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  )}
                  <span className="text-xs text-[#1f3a5f] dark:text-[#f6f4f1] leading-snug line-clamp-2">
                    {step.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick South African Helplines (loaded from server) */}
      <div className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-semibold text-[#1f3a5f] dark:text-[#f6f4f1] tracking-wide">
            Free 24/7 SA Helplines
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('support')}
            className="text-xs font-medium text-[#3d6a9e] hover:text-[#2f5582] dark:text-[#8eb4e0] dark:hover:text-[#b4cff0] hover:underline cursor-pointer whitespace-nowrap"
          >
            Full list
          </button>
        </div>
        {resourcesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-9 rounded-lg bg-[#e3ecf6]/60 dark:bg-[#182d4a] border border-[#dce3ec] dark:border-[#2d4b73]"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {urgentResources.map((item) => (
              <a
                key={item.id}
                href={item.telHref}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white dark:bg-[#182d4a] border border-[#dce3ec] dark:border-[#2d4b73] hover:border-[#6994c6] hover:bg-[#e3ecf6]/40 dark:hover:bg-[#213f66] transition-colors"
              >
                <span className="text-xs text-[#1f3a5f] dark:text-[#f6f4f1] truncate">{item.name}</span>
                <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold tabular-nums text-[#3d6a9e] dark:text-[#8eb4e0] shrink-0">
                  <PhoneCall className="w-3 h-3" aria-hidden="true" />
                  {item.phone}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto px-5 py-3 border-t border-[#dce3ec] dark:border-[#2d4b73]">
        <button
          type="button"
          onClick={onStartTour}
          className="text-xs font-medium text-[#3d6a9e] hover:text-[#2f5582] dark:text-[#8eb4e0] dark:hover:text-[#b4cff0] hover:underline py-1 cursor-pointer"
        >
          Take a quick tour
        </button>
      </div>
    </aside>
  );
}
