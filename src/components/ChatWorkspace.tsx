import {
  ArrowUp,
  BookmarkPlus,
  Check,
  HeartHandshake,
  Lock,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  LAYER1_NOTICE,
  NOTICE_LANGUAGE_LABELS,
  NoticeLanguage,
} from '../data/privacyNotice.ts';
import {
  CONVERSATION_STARTERS,
  THUSO_PORTRAIT_URL,
} from '../data/uiContent.ts';
import { ChatMessage, SupportResource } from '../types.ts';
import { PrivacyNoticeModal } from './PrivacyNoticeModal.tsx';
import { SafetyPanel } from './SafetyPanel.tsx';

interface ChatWorkspaceProps {
  messages: ChatMessage[];
  urgentResources: SupportResource[];
  popiaConsent: boolean;
  onAcceptPopia: () => void;
  isStreaming: boolean;
  error: string | null;
  onSendMessage: (text: string) => void;
  onRetryLastMessage?: () => void;
  onDeleteMyChat: () => void;
  onSaveStep: (text: string, sourceNote?: string) => void;
  savedStepNotes: Set<string>;
  onStartTour: () => void;
}

const LANGUAGES: NoticeLanguage[] = ['en', 'zu', 'xh', 'af', 'st'];

const FALLBACK_ERROR_HELPLINES: SupportResource[] = [
  {
    id: 'saps-10111',
    name: 'SAPS Emergency (Police)',
    category: 'GBV & Safety',
    phone: '10111',
    telHref: 'tel:10111',
    hours: '24/7',
    cost: 'Free from any landline or cellphone',
    description: 'Immediate police response for life-threatening emergencies.',
    whoItHelps: 'Anyone in immediate physical danger.',
    urgent: true,
  },
  {
    id: 'gbv-command-centre',
    name: 'GBV Command Centre',
    category: 'GBV & Safety',
    phone: '0800 428 428',
    telHref: 'tel:0800428428',
    hours: '24/7',
    cost: 'Free (toll-free)',
    description: '24-hour support and social workers for gender-based violence.',
    whoItHelps: 'Anyone experiencing abuse or unsafe at home.',
    urgent: true,
  },
  {
    id: 'sadag-suicide',
    name: 'SADAG Suicide Crisis Helpline',
    category: 'Crisis & Suicide',
    phone: '0800 567 567',
    telHref: 'tel:0800567567',
    hours: '24/7',
    cost: 'Free (toll-free)',
    description: 'Immediate crisis counselling for suicidal thoughts or distress.',
    whoItHelps: 'Anyone in severe emotional distress or thinking of self-harm.',
    urgent: true,
  },
];

