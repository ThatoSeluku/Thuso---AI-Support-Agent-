import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  ThinkingLevel,
  Type,
  type Content,
} from '@google/genai';
import {
  buildCrisisResponse,
  checkRateLimit,
  detectCrisis,
  detectHarmfulOrIllegalRequest,
  detectPromptInjection,
  HARMFUL_REDIRECT_RESPONSE,
  maskPii,
  MAX_HISTORY_TURNS,
  PROMPT_INJECTION_RESPONSE,
  validateAndNormalizeMessage,
  verifyStructuredOutput,
} from './server/guardrails.ts';
import {
  SUPPORT_RESOURCES,
  THUSO_SYSTEM_PROMPT,
  URGENT_RESOURCES,
} from './server/resources.ts';
import { ReplyJsonStreamExtractor } from './server/streamExtractor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface IncomingMessage {
  role: 'user' | 'model';
  text: string;
}

const THUSO_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description:
        "Thuso's short, warm, conversational message (2-4 sentences, ends with one question or step).",
    },
    stage_of_change: {
      type: Type.STRING,
      enum: [
        'precontemplation',
        'contemplation',
        'preparation',
        'action',
        'maintenance',
        'unclear',
      ],
    },
    risk_level: {
      type: Type.STRING,
      enum: ['none', 'elevated', 'crisis'],
    },
    needs_clarification: {
      type: Type.BOOLEAN,
      description:
        'True if Thuso is asking a question because key information is missing.',
    },
    helplines_shown: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  propertyOrdering: [
    'reply',
    'stage_of_change',
    'risk_level',
    'needs_clarification',
    'helplines_shown',
  ],
  required: ['reply', 'stage_of_change', 'risk_level', 'needs_clarification'],
};

// Calibrated thresholds so supportive discussion of substances/gang pressure isn't falsely blocked,
// while our server-side 7-layer guardrails enforce strict safety, crisis routing, and illegal-request blocks.
const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 15000,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const CHAT_MODEL = 'gemini-3.1-flash-lite';
const MAX_OUTPUT_TOKENS = 300;
const MAX_API_RETRIES = 2;
const RETRY_DELAY_MS = 3000;
const FALLBACK_CHAT_ERROR_MESSAGE =
  "I couldn't reply just now. If you're in danger, call SAPS 10111, the GBV Command Centre 0800 428 428, or SADAG 0800 567 567.";

function getErrorStatus(error: unknown): number {
  const errObj = error as { status?: number; code?: number; name?: string };
  if (typeof errObj?.status === 'number' && errObj.status >= 400) {
    return errObj.status;
  }
  if (typeof errObj?.code === 'number' && errObj.code >= 400) {
    return errObj.code;
  }
  if (errObj?.name === 'AbortError' || errObj?.name === 'TimeoutError') {
    return 504;
  }
  return 500;
}

function getErrorReason(error: unknown): string {
  if (error instanceof Error && error.message === 'GEMINI_API_KEY_MISSING') {
    return 'api_key_missing';
  }
  const status = getErrorStatus(error);
  const rawMessage = (error as { message?: string })?.message || '';
  if (status === 403 || /403|PERMISSION_DENIED|API_KEY_INVALID|API key not valid/i.test(rawMessage)) {
    return 'permission_denied';
  }
  if (status === 429 || /429|RESOURCE_EXHAUSTED|quota/i.test(rawMessage)) {
    return 'rate_exhausted';
  }
  if (status === 404 || /404|NOT_FOUND/i.test(rawMessage)) {
    return 'model_not_found';
  }
  if (status === 503 || status === 504 || /503|UNAVAILABLE|timeout|aborted/i.test(rawMessage)) {
    return 'service_unavailable';
  }
  return 'upstream_error';
}

function waitWithDisconnectCheck(res: Response, delayMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (res.writableEnded || res.destroyed) {
      resolve(false);
      return;
    }
    const onClose = () => {
      clearTimeout(timer);
      resolve(false);
    };
    const timer = setTimeout(() => {
      res.off('close', onClose);
      resolve(!res.writableEnded && !res.destroyed);
    }, delayMs);
    res.once('close', onClose);
  });
}

