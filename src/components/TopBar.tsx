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
    <header className="shrink-0 z-30 border-b border-white/15 glass-bar pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectView('chat')}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer hover:text-white/85 transition-colors min-h-[44px] flex items-center rounded-full"
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
                className={`relative py-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors min-h-[44px] flex items-center ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1 left-0 right-0 h-0.5 rounded-full bg-white"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Secondary dimness toggle + primary Urgent help white pill CTA */}
        <div className="shrink-0 flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to bright sky' : 'Switch to deeper night sky'}
            aria-pressed={isDark}
            title={isDark ? 'Brighter sky' : 'Deeper night sky'}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-transparent text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
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
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-semibold rounded-full bg-white text-[#6D3FE0] hover:bg-white/90 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
          >
            <PhoneCall className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Urgent help</span>
          </button>
        </div>
      </div>
    </header>
  );
}
