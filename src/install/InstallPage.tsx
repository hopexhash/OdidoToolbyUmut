import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, BookmarkPlus, Check, ChevronDown, ClipboardCopy, Lock, MousePointerClick, ScanSearch, ShieldCheck } from 'lucide-react';
import { buildBookmarklet, DEFAULT_DOMAINS, normalizeDomains } from '../shared/bookmarklet';

type Lang = 'en' | 'nl';
interface VersionInfo {
  version: string;
  builtAt: string;
}

const T = {
  en: {
    tagline: 'For ServiceNow',
    title: 'Your ServiceNow assistant, one click away.',
    intro: 'Open a ticket, click the bookmark, and the toolkit appears. It reads the ticket, writes your notes and the reply to the user, and puts them in the ticket for you.',
    f1: 'Finds the ticket by itself', f2: 'Uses your own login', f3: 'Never saves anything for you',
    s1: 'Where do you use ServiceNow?',
    s1help: 'Type the address of your ServiceNow, for example yourcompany.service-now.com. The bookmark does nothing on other websites.',
    wild: 'You will be asked once to allow your ServiceNow site.',
    s2: 'Add the bookmark',
    s2a: 'Show your bookmarks bar: press Ctrl + Shift + B (Mac: ⌘ + Shift + B).',
    s2b: 'Drag the blue button below onto the bookmarks bar.',
    s2c: 'Open a ticket in ServiceNow and click the bookmark.',
    drag: 'Drag me to your bookmarks bar',
    dontClick: 'Almost! Don’t click the button here — drag it to your bookmarks bar.',
    s3: 'Can’t drag? Add it by hand',
    edge: 'Microsoft Edge', chrome: 'Google Chrome',
    m1: 'Click “Copy bookmark code” below.',
    eM2: 'Press Ctrl + Shift + O and open “Favorites bar”.', eM3: 'Click ⋯ → “Add favorite”.',
    cM2: 'Press Ctrl + Shift + O and select “Bookmarks bar”.', cM3: 'Click ⋮ → “Add new bookmark”.',
    m4: 'Name: ITSM Toolkit. URL: paste with Ctrl + V. Save.',
    copy: 'Copy bookmark code', copied: 'Copied!',
    trouble: 'Something not working?',
    t1q: '“Could not be loaded”', t1a: 'Your ServiceNow blocks outside scripts. Ask your ServiceNow admin to install the toolkit as a UI Script (see below).',
    t2q: 'A field is empty', t2a: 'Fill it in yourself in the toolkit, or ask your admin to check Settings → ServiceNow → Field mapping.',
    t3q: 'Nothing happens when I click', t3a: 'Make sure you are on your ServiceNow site and that its address is filled in at step 1. Then add the bookmark again.',
    adv: 'For admins: install from your own ServiceNow (UI Script)',
    advText: 'Create a UI Script (System UI → UI Scripts, Global, Desktop) with the contents of toolkit.latest.js, then enter its name here. The bookmark will load the toolkit from your own instance.',
    advPh: 'UI Script name, e.g. itsm_toolkit',
    advNote: 'Updates then require your admin to update the UI Script.',
    safe: 'Safe by design',
    safeText: 'Runs only on your ServiceNow site · reads tickets with your own permissions · never saves or submits · no data leaves ServiceNow unless you turn on AI.',
    version: 'Version',
  },
  nl: {
    tagline: 'Voor ServiceNow',
    title: 'Je ServiceNow-assistent, met één klik.',
    intro: 'Open een ticket, klik op de bladwijzer en de toolkit verschijnt. Hij leest het ticket, schrijft je notities en de reactie aan de gebruiker, en zet ze voor je in het ticket.',
    f1: 'Vindt het ticket zelf', f2: 'Gebruikt je eigen login', f3: 'Slaat nooit iets voor je op',
    s1: 'Waar gebruik je ServiceNow?',
    s1help: 'Typ het adres van jouw ServiceNow, bijvoorbeeld jouwbedrijf.service-now.com. Op andere websites doet de bladwijzer niets.',
    wild: 'Je wordt één keer gevraagd om je ServiceNow-site toe te staan.',
    s2: 'Voeg de bladwijzer toe',
    s2a: 'Toon je bladwijzerbalk: druk op Ctrl + Shift + B (Mac: ⌘ + Shift + B).',
    s2b: 'Sleep de blauwe knop hieronder naar de bladwijzerbalk.',
    s2c: 'Open een ticket in ServiceNow en klik op de bladwijzer.',
    drag: 'Sleep mij naar je bladwijzerbalk',
    dontClick: 'Bijna! Klik hier niet op de knop — sleep hem naar je bladwijzerbalk.',
    s3: 'Lukt slepen niet? Voeg hem handmatig toe',
    edge: 'Microsoft Edge', chrome: 'Google Chrome',
    m1: 'Klik hieronder op “Bladwijzercode kopiëren”.',
    eM2: 'Druk op Ctrl + Shift + O en open “Favorietenbalk”.', eM3: 'Klik op ⋯ → “Favoriet toevoegen”.',
    cM2: 'Druk op Ctrl + Shift + O en kies “Bladwijzerbalk”.', cM3: 'Klik op ⋮ → “Nieuwe bladwijzer toevoegen”.',
    m4: 'Naam: ITSM Toolkit. URL: plakken met Ctrl + V. Opslaan.',
    copy: 'Bladwijzercode kopiëren', copied: 'Gekopieerd!',
    trouble: 'Werkt er iets niet?',
    t1q: '“Kon niet worden geladen”', t1a: 'Jouw ServiceNow blokkeert externe scripts. Vraag je ServiceNow-beheerder de toolkit als UI Script te installeren (zie hieronder).',
    t2q: 'Een veld is leeg', t2a: 'Vul het zelf in de toolkit in, of vraag je beheerder Instellingen → ServiceNow → Veldkoppeling te controleren.',
    t3q: 'Er gebeurt niets als ik klik', t3a: 'Controleer of je op je ServiceNow-site bent en of het adres bij stap 1 is ingevuld. Voeg de bladwijzer daarna opnieuw toe.',
    adv: 'Voor beheerders: installeren vanuit je eigen ServiceNow (UI Script)',
    advText: 'Maak een UI Script (System UI → UI Scripts, Global, Desktop) met de inhoud van toolkit.latest.js en vul hier de naam in. De bladwijzer laadt de toolkit dan vanuit je eigen omgeving.',
    advPh: 'Naam van het UI Script, bijv. itsm_toolkit',
    advNote: 'Updates vereisen dan dat je beheerder het UI Script bijwerkt.',
    safe: 'Veilig ontworpen',
    safeText: 'Werkt alleen op je ServiceNow-site · leest tickets met je eigen rechten · slaat nooit op en verstuurt niets · er gaat geen data buiten ServiceNow tenzij je AI aanzet.',
    version: 'Versie',
  },
};

