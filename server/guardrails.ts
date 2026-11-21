import {
  ALLOWED_HELPLINE_NUMBERS,
  URGENT_RESOURCES,
  type ServerSupportResource,
} from './resources.ts';

export const MAX_MESSAGE_LENGTH = 1500;
export const MAX_HISTORY_TURNS = 10;

export type StageOfChange =
  | 'precontemplation'
  | 'contemplation'
  | 'preparation'
  | 'action'
  | 'maintenance'
  | 'unclear';

export type RiskLevel = 'none' | 'elevated' | 'crisis';

export interface StructuredThusoPayload {
  reply: string;
  stage_of_change: StageOfChange;
  risk_level: RiskLevel;
  needs_clarification: boolean;
  helplines_shown?: string[];
}

export interface VerifiedOutputResult {
  reply: string;
  stageOfChange: StageOfChange;
  riskLevel: RiskLevel;
  needsClarification: boolean;
  helplinesShown: string[];
  safetyAlert: boolean;
  urgentContacts?: ServerSupportResource[];
  flagged: boolean;
  flagReasons: string[];
}

// 1. Basic validation: strip ASCII/Unicode control chars (preserve \n and \t), normalize length
export function validateAndNormalizeMessage(raw: string): {
  valid: boolean;
  text: string;
  error?: string;
} {
  if (typeof raw !== 'string') {
    return { valid: false, text: '', error: 'Message must be plain text.' };
  }

  const stripped = raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .trim();

  if (!stripped) {
    return { valid: false, text: '', error: 'Please type a message before sending.' };
  }

  if (stripped.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      text: '',
      error: `Please keep each message under ${MAX_MESSAGE_LENGTH} characters so we can take things one step at a time.`,
    };
  }

  return { valid: true, text: stripped };
}

// Sliding-window in-memory rate limiter per session / IP
const rateBuckets = new Map<string, number[]>();
const RATE_WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 25;
const BURST_WINDOW_MS = 15 * 1000;
const MAX_BURST_REQUESTS = 5;

export function checkRateLimit(clientKey: string, now = Date.now()): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const key = clientKey || 'anonymous';
  const timestamps = (rateBuckets.get(key) ?? []).filter(
    (ts) => now - ts < RATE_WINDOW_MS
  );

  const burstCount = timestamps.filter((ts) => now - ts < BURST_WINDOW_MS).length;
  if (burstCount >= MAX_BURST_REQUESTS) {
    rateBuckets.set(key, timestamps);
    return { allowed: false, retryAfterSeconds: 15 };
  }

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000)
    );
    rateBuckets.set(key, timestamps);
    return { allowed: false, retryAfterSeconds };
  }

  timestamps.push(now);
  rateBuckets.set(key, timestamps);

  if (rateBuckets.size > 500) {
    for (const [k, list] of rateBuckets.entries()) {
      if (list.every((ts) => now - ts >= RATE_WINDOW_MS)) {
        rateBuckets.delete(k);
      }
    }
  }

  return { allowed: true };
}

// 2. Prompt-injection & jailbreak screening
const INJECTION_PATTERNS: RegExp[] = [
  /\b(ignore|disregard|forget|override|bypass)\b.{0,35}\b(previous|above|prior|all|system|safety|your)\b.{0,25}\b(instructions|rules|prompt|guidelines|guardrails|directives)\b/i,
  /\b(repeat|reveal|show|print|output|tell me|give me|share|dump|leak)\b.{0,35}\b(your|the|hidden|initial|original|system)\b.{0,20}\b(instructions|prompt|rules|guidelines|directives|persona)\b/i,
  /\bwhat (are|were) your (system )?(instructions|rules|prompt)\b/i,
  /\b(you are now|act as|pretend to be|switch to)\b.{0,30}\b(dan|developer mode|jailbreak|unrestricted|unfiltered|evil)\b/i,
  /\b(system prompt|jailbreak|prompt injection|do anything now)\b/i,
  /<\s*\/?\s*(system|instruction|prompt)\s*>/i,
];

export function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

export const PROMPT_INJECTION_RESPONSE =
  "I'm Thuso, and I'm here to offer steady, judgement-free support with whatever you're facing today. We can keep things focused on you or someone you care about—what's been weighing on your mind?";