export function ChatWorkspace({
  messages,
  urgentResources,
  popiaConsent,
  onAcceptPopia,
  isStreaming,
  error,
  onSendMessage,
  onRetryLastMessage,
  onDeleteMyChat,
  onSaveStep,
  savedStepNotes,
  onStartTour,
}: ChatWorkspaceProps) {
  const [input, setInput] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const [stepDraftId, setStepDraftId] = useState<string | null>(null);
  const [stepDraftText, setStepDraftText] = useState('');

  // POPIA Layer 1 state: both checkboxes explicitly unticked by default
  const [noticeLang, setNoticeLang] = useState<NoticeLanguage>('en');
  const [ageChecked, setAgeChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const hasUserMessages = messages.some((m) => m.role === 'user');
  const notice = LAYER1_NOTICE[noticeLang];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  // Reset unticked checkboxes whenever user deletes chat & returns to notice
  useEffect(() => {
    if (!popiaConsent) {
      setAgeChecked(false);
      setPrivacyChecked(false);
    }
  }, [popiaConsent]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !popiaConsent) return;
    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const openStepSaver = (msg: ChatMessage) => {
    setStepDraftId(msg.id);
    const sentences = msg.text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const suggestion = sentences[sentences.length - 1] || msg.text;
    setStepDraftText(suggestion.slice(0, 180));
  };

  const confirmSaveStep = (msgId: string) => {
    const cleaned = stepDraftText.trim();
    if (!cleaned) return;
    onSaveStep(cleaned, msgId);
    setStepDraftId(null);
    setStepDraftText('');
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-[#182d4a]">
      {/* Compact conversation header strip */}
      <div className="shrink-0 border-b border-[#dce3ec] dark:border-[#2d4b73] px-4 sm:px-6 py-3 flex items-center justify-between gap-4 bg-white dark:bg-[#182d4a]">
        <div className="flex items-center gap-3 min-w-0">
          {!avatarError ? (
            <img
              src={THUSO_PORTRAIT_URL}
              alt="Thuso, AI community support companion"
              referrerPolicy="no-referrer"
              onError={() => setAvatarError(true)}
              className="w-10 h-10 rounded-full object-cover border border-[#dce3ec] dark:border-[#2d4b73] shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#e3ecf6] dark:bg-[#213f66] border border-[#dce3ec] dark:border-[#2d4b73] flex items-center justify-center text-[#3d6a9e] dark:text-[#8eb4e0] shrink-0">
              <HeartHandshake className="w-5 h-5" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-serif text-base font-semibold text-[#1f3a5f] dark:text-[#f6f4f1] truncate">
              Thuso
            </h1>
            <p className="text-xs text-[#4a6280] dark:text-[#c5d3e6] truncate">
              AI support companion · Not a licensed therapist or emergency service
            </p>
          </div>
        </div>

        {(hasUserMessages || popiaConsent) && (
          <button
            type="button"
            onClick={onDeleteMyChat}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium rounded-lg border border-[#dce3ec] dark:border-[#2d4b73] bg-white dark:bg-[#12233b] text-[#4a6280] dark:text-[#c5d3e6] hover:text-[#B42318] hover:border-[#F3C5C5] hover:bg-[#FEF7F7] dark:hover:text-[#FDA29B] dark:hover:border-[#7A271A] dark:hover:bg-[#331618] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Delete my chat</span>
          </button>
        )}
      </div>

      {/* Scrollable Message Thread */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 bg-white dark:bg-[#182d4a]">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Layer 1 POPIA Notice before first message */}
          {!popiaConsent && (
            <section
              aria-labelledby="popia-layer1-heading"
              className="p-5 sm:p-6 rounded-xl bg-[#f6f4f1] dark:bg-[#12233b] border border-[#dce3ec] dark:border-[#2d4b73] space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dce3ec] dark:border-[#2d4b73]">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-[#3d6a9e] dark:text-[#8eb4e0] shrink-0" aria-hidden="true" />
                  <h2
                    id="popia-layer1-heading"
                    className="font-serif text-lg font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]"
                  >
                    {notice.heading}
                  </h2>
                </div>

                {/* Language Switcher for Plain-Language Notice */}
                <div
                  role="tablist"
                  aria-label="Notice language"
                  className="flex items-center gap-1 p-1 bg-[#e3ecf6] dark:bg-[#182d4a] rounded-lg overflow-x-auto"
                >
                  {LANGUAGES.map((lang) => {
                    const active = noticeLang === lang;
                    return (
                      <button
                        key={lang}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setNoticeLang(lang)}
                        className={`px-2.5 py-1 min-h-[32px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-white dark:bg-[#213f66] text-[#1f3a5f] dark:text-[#f6f4f1] border border-[#dce3ec] dark:border-[#3c5e8a]'
                            : 'text-[#4a6280] dark:text-[#c5d3e6] hover:text-[#1f3a5f] dark:hover:text-[#f6f4f1]'
                        }`}
                      >
                        {NOTICE_LANGUAGE_LABELS[lang]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5 text-sm text-[#1f3a5f] dark:text-[#f6f4f1] leading-relaxed">
                <p>{notice.intro}</p>
                <p className="text-[#4a6280] dark:text-[#c5d3e6]">
                  <span className="font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]">
                    {notice.whatIUseLabel}
                  </span>{' '}
                  {notice.whatIUseBody}
                </p>
                <p className="text-[#4a6280] dark:text-[#c5d3e6]">
                  <span className="font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]">
                    {notice.whyLabel}
                  </span>{' '}
                  {notice.whyBody}
                </p>
                <p className="text-[#4a6280] dark:text-[#c5d3e6]">
                  <span className="font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]">
                    {notice.privacyLabel}
                  </span>{' '}
                  {notice.privacyBody}
                </p>
                <p className="text-[#4a6280] dark:text-[#c5d3e6]">
                  <span className="font-semibold text-[#1f3a5f] dark:text-[#f6f4f1]">
                    {notice.choiceLabel}
                  </span>{' '}
                  {notice.choiceBody}
                </p>
                <p className="text-xs font-medium text-[#7A1A14] dark:text-[#FDA29B] pt-1">
                  {notice.emergencyLine}
                </p>
              </div>

              {/* Voluntary & Specific Unticked Consent Checkboxes */}
              <div className="pt-3 border-t border-[#dce3ec] dark:border-[#2d4b73] space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ageChecked}
                    onChange={(e) => setAgeChecked(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-[#c5d1e0] dark:border-[#4b6f9c] text-[#3d6a9e] accent-[#3d6a9e] dark:accent-[#6994c6] shrink-0 cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-[#1f3a5f] dark:text-[#f6f4f1] leading-snug">
                    {notice.ageCheckbox}
                  </span>
                </label>

                <div className="flex items-start gap-3">
                  <label className="flex items-start gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={privacyChecked}
                      onChange={(e) => setPrivacyChecked(e.target.checked)}
                      className="mt-0.5 w-5 h-5 rounded border-[#c5d1e0] dark:border-[#4b6f9c] text-[#3d6a9e] accent-[#3d6a9e] dark:accent-[#6994c6] shrink-0 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm text-[#1f3a5f] dark:text-[#f6f4f1] leading-snug">
                      {notice.consentCheckbox}{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setLearnMoreOpen(true);
                        }}
                        className="text-[#3d6a9e] dark:text-[#8eb4e0] font-semibold underline hover:text-[#2f5582] dark:hover:text-[#b4cff0] cursor-pointer"
                      >
                        {notice.learnMore}
                      </button>
                    </span>
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={!ageChecked || !privacyChecked}
                    onClick={onAcceptPopia}
                    className="px-5 py-2.5 min-h-[44px] rounded-lg bg-[#3d6a9e] text-white text-sm font-medium hover:bg-[#2f5582] dark:bg-[#6994c6] dark:text-[#0f1f36] dark:hover:bg-[#7da6d4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {notice.startButton}
                  </button>
                </div>
              </div>
            </section>
          )}

          {popiaConsent &&
            messages.map((msg, index) => {
              const isModel = msg.role === 'model';
              const isAlreadySaved = savedStepNotes.has(msg.id);
              const isSavingThis = stepDraftId === msg.id;
              const contactsForPanel =
                msg.urgentContacts && msg.urgentContacts.length > 0
                  ? msg.urgentContacts
                  : urgentResources;

              return (
                <div key={msg.id} className="space-y-2">
                  <div
                    className={`flex gap-3 ${
                      isModel ? 'items-start' : 'justify-end'
                    }`}
                  >
                    {isModel && (
                      <div className="shrink-0 mt-0.5">
                        {!avatarError ? (
                          <img
                            src={THUSO_PORTRAIT_URL}
                            alt="Thuso"
                            referrerPolicy="no-referrer"
                            onError={() => setAvatarError(true)}
                            className="w-8 h-8 rounded-full object-cover border border-[#dce3ec] dark:border-[#2d4b73]"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#e3ecf6] dark:bg-[#213f66] border border-[#dce3ec] dark:border-[#2d4b73] flex items-center justify-center text-[#3d6a9e] dark:text-[#8eb4e0]">
                            <HeartHandshake className="w-4 h-4" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`min-w-0 ${
                        isModel ? 'flex-1 max-w-[65ch]' : 'max-w-[85%] sm:max-w-[75%]'
                      }`}
                    >
                      <div
                        className={
                          isModel
                            ? 'px-4 py-3 rounded-2xl rounded-bl-sm bg-[#e3ecf6] dark:bg-[#213f66] text-[#1f3a5f] dark:text-[#f6f4f1] text-[15px] sm:text-base leading-[1.65] whitespace-pre-wrap'
                            : 'px-4 py-3 rounded-2xl rounded-br-sm bg-[#f6f4f1] dark:bg-[#12233b] border border-[#ddd8d0] dark:border-[#2d4b73] text-[#1f3a5f] dark:text-[#f6f4f1] text-[15px] sm:text-base leading-[1.6] whitespace-pre-wrap'
                        }
                      >
                        {msg.text ? (
                          msg.text
                        ) : isStreaming && index === messages.length - 1 ? (
                          <span
                            className="inline-flex items-center gap-1.5 py-1"
                            aria-label="Thuso is typing"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3d6a9e] dark:bg-[#8eb4e0] animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3d6a9e] dark:bg-[#8eb4e0] animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3d6a9e] dark:bg-[#8eb4e0] animate-bounce" />
                          </span>
                        ) : (
                          ''
                        )}
                      </div>

                      {isModel && msg.piiNotice && (
                        <p className="mt-1.5 text-xs text-[#4a6280] dark:text-[#c5d3e6]">
                          Note: Personal details (like an ID or phone number) were masked for your privacy before processing.
                        </p>
                      )}

                      <div
                        className={`mt-1.5 flex items-center gap-3 text-xs text-[#4a6280] dark:text-[#c5d3e6] ${
                          isModel ? 'justify-start' : 'justify-end'
                        }`}
                      >
                        <span className="tabular-nums">{msg.timestamp}</span>
                        {isModel &&
                          index > 0 &&
                          msg.text.trim().length > 0 &&
                          !isStreaming && (
                            <>
                              <span aria-hidden="true">·</span>
                              {isAlreadySaved ? (
                                <span className="inline-flex items-center gap-1 text-[#3d6a9e] dark:text-[#8eb4e0] font-medium">
                                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                  Saved to Small Steps
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openStepSaver(msg)}
                                  className="inline-flex items-center gap-1 text-[#4a6280] dark:text-[#c5d3e6] hover:text-[#3d6a9e] dark:hover:text-[#8eb4e0] transition-colors cursor-pointer py-1"
                                >
                                  <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Save a small step</span>
                                </button>
                              )}
                            </>
                          )}
                      </div>

                      {isSavingThis && (
                        <div className="mt-2 p-3 rounded-xl bg-[#f6f4f1] dark:bg-[#12233b] border border-[#dce3ec] dark:border-[#2d4b73] space-y-2">
                          <label
                            htmlFor={`step-input-${msg.id}`}
                            className="block text-xs font-medium text-[#1f3a5f] dark:text-[#f6f4f1]"
                          >
                            Edit your small next step before saving:
                          </label>
                          <input
                            id={`step-input-${msg.id}`}
                            type="text"
                            value={stepDraftText}
                            onChange={(e) => setStepDraftText(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-[#182d4a] border border-[#c5d1e0] dark:border-[#2d4b73] rounded-lg text-[#1f3a5f] dark:text-[#f6f4f1]"
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setStepDraftId(null)}
                              className="px-3 py-1.5 min-h-[36px] text-xs font-medium text-[#4a6280] dark:text-[#c5d3e6] hover:text-[#1f3a5f] dark:hover:text-[#f6f4f1] rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmSaveStep(msg.id)}
                              className="px-3 py-1.5 min-h-[36px] text-xs font-medium bg-[#3d6a9e] text-white rounded-lg hover:bg-[#2f5582] dark:bg-[#6994c6] dark:text-[#0f1f36] dark:hover:bg-[#7da6d4] cursor-pointer"
                            >
                              Save step
                            </button>
                          </div>
                        </div>
                      )}

                      {isModel && msg.safetyAlert && (
                        <SafetyPanel contacts={contactsForPanel} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Starter Prompts shown cleanly after POPIA consent before user begins */}
          {popiaConsent && !hasUserMessages && !isStreaming && (
            <div className="pt-2">
              <p className="text-xs font-medium text-[#4a6280] dark:text-[#c5d3e6] mb-3">
                Not sure where to start? Pick something close to what you are carrying, or write in your own words:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CONVERSATION_STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    disabled={isStreaming}
                    onClick={() => onSendMessage(starter)}
                    className="text-left p-3.5 rounded-xl bg-[#f6f4f1] dark:bg-[#12233b] border border-[#dce3ec] dark:border-[#2d4b73] hover:border-[#6994c6] hover:bg-[#e3ecf6] dark:hover:bg-[#213f66] disabled:opacity-40 disabled:cursor-not-allowed text-sm text-[#1f3a5f] dark:text-[#f6f4f1] leading-snug transition-colors cursor-pointer min-h-[48px]"
                  >
                    “{starter}”
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-3">
              <div
                role="alert"
                className="p-4 rounded-xl bg-[#FEF7F7] dark:bg-[#331618] border border-[#F3C5C5] dark:border-[#7A271A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-[#7A1A14] dark:text-[#FDA29B]"
              >
                <span>{error}</span>
                {onRetryLastMessage && (
                  <button
                    type="button"
                    onClick={onRetryLastMessage}
                    disabled={isStreaming}
                    className="px-4 py-2 min-h-[40px] rounded-lg bg-white dark:bg-[#182d4a] border border-[#F3C5C5] dark:border-[#7A271A] text-xs font-medium text-[#7A1A14] dark:text-[#FDA29B] hover:bg-[#FEF3F2] dark:hover:bg-[#461d20] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Try again
                  </button>
                )}
              </div>
              <SafetyPanel
                contacts={
                  urgentResources.length > 0
                    ? urgentResources
                    : FALLBACK_ERROR_HELPLINES
                }
              />
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Bottom Composer */}
      <div className="shrink-0 border-t border-[#dce3ec] dark:border-[#2d4b73] bg-white dark:bg-[#182d4a] px-4 sm:px-6 py-3">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          {popiaConsent && isStreaming && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 px-1 pb-2 text-xs text-[#4a6280] dark:text-[#c5d3e6]"
            >
              <span className="inline-flex items-center gap-1" aria-hidden="true">
                <span className="w-1 h-1 rounded-full bg-[#3d6a9e] dark:bg-[#8eb4e0] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 rounded-full bg-[#3d6a9e] dark:bg-[#8eb4e0] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 rounded-full bg-[#3d6a9e] dark:bg-[#8eb4e0] animate-bounce" />
              </span>
              <span className="italic">Thuso is typing...</span>
            </div>
          )}
          <div
            data-tour="chat-input"
            className={`flex items-end gap-2 p-2 rounded-xl border bg-[#f6f4f1] dark:bg-[#12233b] transition-colors ${
              popiaConsent
                ? 'border-[#c5d1e0] dark:border-[#2d4b73] focus-within:bg-white dark:focus-within:bg-[#162944] focus-within:border-[#3d6a9e] dark:focus-within:border-[#8eb4e0]'
                : 'border-[#dce3ec] dark:border-[#2d4b73] opacity-70'
            }`}
          >
            <label htmlFor="thuso-message-input" className="sr-only">
              Write what is on your mind
            </label>
            <textarea
              ref={textareaRef}
              id="thuso-message-input"
              rows={1}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                popiaConsent
                  ? 'Write what is on your mind (please avoid real names, IDs, or addresses)...'
                  : 'Tick both boxes above and click Start chatting to begin...'
              }
              disabled={isStreaming || !popiaConsent}
              maxLength={1500}
              className="flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-[#1f3a5f] dark:text-[#f6f4f1] placeholder:text-[#5c728f] dark:placeholder:text-[#9cb1cc] focus:outline-none max-h-40 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming || !popiaConsent}
              aria-label="Send message"
              className="min-h-[44px] min-w-[44px] px-4 rounded-lg bg-[#3d6a9e] text-white text-sm font-medium inline-flex items-center justify-center gap-1.5 hover:bg-[#2f5582] dark:bg-[#6994c6] dark:text-[#0f1f36] dark:hover:bg-[#7da6d4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
            >
              <span>Send</span>
              <ArrowUp className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <p
            data-tour="privacy-line"
            className="mt-2 text-[11px] text-[#4a6280] dark:text-[#c5d3e6] text-center"
          >
            Thuso is an AI support companion · Not saved on our servers ·{' '}
            <button
              type="button"
              onClick={() => setLearnMoreOpen(true)}
              className="underline text-[#3d6a9e] hover:text-[#2f5582] dark:text-[#8eb4e0] dark:hover:text-[#b4cff0] py-1 cursor-pointer"
            >
              Privacy notice
            </button>
            {' · '}
            <button
              type="button"
              onClick={onStartTour}
              className="underline text-[#3d6a9e] hover:text-[#2f5582] dark:text-[#8eb4e0] dark:hover:text-[#b4cff0] py-1 cursor-pointer"
            >
              Take a quick tour
            </button>
          </p>
        </form>
      </div>

      <PrivacyNoticeModal
        isOpen={learnMoreOpen}
        onClose={() => setLearnMoreOpen(false)}
      />
    </div>
  );
}