function detectBase(): string {
  const p = new URLSearchParams(location.search).get('base');
  if (p) return p.endsWith('/') ? p : p + '/';
  return new URL('./', location.href).href;
}
const store = {
  get: (k: string, d: string) => {
    try {
      return localStorage.getItem(k) ?? d;
    } catch {
      return d;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
};

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-ink-200/70 bg-white p-7 shadow-card sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-[14px] font-semibold text-white">{n}</span>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function InstallPage() {
  const base = useMemo(detectBase, []);
  const [lang, setLang] = useState<Lang>(() => (store.get('itsmtk.install.lang', navigator.language.toLowerCase().startsWith('nl') ? 'nl' : 'en') as Lang));
  const L = T[lang];
  const [domainText, setDomainText] = useState(() => store.get('itsmtk.install.domains', DEFAULT_DOMAINS.join('\n')));
  const [uiScript, setUiScript] = useState(() => store.get('itsmtk.install.uiScript', ''));
  const domains = normalizeDomains(domainText.split(/[\n,]/));
  const code = useMemo(() => buildBookmarklet(base, domains, { uiScript }), [base, domains.join('|'), uiScript]);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState(false);
  const wildcardOnly = domains.length > 0 && domains.every((d) => d.startsWith('*.'));

  useEffect(() => {
    store.set('itsmtk.install.domains', domainText);
    store.set('itsmtk.install.uiScript', uiScript);
    store.set('itsmtk.install.lang', lang);
    document.documentElement.lang = lang;
  }, [domainText, uiScript, lang]);
  useEffect(() => {
    // React blocks javascript: URLs in JSX props, so set the href directly.
    linkRef.current?.setAttribute('href', code);
  }, [code]);
  useEffect(() => {
    fetch(`${base}version.json?t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setVersion)
      .catch(() => setVersion(null));
  }, [base]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen font-sans text-ink-900">
      <header className="sticky top-0 z-10 border-b border-ink-200/70 bg-ink-50/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ink-900 text-white">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </span>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold">ITSM Toolkit</div>
            <div className="text-[12px] text-ink-500">{L.tagline}</div>
          </div>
          <div className="flex-1" />
          <div role="radiogroup" aria-label="Language" className="flex rounded-xl bg-ink-100 p-1 text-[13px]">
            {(['nl', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={lang === l}
                onClick={() => setLang(l)}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${lang === l ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800'}`}
              >
                {l === 'nl' ? 'Nederlands' : 'English'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-5 pb-16 pt-14">
        <div className="max-w-2xl pb-4">
          <h1 className="text-[36px] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[44px]">{L.title}</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-600">{L.intro}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-[13px]">
            {[
              [<ScanSearch size={15} key="a" />, L.f1],
              [<Lock size={15} key="b" />, L.f2],
              [<ShieldCheck size={15} key="c" />, L.f3],
            ].map(([i, x]) => (
              <span key={x as string} className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3.5 py-2 font-medium text-ink-700">
                <span className="text-brand-600">{i}</span>
                {x}
              </span>
            ))}
          </div>
        </div>

        <Step n={1} title={L.s1}>
          <textarea
            value={domainText}
            onChange={(e) => setDomainText(e.target.value)}
            rows={2}
            aria-label={L.s1}
            className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-[14px] outline-none transition hover:border-ink-300 focus:border-brand-500 focus:shadow-focus"
            placeholder="yourcompany.service-now.com"
          />
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-500">{L.s1help}</p>
          {wildcardOnly && (
            <p className="mt-2 flex items-center gap-2 text-[13.5px] text-amber-700">
              <AlertTriangle size={15} /> {L.wild}
            </p>
          )}
        </Step>

        <Step n={2} title={L.s2}>
          <ol className="space-y-3 text-[14.5px] text-ink-700">
            {[L.s2a, L.s2b, L.s2c].map((x, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[12px] font-semibold text-ink-600">{String.fromCharCode(97 + i)}</span>
                {x}
              </li>
            ))}
          </ol>
          <div className="mt-7 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-300 bg-ink-50 px-6 py-8">
            <a
              ref={linkRef}
              draggable
              onClick={(e) => {
                e.preventDefault();
                setHint(true);
              }}
              title={L.drag}
              className="inline-flex cursor-grab items-center gap-2.5 rounded-2xl bg-brand-600 px-7 py-4 text-[16px] font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:-translate-y-0.5 hover:bg-brand-700 active:cursor-grabbing"
            >
              <BookmarkPlus size={20} /> ITSM Toolkit
            </a>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink-500">
              <MousePointerClick size={15} /> {L.drag}
            </span>
          </div>
          {hint && <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-[14px] text-brand-800">{L.dontClick}</p>}
        </Step>

        <details className="group rounded-3xl border border-ink-200/70 bg-white shadow-card">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-7 text-[16px] font-semibold">
            {L.s3}
            <span className="flex-1" />
            <ChevronDown size={18} className="text-ink-400 transition group-open:rotate-180" />
          </summary>
          <div className="px-7 pb-7">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                [L.edge, [L.m1, L.eM2, L.eM3, L.m4]],
                [L.chrome, [L.m1, L.cM2, L.cM3, L.m4]],
              ].map(([name, steps]) => (
                <div key={name as string} className="rounded-2xl bg-ink-50 p-5">
                  <div className="mb-3 text-[14.5px] font-semibold">{name as string}</div>
                  <ol className="list-decimal space-y-1.5 pl-5 text-[13.5px] text-ink-700">
                    {(steps as string[]).map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            <button type="button" onClick={copy} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-ink-900 px-5 text-[14px] font-medium text-white transition hover:bg-ink-800">
              {copied ? <Check size={16} /> : <ClipboardCopy size={16} />}
              {copied ? L.copied : L.copy}
            </button>
          </div>
        </details>

        <details className="group rounded-3xl border border-ink-200/70 bg-white shadow-card">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-7 text-[16px] font-semibold">
            {L.trouble}
            <span className="flex-1" />
            <ChevronDown size={18} className="text-ink-400 transition group-open:rotate-180" />
          </summary>
          <div className="space-y-4 px-7 pb-7 text-[14px]">
            {[
              [L.t1q, L.t1a],
              [L.t2q, L.t2a],
              [L.t3q, L.t3a],
            ].map(([q, a]) => (
              <div key={q}>
                <div className="font-semibold">{q}</div>
                <p className="mt-0.5 leading-relaxed text-ink-600">{a}</p>
              </div>
            ))}
            <div className="rounded-2xl bg-ink-50 p-5">
              <div className="font-semibold">{L.adv}</div>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">
                {L.advText}{' '}
                <a className="font-medium text-brand-600 underline" href={`${base}toolkit/toolkit.latest.js`} target="_blank" rel="noreferrer">
                  toolkit.latest.js
                </a>
              </p>
              <input
                value={uiScript}
                onChange={(e) => setUiScript(e.target.value.trim())}
                placeholder={L.advPh}
                className="mt-3 h-11 w-full max-w-sm rounded-xl border border-ink-200 bg-white px-4 text-[14px] outline-none focus:border-brand-500 focus:shadow-focus"
              />
              {uiScript && <p className="mt-2 text-[13px] text-amber-700">{L.advNote}</p>}
            </div>
          </div>
        </details>

        <div className="flex items-start gap-3 rounded-3xl bg-ink-900 p-7 text-white">
          <ShieldCheck size={22} className="mt-0.5 shrink-0 text-emerald-400" />
          <div>
            <div className="text-[15px] font-semibold">{L.safe}</div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-white/70">{L.safeText}</p>
          </div>
        </div>

        <footer className="pt-4 text-center text-[12.5px] text-ink-400">
          ITSM Toolkit {version ? `· ${L.version} ${version.version}` : ''}
        </footer>
      </main>
    </div>
  );
}
