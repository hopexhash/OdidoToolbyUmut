import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle, BookmarkPlus, CheckCircle2, ChevronRight, ClipboardCopy, Globe, Lock, MousePointerClick, ScanSearch, ShieldCheck, Wrench,
} from 'lucide-react';
import { buildBookmarklet, DEFAULT_DOMAINS, normalizeDomains, BOOKMARKLET_PROTOCOL } from '../shared/bookmarklet';

interface VersionInfo {
  version: string;
  file: string;
  builtAt: string;
}

function detectBase(): string {
  const p = new URLSearchParams(location.search).get('base');
  if (p) return p.endsWith('/') ? p : p + '/';
  return new URL('./', location.href).href;
}

function Section({ n, title, children }: { n?: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card dark:border-ink-800 dark:bg-ink-900">
      <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold">
        {n && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-sm text-white">{n}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function InstallPage() {
  const base = useMemo(detectBase, []);
  const [domainText, setDomainText] = useState(() => localStorage.getItem('itsmtk.install.domains') || DEFAULT_DOMAINS.join('\n'));
  const domains = normalizeDomains(domainText.split(/[\n,]/));
  const [uiScript, setUiScript] = useState(() => localStorage.getItem('itsmtk.install.uiScript') || '');
  const code = useMemo(() => buildBookmarklet(base, domains, { uiScript }), [base, domains.join('|'), uiScript]);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState(false);
  const wildcardOnly = domains.length > 0 && domains.every((d) => d.startsWith('*.'));

  useEffect(() => {
    localStorage.setItem('itsmtk.install.domains', domainText);
    localStorage.setItem('itsmtk.install.uiScript', uiScript);
  }, [domainText, uiScript]);
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
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen text-ink-900 dark:text-ink-100">
      <header className="border-b border-ink-200 bg-white/80 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-violet-600 text-white shadow-md shadow-brand-600/30">
            <Wrench size={18} />
          </span>
          <div>
            <div className="text-[15px] font-semibold tracking-tight">ITSM Toolkit</div>
            <div className="text-xs text-ink-500">ServiceNow productivity overlay</div>
          </div>
          <div className="flex-1" />
          <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            {version ? `v${version.version}` : 'version unknown'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your ServiceNow toolkit, one click away.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-600 dark:text-ink-300">
            A bookmarklet — no browser extension needed. Open a ticket in ServiceNow, click the bookmark, and a floating toolkit appears that reads
            the ticket, generates work notes and customer comments, and fills them into the ticket for you to review and save.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {[
              [<ScanSearch size={13} key="a" />, 'Auto-detects the open ticket'],
              [<Lock size={13} key="b" />, 'Uses your own ServiceNow session'],
              [<ShieldCheck size={13} key="c" />, 'Never saves or submits tickets'],
            ].map(([i, t]) => (
              <span key={t as string} className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 font-medium dark:border-ink-700 dark:bg-ink-900">
                {i}
                {t}
              </span>
            ))}
          </div>
        </div>

        <Section n={1} title="Which ServiceNow instances may it run on?">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">Domains (one per line)</label>
          <textarea
            value={domainText}
            onChange={(e) => setDomainText(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-850"
            placeholder="yourcompany.service-now.com"
          />
          <p className="mt-2 text-[13px] text-ink-500">
            Use the exact instance host (e.g. <code className="rounded bg-ink-100 px-1 dark:bg-ink-800">yourcompany.service-now.com</code>) for zero prompts.
            Wildcards such as <code className="rounded bg-ink-100 px-1 dark:bg-ink-800">*.service-now.com</code> work too, but the toolkit will ask you once to authorize each instance.
            On any other website the bookmarklet does nothing.
          </p>
          {wildcardOnly && (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-amber-700 dark:text-amber-400">
              <AlertTriangle size={14} /> Only wildcards configured — you will be asked to authorize your instance on first use.
            </p>
          )}
        </Section>

        <Section n={2} title="Install the bookmarklet">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="flex flex-col items-center gap-2">
              <a
                ref={linkRef}
                draggable
                onClick={(e) => {
                  e.preventDefault();
                  setHint(true);
                }}
                className="group inline-flex cursor-grab items-center gap-2.5 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 px-6 py-3.5 text-[15px] font-bold tracking-wide text-white shadow-lg shadow-brand-600/30 transition hover:scale-[1.02] active:cursor-grabbing"
                title="Drag me to your bookmarks bar"
              >
                <BookmarkPlus size={19} /> ITSM Toolkit
              </a>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Install bookmarklet — drag me ↑</span>
            </div>
            <ol className="flex-1 space-y-2 text-[14px] text-ink-700 dark:text-ink-300">
              <li className="flex gap-2">
                <ChevronRight size={16} className="mt-0.5 shrink-0 text-brand-600" />
                Show the bookmarks bar: <kbd className="rounded border border-ink-300 px-1.5 text-xs dark:border-ink-600">Ctrl</kbd>+
                <kbd className="rounded border border-ink-300 px-1.5 text-xs dark:border-ink-600">Shift</kbd>+
                <kbd className="rounded border border-ink-300 px-1.5 text-xs dark:border-ink-600">B</kbd> (Mac: ⌘+Shift+B).
              </li>
              <li className="flex gap-2">
                <ChevronRight size={16} className="mt-0.5 shrink-0 text-brand-600" />
                Drag the <b>ITSM Toolkit</b> button onto the bookmarks bar.
              </li>
              <li className="flex gap-2">
                <ChevronRight size={16} className="mt-0.5 shrink-0 text-brand-600" />
                Open a ticket in ServiceNow and click the bookmark.
              </li>
            </ol>
          </div>
          {hint && (
            <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-[13px] text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
              Don’t click it here — drag it to your bookmarks bar, then click it while you are on a ServiceNow ticket.
            </p>
          )}
        </Section>

        <div className="grid gap-6 md:grid-cols-2">
          <Section title="Manual install — Microsoft Edge">
            <ol className="list-decimal space-y-1.5 pl-5 text-[14px] text-ink-700 dark:text-ink-300">
              <li>Click <b>Copy bookmarklet code</b> below.</li>
              <li>Press <b>Ctrl+Shift+O</b> to open Favorites.</li>
              <li>Open the <b>Favorites bar</b> folder, click <b>⋯ → Add favorite</b>.</li>
              <li>Name: <b>ITSM Toolkit</b>. URL: paste the code (Ctrl+V). Save.</li>
            </ol>
          </Section>
          <Section title="Manual install — Google Chrome">
            <ol className="list-decimal space-y-1.5 pl-5 text-[14px] text-ink-700 dark:text-ink-300">
              <li>Click <b>Copy bookmarklet code</b> below.</li>
              <li>Press <b>Ctrl+Shift+O</b> to open the Bookmark manager.</li>
              <li>Select <b>Bookmarks bar</b>, click <b>⋮ → Add new bookmark</b>.</li>
              <li>Name: <b>ITSM Toolkit</b>. URL: paste the code (Ctrl+V). Save.</li>
            </ol>
          </Section>
        </div>

        <Section title="Bookmarklet code">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
            >
              {copied ? <CheckCircle2 size={15} /> : <ClipboardCopy size={15} />}
              {copied ? 'Copied' : 'Copy bookmarklet code'}
            </button>
            <span className="text-xs text-ink-500">
              {code.length} characters · protocol v{BOOKMARKLET_PROTOCOL} · loads from <code>{base}</code>
            </span>
          </div>
          <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-ink-100 p-3 font-mono text-[11px] text-ink-600 dark:bg-ink-850 dark:text-ink-400">{code}</pre>
        </Section>

        <Section title="Advanced: instance blocks external scripts (CSP)">
          <p className="text-[13.5px] text-ink-700 dark:text-ink-300">
            If clicking the bookmark shows “could not be loaded”, your ServiceNow instance’s Content-Security-Policy blocks scripts from this host.
            Ask a ServiceNow admin to create a <b>UI Script</b> (System UI → UI Scripts, Global, UI type: Desktop) whose script is the contents of{' '}
            <a className="text-brand-600 underline" href={`${base}toolkit/toolkit.latest.js`} target="_blank" rel="noreferrer">toolkit.latest.js</a>, then enter its
            API name here. The bookmarklet will load it from your own instance.
          </p>
          <div className="mt-3 flex max-w-md items-center gap-2">
            <input
              value={uiScript}
              onChange={(e) => setUiScript(e.target.value.trim())}
              placeholder="UI Script name, e.g. itsm_toolkit (leave empty for normal mode)"
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-850"
            />
          </div>
          {uiScript && <p className="mt-2 text-[13px] text-amber-700 dark:text-amber-400">Self-hosted mode: updates require the admin to update the UI Script.</p>}
        </Section>

        <div className="grid gap-6 md:grid-cols-3">
          <Section title="How it works">
            <ul className="space-y-2 text-[13.5px] text-ink-700 dark:text-ink-300">
              <li className="flex gap-2"><MousePointerClick size={15} className="mt-0.5 shrink-0 text-brand-600" />The small bookmarklet checks the domain and loads <code>loader.js</code>.</li>
              <li className="flex gap-2"><Globe size={15} className="mt-0.5 shrink-0 text-brand-600" />The loader always fetches the latest versioned bundle — you never need to reinstall for updates.</li>
              <li className="flex gap-2"><ScanSearch size={15} className="mt-0.5 shrink-0 text-brand-600" />The toolkit reads the ticket via GlideForm, the REST API (your session) or configured selectors.</li>
            </ul>
          </Section>
          <Section title="Security & privacy">
            <ul className="space-y-2 text-[13.5px] text-ink-700 dark:text-ink-300">
              <li>Runs only on the domains you configured.</li>
              <li>Read-only REST calls to the same instance, subject to your ACLs.</li>
              <li>No passwords collected. Tickets are never saved automatically.</li>
              <li>No ticket data leaves ServiceNow unless you enable AI.</li>
            </ul>
          </Section>
          <Section title="Troubleshooting">
            <ul className="space-y-2 text-[13.5px] text-ink-700 dark:text-ink-300">
              <li><b>“could not be loaded”</b> — your instance’s Content-Security-Policy blocks external scripts. See the README for the UI Script fallback.</li>
              <li><b>REST access denied</b> — fields come from the page instead; configure mappings in Settings.</li>
              <li><b>Field missing</b> — Settings → Field mapping.</li>
            </ul>
          </Section>
        </div>

        <footer className="pb-6 pt-2 text-center text-xs text-ink-400">
          ITSM Toolkit {version ? `v${version.version} · built ${new Date(version.builtAt).toLocaleString()}` : ''}
        </footer>
      </main>
    </div>
  );
}
