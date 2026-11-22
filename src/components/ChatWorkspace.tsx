import {
  ArrowUp,
  BookmarkPlus,
  Check,
  HeartHandshake,
  Lock,
  Mic,
  MicOff,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { triggerHaptic } from '../utils/haptics.ts';
import { GlassCard } from './GlassCard.tsx';
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

const SPEECH_LOCALE_BY_NOTICE_LANG: Record<NoticeLanguage, string> = {
  en: 'en-ZA',
  zu: 'zu-ZA',
  xh: 'xh-ZA',
  af: 'af-ZA',
  st: 'st-ZA',
};

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

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

  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseInputRef = useRef('');

  const speechSupported = getSpeechRecognitionConstructor() !== null;
  const hasUserMessages = messages.some((m) => m.role === 'user');
  const notice = LAYER1_NOTICE[noticeLang];

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors if already stopped
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!popiaConsent || isStreaming) {
      stopListening();
    }
  }, [popiaConsent, isStreaming, stopListening]);

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

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const toggleVoiceInput = () => {
    if (isStreaming || !popiaConsent) return;

    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRec = getSpeechRecognitionConstructor();
    if (!SpeechRec) {
      setVoiceError(
        'Voice-to-text is not supported in this browser. You can type your message directly.'
      );
      return;
    }

    setVoiceError(null);
    baseInputRef.current = input;

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = SPEECH_LOCALE_BY_NOTICE_LANG[noticeLang] || 'en-ZA';

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let spoken = '';
        for (let i = 0; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result && result[0]?.transcript) {
            spoken += result[0].transcript;
          }
        }
        const cleanedSpoken = spoken.trimStart();
        const base = baseInputRef.current;
        const separator =
          base.length > 0 && !/\s$/.test(base) && cleanedSpoken.length > 0 ? ' ' : '';
        const combined = `${base}${separator}${cleanedSpoken}`.slice(0, 1500);
        setInput(combined);
        window.requestAnimationFrame(resizeTextarea);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError(
            'Microphone access was blocked. Allow microphone permission in your browser or type your message.'
          );
        } else if (event.error === 'audio-capture') {
          setVoiceError('No microphone was found on this device.');
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech was detected. Tap the microphone to try again.');
        } else if (event.error !== 'aborted') {
          setVoiceError('Voice input stopped unexpectedly. You can tap the microphone to try again.');
        }
        recognitionRef.current = null;
        setIsListening(false);
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceError('Could not start voice input right now. Please type your message instead.');
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    stopListening();
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !popiaConsent) return;
    triggerHaptic('light');
    onSendMessage(trimmed);
    setInput('');
    setVoiceError(null);
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
    if (voiceError) setVoiceError(null);
    resizeTextarea();
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
    <div className="flex flex-col flex-1 min-h-0">
      {/* Compact conversation header strip */}
      <GlassCard
        padding="compact"
        className="shrink-0 flex items-center justify-between gap-3 mb-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          {!avatarError ? (
            <img
              src={THUSO_PORTRAIT_URL}
              alt="Thuso, AI community support companion"
              referrerPolicy="no-referrer"
              onError={() => setAvatarError(true)}
              className="w-10 h-10 rounded-full object-cover border border-white/30 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0">
              <HeartHandshake className="w-5 h-5" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight text-white truncate">
              Thuso
            </h1>
            <p className="text-xs text-white/80 truncate">
              AI support companion · Not a licensed therapist or emergency service
            </p>
          </div>
        </div>

        {(hasUserMessages || popiaConsent) && (
          <button
            type="button"
            onClick={onDeleteMyChat}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-medium rounded-full bg-transparent text-white/85 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Delete my chat</span>
          </button>
        )}
      </GlassCard>

      {/* Scrollable Message Thread */}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-pb-20 px-0.5 py-2 sm:py-3">
        <div className="max-w-2xl w-full min-w-0 mx-auto space-y-5 pb-4">
          {/* Layer 1 POPIA Notice before first message */}
          {!popiaConsent && (
            <GlassCard
              as="section"
              aria-labelledby="popia-layer1-heading"
              className="space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-white/15 min-w-0">
                <div className="flex items-start gap-3 min-w-0">
                  <Lock className="w-4 h-4 text-white/85 shrink-0 mt-1" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                      Privacy &amp; Safety
                    </p>
                    <h2
                      id="popia-layer1-heading"
                      className="text-xl font-bold tracking-tight text-white mt-0.5"
                    >
                      {notice.heading}
                    </h2>
                  </div>
                </div>

                {/* Language Switcher for Plain-Language Notice */}
                <div
                  role="tablist"
                  aria-label="Notice language"
                  className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white/10 border border-white/25 rounded-[16px] sm:rounded-full w-full sm:w-auto max-w-full"
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
                        className={`px-3 py-1.5 min-h-[44px] text-xs font-semibold rounded-full transition-colors max-w-full break-words text-center cursor-pointer ${
                          active
                            ? 'bg-white text-[#6D3FE0]'
                            : 'text-white/85 hover:text-white'
                        }`}
                      >
                        {NOTICE_LANGUAGE_LABELS[lang]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 text-sm text-white leading-relaxed">
                <p>{notice.intro}</p>
                <p className="text-white/85">
                  <span className="font-semibold text-white">
                    {notice.whatIUseLabel}
                  </span>{' '}
                  {notice.whatIUseBody}
                </p>
                <p className="text-white/85">
                  <span className="font-semibold text-white">
                    {notice.whyLabel}
                  </span>{' '}
                  {notice.whyBody}
                </p>
                <p className="text-white/85">
                  <span className="font-semibold text-white">
                    {notice.privacyLabel}
                  </span>{' '}
                  {notice.privacyBody}
                </p>
                <p className="text-white/85">
                  <span className="font-semibold text-white">
                    {notice.choiceLabel}
                  </span>{' '}
                  {notice.choiceBody}
                </p>
                <p className="text-xs font-semibold text-[#FECDD3] pt-1">
                  {notice.emergencyLine}
                </p>
              </div>

              {/* Voluntary & Specific Unticked Consent Checkboxes */}
              <div className="pt-4 border-t border-white/15 space-y-2.5">
                <label className="flex items-start gap-3 py-1.5 min-h-[44px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ageChecked}
                    onChange={(e) => setAgeChecked(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-white/40 accent-[#6D3FE0] shrink-0 cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-white leading-snug">
                    {notice.ageCheckbox}
                  </span>
                </label>

                <div className="flex items-start gap-3">
                  <label className="flex items-start gap-3 py-1.5 min-h-[44px] cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={privacyChecked}
                      onChange={(e) => setPrivacyChecked(e.target.checked)}
                      className="mt-0.5 w-5 h-5 rounded border-white/40 accent-[#6D3FE0] shrink-0 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm text-white leading-snug">
                      {notice.consentCheckbox}{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setLearnMoreOpen(true);
                        }}
                        className="text-white font-semibold underline hover:text-white/80 cursor-pointer"
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
                    className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] rounded-full bg-white text-[#6D3FE0] text-sm font-semibold hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
                  >
                    {notice.startButton}
                  </button>
                </div>
              </div>
            </GlassCard>
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
                            className="w-8 h-8 rounded-full object-cover border border-white/30"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white">
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
                            ? 'px-5 py-3.5 rounded-[24px] rounded-bl-md bg-white/[0.15] border border-white/25 text-white text-[15px] sm:text-base leading-[1.65] whitespace-pre-wrap'
                            : 'px-5 py-3.5 rounded-[24px] rounded-br-md bg-white/[0.09] border border-white/20 text-white text-[15px] sm:text-base leading-[1.6] whitespace-pre-wrap'
                        }
                      >
                        {msg.text ? (
                          msg.text
                        ) : isStreaming && index === messages.length - 1 ? (
                          <span
                            className="inline-flex items-center gap-1.5 py-1"
                            aria-label="Thuso is typing"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" />
                          </span>
                        ) : (
                          ''
                        )}
                      </div>

                      {isModel && msg.piiNotice && (
                        <p className="mt-1.5 text-xs text-white/80">
                          Note: Personal details (like an ID or phone number) were masked for your privacy before processing.
                        </p>
                      )}

                      <div
                        className={`mt-1.5 flex items-center gap-3 text-xs text-white/80 ${
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
                                <span className="inline-flex items-center gap-1 text-white font-medium">
                                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                  Saved to Small Steps
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openStepSaver(msg)}
                                  className="inline-flex items-center gap-1 text-white/80 hover:text-white hover:underline transition-colors cursor-pointer py-1"
                                >
                                  <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Save a small step</span>
                                </button>
                              )}
                            </>
                          )}
                      </div>

                      {isSavingThis && (
                        <GlassCard padding="compact" className="mt-2 space-y-3">
                          <label
                            htmlFor={`step-input-${msg.id}`}
                            className="block text-xs font-medium text-white"
                          >
                            Edit your small next step before saving:
                          </label>
                          <input
                            id={`step-input-${msg.id}`}
                            type="text"
                            value={stepDraftText}
                            onChange={(e) => setStepDraftText(e.target.value)}
                            className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white/10 border border-white/25 rounded-[16px] text-white placeholder:text-white/60 focus:bg-white/15 focus:border-white/50 focus:outline-none"
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setStepDraftId(null)}
                              className="px-4 py-2 min-h-[44px] text-xs font-medium text-white/85 hover:text-white rounded-full cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmSaveStep(msg.id)}
                              className="px-5 py-2 min-h-[44px] text-xs font-semibold bg-white text-[#6D3FE0] rounded-full hover:bg-white/90 cursor-pointer"
                            >
                              Save step
                            </button>
                          </div>
                        </GlassCard>
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 mb-2">
                Where to begin
              </p>
              <p className="text-xs text-white/85 mb-3">
                Not sure where to start? Pick something close to what you are carrying, or write in your own words:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CONVERSATION_STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    disabled={isStreaming}
                    onClick={() => onSendMessage(starter)}
                    className="glass text-left p-4 hover:bg-white/[0.22] disabled:opacity-40 disabled:cursor-not-allowed text-xs text-white leading-relaxed transition-colors cursor-pointer h-auto min-h-[44px] overflow-visible"
                  >
                    “{starter}”
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-3">
              <GlassCard
                padding="compact"
                variant="alert"
                role="alert"
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-white"
              >
                <span>{error}</span>
                {onRetryLastMessage && (
                  <button
                    type="button"
                    onClick={onRetryLastMessage}
                    disabled={isStreaming}
                    className="px-5 py-2 min-h-[44px] rounded-full bg-white text-xs font-semibold text-[#9F1239] hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Try again
                  </button>
                )}
              </GlassCard>
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
      <GlassCard padding="compact" className="shrink-0 mt-2 mb-3 sm:mb-0">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          {popiaConsent && isStreaming && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 px-1 pb-2 text-xs text-white/85"
            >
              <span className="inline-flex items-center gap-1" aria-hidden="true">
                <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 rounded-full bg-white animate-bounce" />
              </span>
              <span className="italic">Thuso is typing...</span>
            </div>
          )}
          {popiaConsent && isListening && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-between gap-2 px-1 pb-2 text-xs text-white"
            >
              <span>Listening… speak freely, tap the microphone again to stop.</span>
            </div>
          )}
          {popiaConsent && voiceError && !isListening && (
            <div
              role="status"
              aria-live="polite"
              className="px-1 pb-2 text-xs text-[#FECDD3]"
            >
              {voiceError}
            </div>
          )}
          <div
            data-tour="chat-input"
            className={`flex items-end gap-2 p-2 rounded-[16px] border bg-white/10 transition-colors ${
              popiaConsent
                ? 'border-white/25 focus-within:bg-white/[0.16] focus-within:border-white/50'
                : 'border-white/15 opacity-60'
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
              className="flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] text-white placeholder:text-white/65 focus:outline-none max-h-40 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={isStreaming || !popiaConsent}
              aria-label={
                isListening
                  ? 'Stop voice input'
                  : speechSupported
                    ? 'Speak your message'
                    : 'Voice input unavailable in this browser'
              }
              aria-pressed={isListening}
              title={
                isListening
                  ? 'Stop listening'
                  : speechSupported
                    ? 'Speak your message'
                    : 'Voice input not supported in this browser'
              }
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-white/25 text-white border border-white/50'
                  : 'bg-transparent text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Mic className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isStreaming || !popiaConsent}
              aria-label="Send message"
              className="min-h-[44px] min-w-[44px] px-5 rounded-full bg-white text-[#6D3FE0] text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer shadow-sm"
            >
              <span>Send</span>
              <ArrowUp className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <p
            data-tour="privacy-line"
            className="mt-2.5 text-[11px] text-white/80 text-center"
          >
            Thuso is an AI support companion · Not saved on our servers ·{' '}
            <button
              type="button"
              onClick={() => setLearnMoreOpen(true)}
              className="underline text-white hover:text-white/80 py-1 cursor-pointer"
            >
              Privacy notice
            </button>
            {' · '}
            <button
              type="button"
              onClick={onStartTour}
              className="underline text-white hover:text-white/80 py-1 cursor-pointer"
            >
              Take a quick tour
            </button>
          </p>
        </form>
      </GlassCard>

      <PrivacyNoticeModal
        isOpen={learnMoreOpen}
        onClose={() => setLearnMoreOpen(false)}
      />
    </div>
  );
}
