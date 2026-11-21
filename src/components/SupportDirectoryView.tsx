import { Check, Copy, MessageSquare, PhoneCall, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SupportCategory, SupportResource } from '../types.ts';

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
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#182d4a] px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="pb-6 border-b border-[#dce3ec] dark:border-[#2d4b73]">
          <p className="text-xs font-medium text-[#4a6280] dark:text-[#c5d3e6]">
            South Africa · Verified public & NGO support
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1f3a5f] dark:text-[#f6f4f1] mt-2 text-balance">
            Real local support and helplines
          </h1>
          <p className="text-sm sm:text-base text-[#4a6280] dark:text-[#c5d3e6] mt-2 max-w-[65ch] leading-relaxed">
            You do not have to carry this alone. These South African services offer free or low-cost counselling, rehab referrals, legal advice, and emergency protection.
          </p>
        </header>

        {/* Search and Interactive Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-[#4a6280] dark:text-[#c5d3e6] absolute left-3.5 top-1/2 -translate-y-1/2"
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
              className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-[#f6f4f1] dark:bg-[#12233b] border border-[#c5d1e0] dark:border-[#2d4b73] rounded-lg text-[#1f3a5f] dark:text-[#f6f4f1] placeholder:text-[#5c728f] dark:placeholder:text-[#9cb1cc] focus:bg-white dark:focus:bg-[#162944] focus:border-[#3d6a9e] dark:focus:border-[#8eb4e0] focus:outline-none"
            />
          </div>

          <div
            role="tablist"
            aria-label="Filter support by category"
            className="flex items-center gap-1 p-1 bg-[#f6f4f1] dark:bg-[#12233b] border border-[#dce3ec] dark:border-[#2d4b73] rounded-lg overflow-x-auto"
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
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#e3ecf6] dark:bg-[#213f66] text-[#1f3a5f] dark:text-[#f6f4f1] font-semibold'
                      : 'text-[#4a6280] dark:text-[#c5d3e6] hover:text-[#1f3a5f] dark:hover:text-[#f6f4f1]'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading, Error, Empty, or Populated Directory List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-44 rounded-xl bg-[#f6f4f1] dark:bg-[#12233b] border border-[#dce3ec] dark:border-[#2d4b73]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 rounded-xl bg-[#FEF7F7] dark:bg-[#331618] border border-[#F3C5C5] dark:border-[#7A271A] text-center">
            <p className="text-sm font-medium text-[#7A1A14] dark:text-[#FDA29B]">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 px-4 py-2 min-h-[40px] text-xs font-medium rounded-lg border border-[#F3C5C5] dark:border-[#7A271A] bg-white dark:bg-[#182d4a] text-[#7A1A14] dark:text-[#FDA29B] hover:bg-[#FEF3F2] dark:hover:bg-[#461d20] cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#f6f4f1] dark:bg-[#12233b] border border-[#dce3ec] dark:border-[#2d4b73] text-center">
            <p className="text-sm font-medium text-[#1f3a5f] dark:text-[#f6f4f1]">
              No matching services found
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="mt-3 px-4 py-2 min-h-[40px] text-xs font-medium rounded-lg border border-[#c5d1e0] dark:border-[#2d4b73] bg-white dark:bg-[#182d4a] text-[#1f3a5f] dark:text-[#f6f4f1] hover:bg-[#e3ecf6] dark:hover:bg-[#213f66] cursor-pointer"
            >
              Show all services
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="p-5 rounded-xl bg-white dark:bg-[#12233b] border border-[#dce3ec] dark:border-[#2d4b73] flex flex-col justify-between gap-4"
              >
                <div>
                  <p className="text-xs text-[#4a6280] dark:text-[#c5d3e6]">
                    {item.category} · {item.hours} · {item.cost}
                  </p>
                  <h2 className="font-serif text-lg font-semibold text-[#1f3a5f] dark:text-[#f6f4f1] mt-1">
                    {item.name}
                  </h2>
                  <p className="text-sm text-[#4a6280] dark:text-[#c5d3e6] mt-2 leading-relaxed">
                    {item.description}
                  </p>
                  <p className="text-xs text-[#1f3a5f] dark:text-[#f6f4f1] mt-2.5">
                    <span className="font-medium">Who it helps:</span> {item.whoItHelps}
                  </p>
                  {item.secondaryContact && (
                    <p className="text-xs text-[#4a6280] dark:text-[#c5d3e6] mt-1 font-mono tabular-nums">
                      Alt: {item.secondaryContact}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#dce3ec] dark:border-[#2d4b73] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <a
                      href={item.telHref}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-mono font-semibold tabular-nums transition-colors whitespace-nowrap ${
                        item.urgent
                          ? 'bg-[#3d6a9e] text-white hover:bg-[#2f5582] dark:bg-[#6994c6] dark:text-[#0f1f36] dark:hover:bg-[#7da6d4]'
                          : 'bg-[#e3ecf6] dark:bg-[#213f66] text-[#1f3a5f] dark:text-[#f6f4f1] hover:bg-[#d3e1f2] dark:hover:bg-[#2c5182]'
                      }`}
                    >
                      <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{item.phone}</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.phone)}
                      aria-label={`Copy phone number ${item.phone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-2 min-h-[40px] rounded-lg border border-[#dce3ec] dark:border-[#2d4b73] text-xs text-[#4a6280] dark:text-[#c5d3e6] hover:text-[#1f3a5f] dark:hover:text-[#f6f4f1] hover:bg-[#e3ecf6] dark:hover:bg-[#213f66] transition-colors cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#3d6a9e] dark:text-[#8eb4e0]" aria-hidden="true" />
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-[#3d6a9e] dark:text-[#8eb4e0] hover:bg-[#e3ecf6] dark:hover:bg-[#213f66] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Help me reach out</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
