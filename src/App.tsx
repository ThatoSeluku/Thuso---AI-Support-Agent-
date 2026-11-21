import {
  Footprints,
  HeartHandshake,
  MessageCircle,
  ShieldAlert,
  Wind,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatWorkspace } from './components/ChatWorkspace.tsx';
import { CoachMarksTour } from './components/CoachMarksTour.tsx';
import { DesktopSidebar } from './components/DesktopSidebar.tsx';
import { SelfCareView } from './components/SelfCareView.tsx';
import { SmallStepsView } from './components/SmallStepsView.tsx';
import { SupportDirectoryView } from './components/SupportDirectoryView.tsx';
import { TopBar } from './components/TopBar.tsx';
import { UrgentHelpModal } from './components/UrgentHelpModal.tsx';
import { THUSO_OPENING_MESSAGE } from './data/uiContent.ts';
import {
  AppView,
  ChatMessage,
  SmallStep,
  SupportResource,
  TriggerNote,
} from './types.ts';

const STORAGE_KEYS = {
  steps: 'thuso_small_steps_v1',
  triggers: 'thuso_triggers_v1',
  theme: 'thuso_theme_v2',
  tourSeen: 'tour_seen',
};

const LEGACY_KEYS_TO_SCRUB = ['thuso_messages_v1', 'thuso_popia_consent_v1'];

const MAX_CLIENT_HISTORY_MESSAGES = 10;
const MAX_CLIENT_RETRIES = 2;
const RETRY_DELAY_MS = 3000;
const FALLBACK_CHAT_ERROR_MESSAGE =
  "I couldn't reply just now. If you're in danger, call SAPS 10111, the GBV Command Centre 0800 428 428, or SADAG 0800 567 567.";

function getInitialDarkMode(): boolean {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEYS.theme);
    if (saved === 'light') return false;
    return true;
  } catch {
    return true;
  }
}

function formatNowTime(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
  });
}