// 3. PII detection & masking (SA ID numbers, phone numbers, emails, addresses, self-introduced names)
export interface PiiMaskResult {
  maskedText: string;
  piiDetected: boolean;
  categories: string[];
}

export function maskPii(text: string): PiiMaskResult {
  let masked = text;
  const categories = new Set<string>();

  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  if (emailRegex.test(masked)) {
    categories.add('email');
    masked = masked.replace(emailRegex, '[EMAIL_REDACTED]');
  }

  const saIdRegex = /\b\d{6}[\s-]?\d{4}[\s-]?\d{3}\b/g;
  if (saIdRegex.test(masked)) {
    categories.add('sa_id');
    masked = masked.replace(saIdRegex, '[ID_REDACTED]');
  }

  const phoneRegex = /(?:\+27|0)(?:[\s-]?\d){8,9}\b/g;
  masked = masked.replace(phoneRegex, (match) => {
    const normalized = match.replace(/[\s-]/g, '').replace(/^\+27/, '0');
    if (ALLOWED_HELPLINE_NUMBERS.has(normalized)) {
      return match;
    }
    categories.add('phone');
    return '[PHONE_REDACTED]';
  });

  const addressRegex =
    /\b\d{1,5}\s+[A-Za-z][A-Za-z\s'-]{1,30}\s+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Close|Lane|Ln|Crescent|Cres|Way|Boulevard|Blvd)\b/gi;
  if (addressRegex.test(masked)) {
    categories.add('address');
    masked = masked.replace(addressRegex, '[ADDRESS_REDACTED]');
  }

  const nameIntroRegex =
    /\b([Mm]y name is|[Cc]all me)\s+([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){0,2})\b/g;
  if (nameIntroRegex.test(masked)) {
    categories.add('name');
    masked = masked.replace(nameIntroRegex, '$1 [NAME_REDACTED]');
  }

  return {
    maskedText: masked,
    piiDetected: categories.size > 0,
    categories: Array.from(categories),
  };
}

// 4. Crisis detection FIRST (runs deterministically before calling Gemini)
export type CrisisCategory = 'self_harm' | 'abuse_gbv' | 'immediate_danger' | 'none';

const SELF_HARM_PATTERNS: RegExp[] = [
  /\b(suicid|kill myself|end my life|end it all|want to die|wish i was dead|better off dead|don'?t want to live|no reason to live)\b/i,
  /\b(self[- ]?harm|cut myself|cutting myself|hurt myself|overdose|slit my|hang myself)\b/i,
];

const ABUSE_GBV_PATTERNS: RegExp[] = [
  /\b(beat(?:ing|s)? me|hitting me|hits me|abus(?:e|ing|ed) me|raped|rape me|sexual assault|molest|hurting us|hurting me|beats my mom|beats my mother|beats my sister|he hit me|he hits me|punched me)\b/i,
  /\b(unsafe at home|scared to go home|locked me in|choked me|strangled|threatened me with a knife|threatened to hurt us)\b/i,
];

const IMMEDIATE_DANGER_PATTERNS: RegExp[] = [
  /\b(stab(?:bed|bing)?|shoot(?:ing)?|shot at|pointing a gun|has a gun|has a knife|threaten(?:ing|ed)? to kill|coming to kill|immediate danger|bleeding badly|right now.*danger)\b/i,
];

export function detectCrisis(text: string): {
  isCrisis: boolean;
  category: CrisisCategory;
} {
  if (SELF_HARM_PATTERNS.some((p) => p.test(text))) {
    return { isCrisis: true, category: 'self_harm' };
  }
  if (IMMEDIATE_DANGER_PATTERNS.some((p) => p.test(text))) {
    return { isCrisis: true, category: 'immediate_danger' };
  }
  if (ABUSE_GBV_PATTERNS.some((p) => p.test(text))) {
    return { isCrisis: true, category: 'abuse_gbv' };
  }
  return { isCrisis: false, category: 'none' };
}

export function buildCrisisResponse(category: CrisisCategory): {
  reply: string;
  helplinesShown: string[];
  urgentContacts: ServerSupportResource[];
} {
  if (category === 'self_harm') {
    return {
      reply:
        "I'm really glad you told me this, and I'm taking how you're feeling seriously. Please reach out to someone who can support you right now—call SADAG on 0800 567 567 (or SMS 31393), Childline on 116, or SAPS on 10111 / 112 if you're in immediate danger. Are you somewhere safe right now, and is there someone you trust nearby?",
      helplinesShown: ['0800 567 567', '116', '10111', '112'],
      urgentContacts: URGENT_RESOURCES,
    };
  }

  if (category === 'abuse_gbv') {
    return {
      reply:
        "I hear you, and what's happening is not okay—you deserve to be safe. Please contact the GBV Command Centre on 0800 428 428 (or dial *120*7867#), Childline on 116 if anyone under 18 is affected, or SAPS on 10111 / 112 if someone is being hurt right now. Are you in a safe place at this moment, and is there a trusted neighbour, relative, or adult nearby?",
      helplinesShown: ['0800 428 428', '116', '10111', '112'],
      urgentContacts: URGENT_RESOURCES,
    };
  }

  return {
    reply:
      "Your safety comes before everything else right now. If there is immediate danger, please call SAPS on 10111 or 112 from any cellphone, or reach Childline on 116 or the GBV Command Centre on 0800 428 428 as soon as you can. Are you somewhere safe right now, and is there anyone trusted near you?",
    helplinesShown: ['10111', '112', '116', '0800 428 428'],
    urgentContacts: URGENT_RESOURCES,
  };
}

// 5. Out-of-scope & harmful-request filter
const HARMFUL_REQUEST_PATTERNS: RegExp[] = [
  /\b(how to|where (can i|to)|help me|teach me|show me)\b.{0,40}\b(buy|score|get|find|cook|make|manufacture|sell|smuggle|hide)\b.{0,30}\b(nyaope|whoonga|tik|meth|cocaine|heroin|drugs|weed|dagga|gun|firearm|weapon|knife|ammunition)\b/i,
  /\b(how to|help me|teach me|show me|best way to)\b.{0,40}\b(steal|rob|hijack|break into|burglar|shoplift|scam|fraud|extort|launder|pick a lock|hotwire)\b/i,
  /\b(how do i|how to)\b.{0,30}\b(join a gang|get away with a crime|commit a crime|beat a drug test)\b/i,
];

export function detectHarmfulOrIllegalRequest(text: string): boolean {
  return HARMFUL_REQUEST_PATTERNS.some((pattern) => pattern.test(text));
}

export const HARMFUL_REDIRECT_RESPONSE =
  "I can't help with anything illegal, dangerous, or related to getting drugs or weapons, and I want to keep this a safe space. If you're feeling pressured or trapped in a tough situation right now, we can talk through safer ways to protect yourself. What's going on around you at the moment?";

// 7. Output check: screen replies for leaked prompt fragments, PII, unverified helplines, or medical diagnoses/dosing
const PROMPT_LEAK_PATTERNS: RegExp[] = [
  /#\s*(ROLE|CONTEXT|GOAL|METHOD|RULES|SAFETY|OUTPUT FORMAT|OPENING MESSAGE|ATTACHED REFERENCE)/i,
  /\b(THUSO_SYSTEM_PROMPT|systemInstruction|sa_helplines\.json|methodology_guide\.md|slang_and_substances\.json|Motivational Interviewing|Stages of Change|trauma-informed care)\b/i,
  /\b(as an ai language model|my system prompt|my instructions state)\b/i,
];

const MEDICAL_ADVICE_PATTERNS: RegExp[] = [
  /\b(i diagnose you|your diagnosis is|you have (?:clinical )?(?:bipolar|schizophrenia|major depressive disorder|ptsd|adhd))\b/i,
  /\b(take|dose|dosage|prescribe|prescription)\b.{0,25}\b(\d+\s?(?:mg|ml|mcg|tablets?|pills?|capsules?))\b/i,
];

export function screenModelOutput(rawReply: string): {
  safeText: string;
  flagged: boolean;
  reason?: string;
} {
  let text = rawReply.trim();

  if (PROMPT_LEAK_PATTERNS.some((p) => p.test(text))) {
    return {
      safeText:
        "I'm here to walk with you at your pace, with no judgement. Tell me a bit more about what's been happening so we can take one small step together?",
      flagged: true,
      reason: 'prompt_leak_prevented',
    };
  }

  if (MEDICAL_ADVICE_PATTERNS.some((p) => p.test(text))) {
    return {
      safeText:
        "What you're carrying sounds heavy, and it's important to get proper care from a clinic sister, doctor, or helpline counsellor who can assess you safely. Would you be open to calling the Substance Abuse Helpline on 0800 12 13 14 or visiting your local clinic together with someone you trust?",
      flagged: true,
      reason: 'medical_advice_prevented',
    };
  }

  const piiCheck = maskPii(text);
  if (piiCheck.piiDetected) {
    text = piiCheck.maskedText;
  }

  return {
    safeText: text,
    flagged: false,
  };
}

export function isVerifiedHelplineNumber(num: string): boolean {
  const normalized = num.replace(/[\s-]/g, '');
  return ALLOWED_HELPLINE_NUMBERS.has(normalized);
}

export function replyMentionsHelpline(text: string): boolean {
  for (const num of ALLOWED_HELPLINE_NUMBERS) {
    if (num.length >= 3 && text.replace(/[\s-]/g, '').includes(num)) {
      return true;
    }
  }
  return false;
}

const VALID_STAGES = new Set<StageOfChange>([
  'precontemplation',
  'contemplation',
  'preparation',
  'action',
  'maintenance',
  'unclear',
]);

const VALID_RISKS = new Set<RiskLevel>(['none', 'elevated', 'crisis']);

export function verifyStructuredOutput(rawModelOutput: string): VerifiedOutputResult {
  const flagReasons: string[] = [];
  let parsed: Partial<StructuredThusoPayload> | null = null;

  try {
    parsed = JSON.parse(rawModelOutput) as Partial<StructuredThusoPayload>;
  } catch {
    flagReasons.push('invalid_json_fallback');
  }

  const stageOfChange: StageOfChange =
    parsed?.stage_of_change && VALID_STAGES.has(parsed.stage_of_change)
      ? parsed.stage_of_change
      : 'unclear';

  const riskLevel: RiskLevel =
    parsed?.risk_level && VALID_RISKS.has(parsed.risk_level)
      ? parsed.risk_level
      : 'none';

  const needsClarification = Boolean(parsed?.needs_clarification);

  const trimmedRaw = rawModelOutput.trim();
  const rawReply =
    typeof parsed?.reply === 'string' && parsed.reply.trim().length > 0
      ? parsed.reply.trim()
      : !trimmedRaw || trimmedRaw.startsWith('{')
        ? "I'm listening and I want to make sure I understand you properly. Could you share a little more about what's happening right now?"
        : trimmedRaw;

  // Filter helplines_shown strictly against sa_helplines.json
  const rawHelplines = Array.isArray(parsed?.helplines_shown)
    ? parsed.helplines_shown.filter((h): h is string => typeof h === 'string')
    : [];
  const verifiedHelplines = rawHelplines.filter((h) => isVerifiedHelplineNumber(h));
  if (verifiedHelplines.length !== rawHelplines.length) {
    flagReasons.push('unverified_helpline_filtered');
  }

  // Run output check on reply text
  const outputCheck = screenModelOutput(rawReply);
  if (outputCheck.flagged && outputCheck.reason) {
    flagReasons.push(outputCheck.reason);
  }
  let reply = outputCheck.safeText;

  // Guardrail invariant: risk_level === 'crisis' ALWAYS surfaces verified helplines
  const hasHelplineInReply = replyMentionsHelpline(reply);
  const safetyAlert = riskLevel === 'crisis' || hasHelplineInReply;

  if (riskLevel === 'crisis' && !hasHelplineInReply) {
    flagReasons.push('crisis_helplines_enforced');
    reply = `${reply} If you are in danger or need urgent support right now, please call SAPS on 10111 or 112, SADAG on 0800 567 567, or the GBV Command Centre on 0800 428 428.`;
  }

  const finalHelplines =
    riskLevel === 'crisis' && verifiedHelplines.length === 0
      ? ['10111', '112', '0800 567 567', '0800 428 428']
      : verifiedHelplines;

  return {
    reply,
    stageOfChange,
    riskLevel,
    needsClarification,
    helplinesShown: finalHelplines,
    safetyAlert,
    urgentContacts: safetyAlert ? URGENT_RESOURCES : undefined,
    flagged: flagReasons.length > 0,
    flagReasons,
  };
}
