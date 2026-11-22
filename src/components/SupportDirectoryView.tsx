import { Check, Copy, MessageSquare, PhoneCall, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SupportCategory, SupportResource } from '../types.ts';
import { GlassCard } from './GlassCard.tsx';

interface SupportDirectoryViewProps {
  resources: SupportResource[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAskThuso: (prompt: string) => void;
}

const CATEGORIES: SupportCategory[] = [
  'All',
  'Crisis & Suicide',
  'Substance Use',
  'GBV & Safety',
  'Youth & Family',
  'Legal & Advice',
];

export function SupportDirectoryView({
  resources,
  loading,
  error,
  onRetry,
  onAskThuso,
}: SupportDirectoryViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<SupportCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return resources.filter((item) => {
      const matchesCat =
        selectedCategory === 'All' || item.category === selectedCategory;
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.whoItHelps.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [resources, selectedCategory, searchQuery]);

  const handleCopy = async (id: string, phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard may be unavailable in restricted contexts; tel: link remains active
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scroll-pb-20 px-0.5 pb-8 sm:pb-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <GlassCard as="section" className="space-y-4">
          <header>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
              South Africa · Verified public &amp; NGO support
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2 text-balance">
              Real local support and helplines
            </h1>
            <p className="text-sm sm:text-base text-white/85 mt-2 max-w-[65ch] leading-relaxed">
              You do not have to carry this alone. These South African services offer free or low-cost counselling, rehab referrals, legal advice, and emergency protection.
            </p>
          </header>

          {/* Search and Interactive Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-white/15">
            <div className="relative flex-1 max-w-md min-w-0">
              <Search
                className="w-4 h-4 text-white/75 absolute left-3.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <label htmlFor="support-search" className="sr-only">
                Search local support services
              </label>
              <input
                id="support-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by topic (e.g. nyaope, teen, court, abuse)"
                className="w-full min-h-[44px] pl-10 pr-4 py-2 text-xs bg-white/10 border border-white/25 rounded-[16px] text-white placeholder:text-[11.5px] placeholder:text-white/70 focus:bg-white/[0.16] focus:border-white/50 focus:outline-none"
              />
            </div>

            <div
              role="tablist"
              aria-label="Filter support by category"
              className="flex flex-wrap items-center gap-1 p-1.5 bg-white/10 border border-white/25 rounded-[16px] sm:rounded-full w-full lg:w-auto max-w-full"
            >
              {CATEGORIES.map((category) => {
                const isActive = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1.5 min-h-[44px] text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#6D3FE0]'
                        : 'text-white/85 hover:text-white'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </GlassCard>

        {/* Loading, Error, Empty, or Populated Directory List */}
        {loading ? (
          <GlassCard padding="none" className="divide-y divide-white/15">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="p-5 sm:p-6 space-y-3">
                <div className="h-3 w-36 rounded bg-white/15" />
                <div className="h-5 w-60 rounded bg-white/20" />
                <div className="h-4 w-full rounded bg-white/10" />
              </div>
            ))}
          </GlassCard>
        ) : error ? (
          <GlassCard variant="alert" className="text-center py-6">
            <p className="text-sm font-medium">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 px-5 py-2.5 min-h-[44px] text-xs font-semibold rounded-full bg-white text-[#9F1239] hover:bg-white/90 cursor-pointer"
            >
              Try again
            </button>
          </GlassCard>
        ) : filtered.length === 0 ? (
          <GlassCard className="text-center py-8">
            <p className="text-sm font-semibold text-white">
              No matching services found
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="mt-3 px-5 py-2.5 min-h-[44px] text-xs font-semibold rounded-full border border-white/30 bg-white/15 text-white hover:bg-white/25 cursor-pointer"
            >
              Show all services
            </button>
          </GlassCard>
        ) : (
          <GlassCard padding="none" className="divide-y divide-white/15">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="p-5 sm:p-6 flex flex-col gap-4"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 break-words">
                    {item.category} · {item.hours} · {item.cost}
                  </p>
                  <h2 className="text-lg font-bold tracking-tight text-white mt-1.5 break-words">
                    {item.name}
                  </h2>
                  <p className="text-sm text-white/85 mt-2 leading-relaxed break-words">
                    {item.description}
                  </p>
                  <p className="text-xs text-white mt-2.5 break-words">
                    <span className="font-semibold">Who it helps:</span>{' '}
                    <span className="text-white/85">{item.whoItHelps}</span>
                  </p>
                  {item.secondaryContact && (
                    <p className="text-xs text-white/80 mt-1 font-mono tabular-nums break-words">
                      Alt: {item.secondaryContact}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <a
                      href={item.telHref}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-full text-xs font-mono font-bold tabular-nums border border-white/35 bg-white/20 text-white hover:bg-white/30 transition-colors whitespace-nowrap"
                    >
                      <PhoneCall className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Call {item.phone}</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.phone)}
                      aria-label={`Copy phone number ${item.phone}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-full bg-transparent text-xs font-medium text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onAskThuso(
                        `I'm nervous about calling ${item.name} (${item.phone}). Can you help me know what to say or expect?`
                      )
                    }
                    className="inline-flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 min-h-[44px] text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-full transition-colors whitespace-nowrap cursor-pointer self-start sm:self-auto"
                  >
                    <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Help me reach out</span>
                  </button>
                </div>
              </article>
            ))}
          </GlassCard>
        )}
      </div>
    </div>
  );
}