async function streamWithAutoRetry(
  ai: GoogleGenAI,
  contents: Content[],
  systemInstruction: string,
  res: Response
): Promise<{ rawOutput: string; streamedReply: string; aborted: boolean }> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_API_RETRIES; attempt += 1) {
    if (res.writableEnded || res.destroyed) {
      return { rawOutput: '', streamedReply: '', aborted: true };
    }

    const extractor = new ReplyJsonStreamExtractor();
    const rawChunks: string[] = [];

    try {
      const stream = await ai.models.generateContentStream({
        model: CHAT_MODEL,
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: THUSO_RESPONSE_SCHEMA,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          safetySettings: SAFETY_SETTINGS,
          abortSignal: AbortSignal.timeout(12000),
        },
      });

      for await (const chunk of stream) {
        if (res.writableEnded || res.destroyed) {
          return { rawOutput: '', streamedReply: '', aborted: true };
        }
        const chunkText = chunk.text ?? '';
        if (!chunkText) continue;
        rawChunks.push(chunkText);
        const replyDelta = extractor.push(chunkText);
        if (replyDelta) {
          writeSseEvent(res, { text: replyDelta });
        }
      }

      const rawOutput = rawChunks.join('').trim();
      if (!rawOutput) {
        throw new Error('EMPTY_MODEL_RESPONSE');
      }

      return {
        rawOutput,
        streamedReply: extractor.getExtractedReply(),
        aborted: false,
      };
    } catch (error) {
      lastError = error;
      if (res.writableEnded || res.destroyed) {
        return { rawOutput: '', streamedReply: '', aborted: true };
      }

      logMaskedAudit('gemini_api_attempt_failed', {
        attempt: attempt + 1,
        maxAttempts: MAX_API_RETRIES + 1,
        status: getErrorStatus(error),
        reason: getErrorReason(error),
      });

      if (attempt < MAX_API_RETRIES) {
        if (extractor.getExtractedReply().length > 0) {
          writeSseEvent(res, { resetText: true });
        }
        const stillConnected = await waitWithDisconnectCheck(res, RETRY_DELAY_MS);
        if (!stillConnected) {
          return { rawOutput: '', streamedReply: '', aborted: true };
        }
      }
    }
  }

  throw lastError;
}

