import Anthropic from '@anthropic-ai/sdk';
import type { AiSettings } from '../settings';
import { storage } from '../storage';

/**
 * OPTIONAL external AI advice (Claude via the Anthropic API).
 * - Disabled by default; requires Settings → AI: enabled + explicit consent + API key.
 * - Only runs when the technician clicks "Ask AI".
 * - Redacts personal data by default.
 * - Results are labelled as suggestions, never as performed actions.
 */
const KEY_NAME = 'ai.key';

export function getApiKey(ai: AiSettings): string {
  return storage.session.get<string>(KEY_NAME, '') || (ai.rememberKey ? storage.get<string>(KEY_NAME, '') : '');
}
export function setApiKey(key: string, remember: boolean) {
  storage.session.set(KEY_NAME, key);
  if (remember) storage.set(KEY_NAME, key);
  else storage.remove(KEY_NAME);
}

export function aiReady(ai: AiSettings): { ok: boolean; reason: string } {
  if (!ai.enabled) return { ok: false, reason: 'External AI is disabled (Settings → AI).' };
  if (!ai.consent) return { ok: false, reason: 'Consent for external processing has not been confirmed (Settings → AI).' };
  if (!getApiKey(ai)) return { ok: false, reason: 'No API key configured (Settings → AI).' };
  return { ok: true, reason: '' };
}

export interface RedactionInput {
  text: string;
  secrets: string[];
}

/** Replaces personal identifiers with neutral placeholders. */
export function redact({ text, secrets }: RedactionInput): string {
  let out = text;
  const sorted = [...new Set(secrets.filter((s) => s && s.trim().length > 2))].sort((a, b) => b.length - a.length);
  sorted.forEach((s, i) => {
    const esc = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(esc, 'gi'), `[REDACTED_${i + 1}]`);
  });
  return out
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[EMAIL]')
    .replace(/(\+?\d[\d\s-]{7,}\d)/g, '[PHONE]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]')
    .replace(/\b[0-9a-f]{32}\b/g, '[SYS_ID]');
}

export interface AiAdvice {
  potential_causes: string[];
  troubleshooting_steps: string[];
  recommended_next_actions: string[];
  knowledge_search_terms: string[];
  summary: string;
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'potential_causes', 'troubleshooting_steps', 'recommended_next_actions', 'knowledge_search_terms'],
  properties: {
    summary: { type: 'string' },
    potential_causes: { type: 'array', items: { type: 'string' } },
    troubleshooting_steps: { type: 'array', items: { type: 'string' } },
    recommended_next_actions: { type: 'array', items: { type: 'string' } },
    knowledge_search_terms: { type: 'array', items: { type: 'string' } },
  },
};

const SYSTEM = `You assist first- and second-line IT service desk engineers.
Given an incident summary, suggest likely causes, concrete troubleshooting steps, and recommended next actions.
These are suggestions for the engineer to evaluate; never claim that any step has already been performed.
Keep each item to one short sentence. Reply in the language of the ticket text (Dutch or English).
knowledge_search_terms: 1-3 short phrases suitable for a ServiceNow knowledge base search.`;

export async function askAi(ai: AiSettings, ticketText: string): Promise<AiAdvice> {
  const client = new Anthropic({
    apiKey: getApiKey(ai),
    baseURL: ai.baseUrl || undefined,
    dangerouslyAllowBrowser: true, // bring-your-own-key, explicitly approved by the user in Settings
    maxRetries: 1,
    timeout: 90_000,
  });
  try {
    const res = await client.beta.messages.create({
      model: ai.model || 'claude-opus-5-5',
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: ticketText }],
    });
    if (res.stop_reason === 'refusal') throw new Error('The AI declined this request.');
    const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const parsed = JSON.parse(text) as AiAdvice;
    return parsed;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('Invalid API key.');
    if (e instanceof Anthropic.RateLimitError) throw new Error('Rate limited — try again shortly.');
    if (e instanceof Anthropic.APIConnectionError)
      throw new Error('Could not reach the AI endpoint (network, proxy or the ServiceNow Content-Security-Policy may block it).');
    if (e instanceof Anthropic.APIError) throw new Error(`AI error ${e.status ?? ''}: ${e.message}`);
    throw e;
  }
}
