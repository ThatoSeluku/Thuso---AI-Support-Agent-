import { Moon, PhoneCall, Sun } from 'lucide-react';
import { AppView } from '../types.ts';

interface TopBarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  onOpenUrgentHelp: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const NAV_ITEMS: Array<{ id: AppView; label: string }> = [
  { id: 'chat', label: 'Talk to Thuso' },
  { id: 'steps', label: 'Small Steps' },
  { id: 'selfcare', label: 'Self-Care' },
  { id: 'support', label: 'Local Support' },
];

export function TopBar({
  activeView,
  onSelectView,
  onOpenUrgentHelp,
  isDark,
  onToggleTheme,
}: TopBarProps) {
  return (
    <header className="shrink-0 bg-white dark:bg-[#182d4a] border-b border-[#dce3ec] dark:border-[#2d4b73] z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand wordmark (single text element, no descriptor or badge) */}
        <button
          type="button"
          onClick={() => onSelectView('chat')}
          className="font-serif text-xl font-semibold tracking-tight text-[#1f3a5f] dark:text-[#f6f4f1] whitespace-nowrap shrink-0 cursor-pointer hover:text-[#3d6a9e] dark:hover:text-[#8eb4e0] transition-colors min-h-[40px] flex items-center"
        >
          Thuso
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-8 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            const tourAttr =
              item.id === 'steps'
                ? 'small-steps-tab'
                : item.id === 'selfcare'
                  ? 'self-care-target'
                  : undefined;
            return (
              <button
                key={item.id}
                type="button"
                data-tour={tourAttr}
                onClick={() => onSelectView(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors min-h-[40px] flex items-center ${
                  isActive
                    ? 'text-[#1f3a5f] dark:text-[#f6f4f1] font-semibold'
                    : 'text-[#4a6280] hover:text-[#1f3a5f] dark:text-[#c5d3e6] dark:hover:text-[#f6f4f1]'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3d6a9e] dark:bg-[#8eb4e0]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Theme toggle + primary Urgent help CTA */}
        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            title={isDark ? 'Light mode' : 'Dark mode'}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-[#dce3ec] dark:border-[#2d4b73] bg-[#f6f4f1] dark:bg-[#12233b] text-[#1f3a5f] dark:text-[#f6f4f1] hover:bg-[#e3ecf6] dark:hover:bg-[#213f66] transition-colors shrink-0 cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            data-tour="urgent-help-btn"
            onClick={onOpenUrgentHelp}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] text-sm font-semibold rounded-lg bg-[#3d6a9e] text-white hover:bg-[#2f5582] dark:bg-[#6994c6] dark:text-[#0f1f36] dark:hover:bg-[#7da6d4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PhoneCall className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Urgent help</span>
          </button>
        </div>
      </div>
    </header>
  );
}