function writeSseEvent(res: Response, payload: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function logMaskedAudit(event: string, meta: Record<string, unknown>) {
  // POPIA safeguard: never log raw user messages or unmasked PII
  console.info(
    JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...meta,
    })
  );
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set('trust proxy', true);
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get('/api/resources', (_req: Request, res: Response) => {
    res.json({
      resources: SUPPORT_RESOURCES,
      urgentResources: URGENT_RESOURCES,
    });
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
    try {
      // Layer 1a: Rate limiting per anonymous session header or IP
      const sessionHeader = req.header('x-thuso-session');
      const clientKey =
        (typeof sessionHeader === 'string' && sessionHeader.slice(0, 64)) ||
        req.ip ||
        'anonymous';

      const rateStatus = checkRateLimit(clientKey);
      if (!rateStatus.allowed) {
        logMaskedAudit('rate_limit_blocked', {
          retryAfterSeconds: rateStatus.retryAfterSeconds,
        });
        res.status(429).json({
          error: `You're sending messages very quickly. Please take a breath and try again in ${rateStatus.retryAfterSeconds ?? 15} seconds.`,
        });
        return;
      }

      const body = req.body as {
        messages?: IncomingMessage[];
        activeSteps?: string[];
        popiaConsent?: boolean;
        ageOrGuardianConfirmed?: boolean;
      };

      if (body?.popiaConsent !== true || body?.ageOrGuardianConfirmed !== true) {
        res.status(400).json({
          error:
            'Please confirm both boxes in the privacy notice before starting the conversation.',
        });
        return;
      }

      const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
      const sanitizedTurns: IncomingMessage[] = [];

      // Layer 1b: Basic validation & control character stripping across turns
      for (const m of rawMessages) {
        if (!m || (m.role !== 'user' && m.role !== 'model') || typeof m.text !== 'string') {
          continue;
        }
        const checked = validateAndNormalizeMessage(m.text);
        if (!checked.valid) {
          if (m.role === 'user') {
            res.status(400).json({ error: checked.error });
            return;
          }
          continue;
        }
        sanitizedTurns.push({ role: m.role, text: checked.text });
      }

      const recentTurns = sanitizedTurns.slice(-MAX_HISTORY_TURNS);
      const firstUserIndex = recentTurns.findIndex((m) => m.role === 'user');
      if (firstUserIndex === -1) {
        res.status(400).json({ error: 'Please type a message before sending.' });
        return;
      }

      const boundedConversation = recentTurns.slice(firstUserIndex);

      const latestUserMessage =
        [...boundedConversation].reverse().find((m) => m.role === 'user')?.text ?? '';

      // Layer 2: Prompt-injection & jailbreak screening
      if (detectPromptInjection(latestUserMessage)) {
        logMaskedAudit('guardrail_injection_blocked', {
          risk_level: 'none',
          stage_of_change: 'unclear',
        });
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();
        writeSseEvent(res, { text: PROMPT_INJECTION_RESPONSE });
        writeSseEvent(res, { done: true, safetyAlert: false });
        res.end();
        return;
      }

      // Layer 3: PII detection & masking
      const maskedConversation = boundedConversation.map((turn) => {
        const result = maskPii(turn.text);
        return {
          role: turn.role,
          text: result.maskedText,
          piiCategories: result.categories,
        };
      });

      const latestMaskedUser =
        [...maskedConversation].reverse().find((m) => m.role === 'user') ?? {
          text: '',
          piiCategories: [],
        };

      if (latestMaskedUser.piiCategories.length > 0) {
        logMaskedAudit('pii_masked', {
          categories: latestMaskedUser.piiCategories,
        });
      }

      // Layer 4: Crisis detection FIRST (routes straight to deterministic safety response)
      const crisisCheck = detectCrisis(latestMaskedUser.text);
      if (crisisCheck.isCrisis) {
        const { reply, helplinesShown, urgentContacts } = buildCrisisResponse(
          crisisCheck.category
        );
        logMaskedAudit('crisis_routed', {
          category: crisisCheck.category,
          risk_level: 'crisis',
          helplines_shown: helplinesShown,
        });
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();
        writeSseEvent(res, { text: reply });
        writeSseEvent(res, {
          done: true,
          safetyAlert: true,
          urgentContacts,
          piiMasked: latestMaskedUser.piiCategories.length > 0,
        });
        res.end();
        return;
      }

      // Layer 5: Out-of-scope and harmful-request filter
      if (detectHarmfulOrIllegalRequest(latestMaskedUser.text)) {
        logMaskedAudit('harmful_request_redirected', {
          risk_level: 'elevated',
        });
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();
        writeSseEvent(res, { text: HARMFUL_REDIRECT_RESPONSE });
        writeSseEvent(res, { done: true, safetyAlert: false });
        res.end();
        return;
      }

      const contents: Content[] = [];
      for (const msg of maskedConversation) {
        const last = contents[contents.length - 1];
        if (last && last.role === msg.role) {
          const prevText = last.parts?.[0]?.text ?? '';
          last.parts = [{ text: `${prevText}\n\n${msg.text}` }];
        } else {
          contents.push({
            role: msg.role,
            parts: [{ text: msg.text }],
          });
        }
      }

      const activeSteps = Array.isArray(body?.activeSteps)
        ? body.activeSteps
            .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
            .slice(0, 5)
            .map((s) => maskPii(s.trim().slice(0, 200)).maskedText)
        : [];

      const systemInstruction =
        activeSteps.length > 0
          ? `${THUSO_SYSTEM_PROMPT}\n\n# USER'S SAVED SMALL STEPS (context only, mention gently only if relevant)\n${activeSteps
              .map((s) => `- ${s}`)
              .join('\n')}`
          : THUSO_SYSTEM_PROMPT;

      const ai = getGeminiClient();

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      writeSseEvent(res, { status: 'listening' });

      // Keep SSE stream alive through proxies while waiting for model response
      keepaliveTimer = setInterval(() => {
        if (!res.writableEnded) {
          res.write(': keepalive\n\n');
        }
      }, 2500);

      // Layer 6: Fast Flash-Lite streaming with minimal thinking & 2x 3s auto-retry
      const { rawOutput, streamedReply, aborted } = await streamWithAutoRetry(
        ai,
        contents,
        systemInstruction,
        res
      );

      if (keepaliveTimer) {
        clearInterval(keepaliveTimer);
        keepaliveTimer = null;
      }

      if (aborted || res.writableEnded) {
        return;
      }

      // Layer 7: Structured output check
      let verified = verifyStructuredOutput(rawOutput);
      if (
        verified.flagReasons.includes('invalid_json_fallback') &&
        streamedReply.trim().length > 0
      ) {
        verified = verifyStructuredOutput(
          JSON.stringify({
            reply: streamedReply,
            stage_of_change: 'unclear',
            risk_level: 'none',
            needs_clarification: false,
            helplines_shown: [],
          })
        );
      }

      logMaskedAudit('chat_turn_verified', {
        stage_of_change: verified.stageOfChange,
        risk_level: verified.riskLevel,
        needs_clarification: verified.needsClarification,
        helplines_shown: verified.helplinesShown,
        guardrail_flagged: verified.flagged,
        flag_reasons: verified.flagReasons,
      });

      if (verified.reply !== streamedReply) {
        writeSseEvent(res, { replaceText: verified.reply });
      }
      writeSseEvent(res, {
        done: true,
        safetyAlert: verified.safetyAlert,
        urgentContacts: verified.urgentContacts,
        piiMasked: latestMaskedUser.piiCategories.length > 0,
      });
      res.end();
    } catch (error) {
      if (keepaliveTimer) {
        clearInterval(keepaliveTimer);
        keepaliveTimer = null;
      }
      const status = getErrorStatus(error);
      const reason = getErrorReason(error);
      logMaskedAudit('chat_error', { status, reason });
      if (!res.headersSent) {
        res.status(status >= 400 ? status : 500).json({
          error: FALLBACK_CHAT_ERROR_MESSAGE,
          urgentContacts: URGENT_RESOURCES,
          retriesExhausted: true,
        });
      } else if (!res.writableEnded) {
        writeSseEvent(res, {
          error: FALLBACK_CHAT_ERROR_MESSAGE,
          urgentContacts: URGENT_RESOURCES,
          retriesExhausted: true,
        });
        res.end();
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Thuso server listening on http://localhost:${PORT}`);
  });
}

startServer();
