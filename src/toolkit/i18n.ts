import { useStore } from './state/store';
import { NL } from './i18n.nl';

export type UiLang = 'en' | 'nl';

/** Default UI language: Dutch browsers get Dutch, everyone else English. */
export function defaultUiLang(): UiLang {
  try {
    return (navigator.language || '').toLowerCase().startsWith('nl') ? 'nl' : 'en';
  } catch {
    return 'en';
  }
}

/**
 * English source strings are the keys; Dutch translations live in i18n.nl.ts.
 * `{name}` placeholders are replaced from `vars`.
 */
export function translate(lang: UiLang, text: string, vars?: Record<string, string | number>): string {
  let out = lang === 'nl' ? NL[text] ?? text : text;
  if (vars) for (const k of Object.keys(vars)) out = out.split(`{${k}}`).join(String(vars[k]));
  return out;
}

export function useT() {
  const lang = useStore((s) => s.settings.uiLanguage);
  return (text: string, vars?: Record<string, string | number>) => translate(lang, text, vars);
}

export function useLang(): UiLang {
  return useStore((s) => s.settings.uiLanguage);
}
