import type { DateFormat } from './dates';
import { DEFAULT_INSERT_SELECTORS, type FieldMap } from './fields';
import { storage } from './storage';

export type Lang = 'en' | 'nl';
export type Theme = 'system' | 'light' | 'dark';

export interface AiSettings {
  /** External AI is OFF by default and requires explicit consent. */
  enabled: boolean;
  consent: boolean;
  model: string;
  /** Optional: route through an approved internal gateway instead of api.anthropic.com. */
  baseUrl: string;
  /** Persist the API key in this browser (otherwise kept for the session only). */
  rememberKey: boolean;
  /** Redact names, emails, phone numbers and ticket numbers before sending. */
  redact: boolean;
}

export interface Settings {
  /** Language of the toolkit interface. */
  uiLanguage: 'en' | 'nl';
  technicianName: string;
  department: string;
  signature: string;
  /** Default language of customer-facing comments. */
  language: Lang;
  theme: Theme;
  dateFormat: DateFormat;
  /** Hostnames or wildcard patterns (*.service-now.com) the toolkit may run on. */
  allowedDomains: string[];
  useRestApi: boolean;
  autoRescan: boolean;
  insertMode: 'append' | 'replace';
  keepHistory: boolean;
  fieldMap: FieldMap;
  insertSelectors: { work_notes: string[]; comments: string[] };
  ai: AiSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  uiLanguage: (() => {
    try {
      return (navigator.language || '').toLowerCase().startsWith('nl') ? 'nl' : 'en';
    } catch {
      return 'en';
    }
  })(),
  technicianName: '',
  department: 'Workplace Services',
  signature: '',
  language: 'nl',
  theme: 'light',
  dateFormat: 'dd-MM-yyyy',
  allowedDomains: [],
  useRestApi: true,
  autoRescan: true,
  insertMode: 'append',
  keepHistory: true,
  fieldMap: {},
  insertSelectors: { ...DEFAULT_INSERT_SELECTORS },
  ai: {
    enabled: false,
    consent: false,
    model: 'claude-opus-5-5',
    baseUrl: '',
    rememberKey: false,
    redact: true,
  },
};

export function loadSettings(): Settings {
  const saved = storage.get<Partial<Settings>>('settings', {});
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    insertSelectors: { ...DEFAULT_SETTINGS.insertSelectors, ...(saved.insertSelectors || {}) },
    ai: { ...DEFAULT_SETTINGS.ai, ...(saved.ai || {}) },
    fieldMap: saved.fieldMap || {},
  };
}
export function saveSettings(s: Settings) {
  storage.set('settings', s);
}

/** Matches a hostname against a list of exact names or "*.suffix" patterns. */
export function hostAllowed(host: string, patterns: string[]): boolean {
  const h = host.toLowerCase();
  return patterns.some((p) => {
    const d = p.trim().toLowerCase();
    if (!d) return false;
    if (d.startsWith('*.')) return h.endsWith(d.slice(1));
    return h === d;
  });
}
