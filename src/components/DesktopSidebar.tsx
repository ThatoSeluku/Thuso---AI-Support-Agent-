import { ArrowRight, CheckCircle2, Circle, PhoneCall } from 'lucide-react';
import { useState } from 'react';
import { AppView, SmallStep, SupportResource } from '../types.ts';
import { GlassCard } from './GlassCard.tsx';

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
    <GlassCard
      as="aside"
      padding="none"
      className="hidden lg:flex lg:flex-col w-80 shrink-0 overflow-y-auto"
    >
      {/* Grounded Counselor Intro */}
      <div className="p-6 border-b border-white/15">
        <div className="aspect-square w-full rounded-[16px] overflow-hidden border border-white/20 bg-white/10">
          {!imgError ? (
            <img
              src={LEFT_PANEL_IMAGE_URL}
              alt="A calm, supportive conversation"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-white/10">
              <span className="text-lg font-bold text-white">Thuso</span>
              <span className="text-xs text-white/70 mt-1">
                Community Support Space
              </span>
            </div>
          )}
        </div>
        <p className="mt-2 text-[11px] text-white/70">
          Photo: Alex Green / Pexels
        </p>
        <p className="mt-3 text-sm text-white font-semibold leading-snug">
          “Umntu ngumntu ngabantu”
        </p>
        <p className="mt-1.5 text-xs text-white/70 leading-relaxed">
          Thuso is an AI support guide, not a licensed therapist or doctor. Take things one honest conversation and one small step at a time.
        </p>
      </div>

      {/* Saved Small Steps Quick Tracker */}
      <div className="p-6 border-b border-white/15">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            My Small Steps
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('steps')}
            className="inline-flex items-center gap-1 text-xs font-medium text-white/85 hover:text-white hover:underline cursor-pointer whitespace-nowrap"
          >
            <span>Open all</span>
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>

        {pendingSteps.length === 0 ? (
          <p className="text-xs text-white/70 leading-relaxed">
            No active steps saved yet. Save a suggestion from your chat or add one in Small Steps.
          </p>
        ) : (
          <ul className="space-y-2">
            {pendingSteps.map((step) => (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => onToggleStep(step.id)}
                  className="w-full text-left flex items-start gap-2.5 p-3 rounded-[16px] bg-white/10 border border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
                >
                  {step.completed ? (
                    <CheckCircle2
                      className="w-4 h-4 text-white shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="w-4 h-4 text-white/70 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  )}
                  <span className="text-xs text-white leading-snug line-clamp-2">
                    {step.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick South African Helplines (loaded from server) */}
      <div className="p-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            Free 24/7 SA Helplines
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('support')}
            className="text-xs font-medium text-white/85 hover:text-white hover:underline cursor-pointer whitespace-nowrap"
          >
            Full list
          </button>
        </div>
        {resourcesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-10 rounded-[16px] bg-white/10 border border-white/15"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {urgentResources.map((item) => (
              <a
                key={item.id}
                href={item.telHref}
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-[16px] bg-white/10 border border-white/20 hover:bg-white/15 transition-colors"
              >
                <span className="text-xs text-white truncate">{item.name}</span>
                <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold tabular-nums text-white shrink-0">
                  <PhoneCall className="w-3 h-3" aria-hidden="true" />
                  {item.phone}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto px-6 py-4 border-t border-white/15">
        <button
          type="button"
          onClick={onStartTour}
          className="text-xs font-medium text-white/85 hover:text-white hover:underline py-1 cursor-pointer"
        >
          Take a quick tour
        </button>
      </div>
    </GlassCard>
  );
}