function createOpeningMessage(): ChatMessage {
  return {
    id: 'opening-thuso',
    role: 'model',
    text: THUSO_OPENING_MESSAGE,
    timestamp: formatNowTime(),
  };
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function createEphemeralSessionId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('chat');
  const [urgentModalOpen, setUrgentModalOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(getInitialDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEYS.theme, next ? 'dark' : 'light');
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  const [popiaConsent, setPopiaConsent] = useState<boolean>(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createOpeningMessage(),
  ]);

  const [steps, setSteps] = useState<SmallStep[]>(() =>
    loadFromStorage<SmallStep[]>(STORAGE_KEYS.steps, [])
  );

  const [triggers, setTriggers] = useState<TriggerNote[]>(() =>
    loadFromStorage<TriggerNote[]>(STORAGE_KEYS.triggers, [])
  );

  const [resources, setResources] = useState<SupportResource[]>([]);
  const [urgentResources, setUrgentResources] = useState<SupportResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState<string | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [errorContacts, setErrorContacts] = useState<SupportResource[] | null>(null);
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);
  const isSendingRef = useRef(false);

  const [tourOpen, setTourOpen] = useState(false);
  const hasCheckedInitialTourRef = useRef(false);

  const sessionId = useMemo(() => createEphemeralSessionId(), []);

  const loadResources = useCallback(async () => {
    setResourcesLoading(true);
    setResourcesError(null);
    try {
      const res = await fetch('/api/resources');
      if (!res.ok) {
        throw new Error('Could not load local support services.');
      }
      const data = (await res.json()) as {
        resources?: SupportResource[];
        urgentResources?: SupportResource[];
      };
      setResources(Array.isArray(data.resources) ? data.resources : []);
      setUrgentResources(
        Array.isArray(data.urgentResources) ? data.urgentResources : []
      );
    } catch {
      setResourcesError('Unable to load local support directory right now.');
    } finally {
      setResourcesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

  // Scrub any legacy stored chat/consent keys and check first-visit tour
  useEffect(() => {
    try {
      for (const legacyKey of LEGACY_KEYS_TO_SCRUB) {
        window.localStorage.removeItem(legacyKey);
      }
      window.sessionStorage.removeItem('thuso_ephemeral_session');
    } catch {
      // Ignore storage errors
    }

    if (hasCheckedInitialTourRef.current) return;
    hasCheckedInitialTourRef.current = true;

    try {
      const seen = window.localStorage.getItem(STORAGE_KEYS.tourSeen);
      const chatInProgress =
        messages.some((m) => m.role === 'user') || isStreaming;
      if (!seen && !chatInProgress) {
        const raf = window.requestAnimationFrame(() => {
          setTourOpen(true);
        });
        return () => window.cancelAnimationFrame(raf);
      }
    } catch {
      // Ignore storage errors
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.steps, JSON.stringify(steps));
    } catch {
      // Ignore storage quota errors
    }
  }, [steps]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.triggers, JSON.stringify(triggers));
    } catch {
      // Ignore storage quota errors
    }
  }, [triggers]);

  const handleFinishTour = useCallback(() => {
    setTourOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEYS.tourSeen, '1');
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  const handleStartTour = useCallback(() => {
    setActiveView('chat');
    window.requestAnimationFrame(() => {
      setTourOpen(true);
    });
  }, []);

  const savedStepNotes = useMemo(
    () =>
      new Set(
        steps
          .map((s) => s.sourceNote)
          .filter((note): note is string => Boolean(note))
      ),
    [steps]
  );

  const crisisDetected = useMemo(
    () => messages.some((m) => Boolean(m.safetyAlert)),
    [messages]
  );

  const sendMessage = async (text: string, isRetry = false) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || isSendingRef.current || !popiaConsent) return;

    isSendingRef.current = true;
    setChatError(null);
    setErrorContacts(null);
    setLastFailedInput(null);

    const modelMsgId = `model-${Date.now() + 1}`;
    const placeholderModelMsg: ChatMessage = {
      id: modelMsgId,
      role: 'model',
      text: '',
      timestamp: formatNowTime(),
    };

    const historyForRequest = isRetry
      ? [...messages]
      : [
          ...messages,
          {
            id: `user-${Date.now()}`,
            role: 'user' as const,
            text: trimmed,
            timestamp: formatNowTime(),
          },
        ];

    const recentMessagesForRequest = historyForRequest
      .slice(-MAX_CLIENT_HISTORY_MESSAGES)
      .map((m) => ({
        role: m.role,
        text: m.text,
      }));

    setMessages([...historyForRequest, placeholderModelMsg]);
    setIsStreaming(true);

    let capturedContacts: SupportResource[] | null = null;

    class NonRetryableChatError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'NonRetryableChatError';
      }
    }

    try {
      for (let attempt = 0; attempt <= MAX_CLIENT_RETRIES; attempt += 1) {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            signal: AbortSignal.timeout(50000),
            headers: {
              'Content-Type': 'application/json',
              'x-thuso-session': sessionId,
            },
            body: JSON.stringify({
              popiaConsent: true,
              ageOrGuardianConfirmed: true,
              messages: recentMessagesForRequest,
              activeSteps: steps.filter((s) => !s.completed).map((s) => s.text),
            }),
          });

          if (!response.ok) {
            let errMessage = FALLBACK_CHAT_ERROR_MESSAGE;
            let retriesExhausted = false;
            try {
              const errData = (await response.json()) as {
                error?: string;
                urgentContacts?: SupportResource[];
                retriesExhausted?: boolean;
              };
              if (Array.isArray(errData?.urgentContacts) && errData.urgentContacts.length > 0) {
                capturedContacts = errData.urgentContacts;
              }
              if (errData?.retriesExhausted) {
                retriesExhausted = true;
              }
              if (response.status === 400 && errData?.error) {
                throw new NonRetryableChatError(errData.error);
              }
              if (retriesExhausted) {
                throw new NonRetryableChatError(errData?.error || FALLBACK_CHAT_ERROR_MESSAGE);
              }
              if (errData?.error && response.status !== 429 && response.status < 500) {
                errMessage = errData.error;
              }
            } catch (parseOrThrow) {
              if (parseOrThrow instanceof NonRetryableChatError) {
                throw parseOrThrow;
              }
            }
            throw new Error(errMessage);
          }

          if (!response.body) {
            throw new Error(FALLBACK_CHAT_ERROR_MESSAGE);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let accumulatedText = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop() ?? '';

            for (const eventChunk of events) {
              const lines = eventChunk
                .split('\n')
                .filter((line) => line.startsWith('data: '));

              for (const line of lines) {
                const payloadStr = line.slice(6).trim();
                if (!payloadStr) continue;

                const payload = JSON.parse(payloadStr) as {
                  status?: string;
                  text?: string;
                  resetText?: boolean;
                  replaceText?: string;
                  done?: boolean;
                  safetyAlert?: boolean;
                  urgentContacts?: SupportResource[];
                  piiMasked?: boolean;
                  error?: string;
                  retriesExhausted?: boolean;
                };

                if (payload.error) {
                  if (Array.isArray(payload.urgentContacts) && payload.urgentContacts.length > 0) {
                    capturedContacts = payload.urgentContacts;
                  }
                  if (payload.retriesExhausted) {
                    throw new NonRetryableChatError(payload.error);
                  }
                  throw new Error(payload.error);
                }

                if (payload.resetText) {
                  accumulatedText = '';
                  setMessages((prev) =>
                    prev.map((m) => (m.id === modelMsgId ? { ...m, text: '' } : m))
                  );
                }

                if (payload.text) {
                  accumulatedText += payload.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === modelMsgId ? { ...m, text: accumulatedText } : m
                    )
                  );
                }

                if (typeof payload.replaceText === 'string') {
                  accumulatedText = payload.replaceText;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === modelMsgId ? { ...m, text: accumulatedText } : m
                    )
                  );
                }

                if (payload.done) {
                  const safetyAlert = Boolean(payload.safetyAlert);
                  const urgentContacts = Array.isArray(payload.urgentContacts)
                    ? payload.urgentContacts
                    : undefined;
                  const piiNotice = Boolean(payload.piiMasked);

                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === modelMsgId
                        ? { ...m, safetyAlert, urgentContacts, piiNotice }
                        : m
                    )
                  );
                }
              }
            }
          }

          if (!accumulatedText.trim()) {
            throw new Error(FALLBACK_CHAT_ERROR_MESSAGE);
          }

          break;
        } catch (attemptErr) {
          if (attemptErr instanceof NonRetryableChatError) {
            throw attemptErr;
          }
          if (attempt < MAX_CLIENT_RETRIES) {
            setMessages((prev) =>
              prev.map((m) => (m.id === modelMsgId ? { ...m, text: '' } : m))
            );
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
            continue;
          }
          throw new Error(FALLBACK_CHAT_ERROR_MESSAGE);
        }
      }
    } catch (err) {
      const msg =
        err instanceof NonRetryableChatError
          ? err.message
          : FALLBACK_CHAT_ERROR_MESSAGE;
      setChatError(msg);
      setErrorContacts(capturedContacts ?? urgentResources);
      setLastFailedInput(trimmed);
      setMessages((prev) =>
        prev.filter((m) => m.id !== modelMsgId || m.text.trim().length > 0)
      );
    } finally {
      isSendingRef.current = false;
      setIsStreaming(false);
    }
  };

  const handleRetryLastMessage = () => {
    if (!lastFailedInput || isStreaming || isSendingRef.current) return;
    void sendMessage(lastFailedInput, true);
  };

  const handleDeleteMyChat = () => {
    setChatError(null);
    setErrorContacts(null);
    setLastFailedInput(null);
    setMessages([createOpeningMessage()]);
    setPopiaConsent(false);
    try {
      for (const legacyKey of LEGACY_KEYS_TO_SCRUB) {
        window.localStorage.removeItem(legacyKey);
      }
    } catch {
      // Ignore storage errors
    }
  };

  const handleAddStep = (text: string, sourceNote?: string) => {
    const newStep: SmallStep = {
      id: `step-${Date.now()}`,
      text,
      completed: false,
      createdAt: formatTodayDate(),
      sourceNote,
    };
    setSteps((prev) => [newStep, ...prev]);
  };

  const handleToggleStep = (id: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleDeleteStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddTrigger = (note: Omit<TriggerNote, 'id' | 'createdAt'>) => {
    const entry: TriggerNote = {
      ...note,
      id: `trigger-${Date.now()}`,
      createdAt: formatTodayDate(),
    };
    setTriggers((prev) => [entry, ...prev]);
  };

  const handleDeleteTrigger = (id: string) => {
    setTriggers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCheckInWithThuso = (stepText: string) => {
    setActiveView('chat');
    if (popiaConsent) {
      void sendMessage(`I want to check in on this small step I saved: "${stepText}"`);
    }
  };

  const handleAskThusoFromDirectory = (prompt: string) => {
    setActiveView('chat');
    if (popiaConsent) {
      void sendMessage(prompt);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#f6f4f1] text-[#1f3a5f] dark:bg-[#12233b] dark:text-[#f6f4f1] overflow-hidden">
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenUrgentHelp={() => setUrgentModalOpen(true)}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      <div className="flex flex-1 min-h-0 max-w-7xl w-full mx-auto bg-white dark:bg-[#182d4a] lg:border-x lg:border-[#dce3ec] dark:lg:border-[#2d4b73]">
        <DesktopSidebar
          steps={steps}
          urgentResources={urgentResources}
          resourcesLoading={resourcesLoading}
          onToggleStep={handleToggleStep}
          onNavigate={setActiveView}
          onStartTour={handleStartTour}
        />

        <main className="flex flex-col flex-1 min-w-0 min-h-0">
          {activeView === 'chat' && (
            <ChatWorkspace
              messages={messages}
              urgentResources={errorContacts ?? urgentResources}
              popiaConsent={popiaConsent}
              onAcceptPopia={() => setPopiaConsent(true)}
              isStreaming={isStreaming}
              error={chatError}
              onSendMessage={(txt) => void sendMessage(txt)}
              onRetryLastMessage={lastFailedInput ? handleRetryLastMessage : undefined}
              onDeleteMyChat={handleDeleteMyChat}
              onSaveStep={handleAddStep}
              savedStepNotes={savedStepNotes}
              onStartTour={handleStartTour}
            />
          )}

          {activeView === 'steps' && (
            <SmallStepsView
              steps={steps}
              triggers={triggers}
              onAddStep={(txt) => handleAddStep(txt)}
              onToggleStep={handleToggleStep}
              onDeleteStep={handleDeleteStep}
              onCheckInWithThuso={handleCheckInWithThuso}
              onAddTrigger={handleAddTrigger}
              onDeleteTrigger={handleDeleteTrigger}
            />
          )}

          {activeView === 'selfcare' && (
            <SelfCareView onSaveAsStep={(txt) => handleAddStep(txt)} />
          )}

          {activeView === 'support' && (
            <SupportDirectoryView
              resources={resources}
              loading={resourcesLoading}
              error={resourcesError}
              onRetry={() => void loadResources()}
              onAskThuso={handleAskThusoFromDirectory}
            />
          )}
        </main>
      </div>

      {/* Compact Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className={`md:hidden shrink-0 sticky bottom-0 z-20 h-14 bg-white dark:bg-[#182d4a] border-t border-[#dce3ec] dark:border-[#2d4b73] grid items-center ${
          crisisDetected ? 'grid-cols-5' : 'grid-cols-4'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveView('chat')}
          className={`flex flex-col items-center justify-center h-full gap-0.5 px-1 text-[10px] min-[360px]:text-[11px] font-medium cursor-pointer ${
            activeView === 'chat'
              ? 'text-[#3d6a9e] dark:text-[#8eb4e0] font-semibold'
              : 'text-[#4a6280] dark:text-[#c5d3e6]'
          }`}
        >
          <MessageCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="truncate max-w-full">Thuso</span>
        </button>

        <button
          type="button"
          data-tour="small-steps-tab"
          onClick={() => setActiveView('steps')}
          className={`flex flex-col items-center justify-center h-full gap-0.5 px-1 text-[10px] min-[360px]:text-[11px] font-medium cursor-pointer ${
            activeView === 'steps'
              ? 'text-[#3d6a9e] dark:text-[#8eb4e0] font-semibold'
              : 'text-[#4a6280] dark:text-[#c5d3e6]'
          }`}
        >
          <Footprints className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="truncate max-w-full">Steps</span>
        </button>

        <button
          type="button"
          data-tour="self-care-target"
          onClick={() => setActiveView('selfcare')}
          className={`flex flex-col items-center justify-center h-full gap-0.5 px-1 text-[10px] min-[360px]:text-[11px] font-medium cursor-pointer ${
            activeView === 'selfcare'
              ? 'text-[#3d6a9e] dark:text-[#8eb4e0] font-semibold'
              : 'text-[#4a6280] dark:text-[#c5d3e6]'
          }`}
        >
          <Wind className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="truncate max-w-full">Self-Care</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('support')}
          className={`flex flex-col items-center justify-center h-full gap-0.5 px-1 text-[10px] min-[360px]:text-[11px] font-medium cursor-pointer ${
            activeView === 'support'
              ? 'text-[#3d6a9e] dark:text-[#8eb4e0] font-semibold'
              : 'text-[#4a6280] dark:text-[#c5d3e6]'
          }`}
        >
          <HeartHandshake className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="truncate max-w-full">Support</span>
        </button>

        {crisisDetected && (
          <button
            type="button"
            onClick={() => setUrgentModalOpen(true)}
            aria-label="Urgent Help — crisis support detected"
            className="flex flex-col items-center justify-center h-full gap-0.5 px-1 text-[10px] min-[360px]:text-[11px] font-semibold bg-[#FEF3F2] text-[#B42318] border-l border-[#F3C5C5] hover:bg-[#FEE4E2] dark:bg-[#331618] dark:text-[#FDA29B] dark:border-[#7A271A] dark:hover:bg-[#461d20] transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="truncate max-w-full">Urgent Help</span>
          </button>
        )}
      </nav>

      <UrgentHelpModal
        isOpen={urgentModalOpen}
        urgentResources={urgentResources}
        onClose={() => setUrgentModalOpen(false)}
      />

      <CoachMarksTour
        isOpen={tourOpen}
        onComplete={handleFinishTour}
        onSkip={handleFinishTour}
      />
    </div>
  );
}
