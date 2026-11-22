import { PhoneCall, ShieldAlert } from 'lucide-react';
import { SupportResource } from '../types.ts';
import { GlassCard } from './GlassCard.tsx';

interface SafetyPanelProps {
  contacts: SupportResource[];
}

export function SafetyPanel({ contacts }: SafetyPanelProps) {
  return (
    <GlassCard
      as="div"
      padding="compact"
      variant="alert"
      role="region"
      aria-label="Immediate safety contacts"
      className="mt-3 text-white"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert
          className="w-5 h-5 text-[#FECDD3] shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FECDD3]">
            Immediate safety
          </p>
          <p className="text-sm font-bold text-white mt-1">
            Your safety matters right now
          </p>
          <p className="text-xs text-white/80 mt-1 leading-relaxed">
            If you are in danger or thinking of hurting yourself, please reach out to someone who can help immediately. These South African lines are free and confidential:
          </p>

          {contacts.length > 0 ? (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {contacts.map((contact) => (
                <a
                  key={contact.id}
                  href={contact.telHref}
                  className="flex items-center justify-between gap-2 px-4 py-2.5 min-h-[44px] rounded-full bg-white text-[#9F1239] hover:bg-white/90 transition-colors shadow-sm"
                >
                  <span className="text-xs font-semibold truncate">
                    {contact.name}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold tabular-nums shrink-0">
                    <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                    {contact.phone}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[#FECDD3]">
              Please open Urgent Help at the top of the screen for verified emergency numbers.
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
