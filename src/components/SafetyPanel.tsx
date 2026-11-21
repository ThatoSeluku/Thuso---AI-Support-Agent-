import { PhoneCall, ShieldAlert } from 'lucide-react';
import { SupportResource } from '../types.ts';

interface SafetyPanelProps {
  contacts: SupportResource[];
}

export function SafetyPanel({ contacts }: SafetyPanelProps) {
  return (
    <div
      role="region"
      aria-label="Immediate safety contacts"
      className="mt-3 p-4 rounded-xl bg-[#FEF7F7] dark:bg-[#331618] border border-[#F3C5C5] dark:border-[#7A271A]"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert
          className="w-5 h-5 text-[#B42318] dark:text-[#FDA29B] shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#7A1A14] dark:text-[#FDA29B]">
            Your safety matters right now
          </p>
          <p className="text-xs text-[#5B3A38] dark:text-[#f6f4f1] mt-1 leading-relaxed">
            If you are in danger or thinking of hurting yourself, please reach out to someone who can help immediately. These South African lines are free and confidential:
          </p>

          {contacts.length > 0 ? (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {contacts.map((contact) => (
                <a
                  key={contact.id}
                  href={contact.telHref}
                  className="flex items-center justify-between gap-2 px-3 py-2 min-h-[44px] rounded-lg bg-white dark:bg-[#182d4a] border border-[#F3C5C5] dark:border-[#7A271A] hover:border-[#B42318] dark:hover:border-[#FDA29B] transition-colors"
                >
                  <span className="text-xs font-medium text-[#1f3a5f] dark:text-[#f6f4f1] truncate">
                    {contact.name}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold tabular-nums text-[#B42318] dark:text-[#FDA29B] shrink-0">
                    <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                    {contact.phone}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[#7A1A14] dark:text-[#FDA29B]">
              Please open Urgent Help at the top of the screen for verified emergency numbers.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
