import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Check, CheckCircle2, ClipboardPen, FileText, Info, Maximize2, Minimize2, Minus, PhoneCall, RefreshCw,
  Settings as SettingsIcon, Sparkles, Ticket, X,
} from 'lucide-react';
import { getBoot, VERSION } from '../boot';
import { useT } from '../i18n';
import { hostAllowed } from '../core/settings';
import { quickSignature } from '../core/sn/context';
import { useDerived, useStore, type TabId } from '../state/store';
import { Badge, cx, IconButton, Logo, ProgressRing, Tooltip } from './components/ui';
import { FloatingWindow, type WindowControls } from './FloatingWindow';
import { OutputPanel } from './OutputPanel';
import { AuthorizeScreen } from './AuthorizeScreen';
import { visibility } from './visibility';
import { TicketTab } from './tabs/TicketTab';
import { ContactTab } from './tabs/ContactTab';
import { UpdateTab } from './tabs/UpdateTab';
import { TemplatesTab } from './tabs/TemplatesTab';
import { AssistantTab } from './tabs/AssistantTab';
import { SettingsTab } from './tabs/SettingsTab';

const NAV: { id: TabId; label: string; icon: (s: number) => JSX.Element }[] = [
  { id: 'ticket', label: 'Ticket', icon: (s) => <Ticket size={s} /> },
  { id: 'contact', label: 'Contact User', icon: (s) => <PhoneCall size={s} /> },
  { id: 'update', label: 'Update Ticket', icon: (s) => <ClipboardPen size={s} /> },
  { id: 'templates', label: 'Templates', icon: (s) => <FileText size={s} /> },
  { id: 'assistant', label: 'AI Assistant', icon: (s) => <Sparkles size={s} /> },
  { id: 'settings', label: 'Settings', icon: (s) => <SettingsIcon size={s} /> },
];

function useDarkMode() {
  const theme = useStore((s) => s.settings.theme);
  const [sysDark, setSysDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const h = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener?.('change', h);
    return () => mq.removeEventListener?.('change', h);
  }, []);
  return theme === 'dark' || (theme === 'system' && sysDark);
}

function useAuthorized() {
  const allowed = useStore((s) => s.settings.allowedDomains);
  return useMemo(() => {
    const boot = getBoot();
    const explicit = [...boot.domains.filter((d) => !d.trim().startsWith('*')), ...allowed];
    return hostAllowed(location.hostname, explicit);
  }, [allowed]);
}

/** Watches for ticket navigation (Workspace tabs, Next Experience iframe, classic) and rescans. */
function useAutoRescan(enabled: boolean) {
  const rescan = useStore((s) => s.rescan);
  const auto = useStore((s) => s.settings.autoRescan);
  useEffect(() => {
    if (!enabled) return;
    rescan();
    if (!auto) return;
    let last = quickSignature();
    let timer: number | undefined;
    const iv = window.setInterval(() => {
      const sig = quickSignature();
      if (sig !== last) {
        last = sig;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => rescan(), 900);
      }
    }, 1500);
    const unsub = visibility.subscribe((v) => v && rescan());
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(timer);
      unsub();
    };
  }, [enabled, auto, rescan]);
}

/** open → closing (exit animation) → closed */
function useOpenState() {
  const [phase, setPhase] = useState<'open' | 'closing' | 'closed'>(visibility.get() ? 'open' : 'closed');
  useEffect(() => {
    let t: number | undefined;
    const u = visibility.subscribe((v) => {
      window.clearTimeout(t);
      if (v) setPhase('open');
      else {
        setPhase('closing');
        t = window.setTimeout(() => setPhase('closed'), 170);
      }
    });
    return () => {
      u();
      window.clearTimeout(t);
    };
  }, []);
  return phase;
}

export function App() {
  const dark = useDarkMode();
  const authorized = useAuthorized();
  const phase = useOpenState();
  useAutoRescan(authorized);

  if (phase === 'closed') return null;
  return (
    <div className={cx(dark && 'tk-dark')}>
      <div className="tk-root font-sans text-ink-900 dark:text-ink-100">
        <FloatingWindow closing={phase === 'closing'} minimizedView={(c) => <MiniBar controls={c} />}>
          {(c) => (
            <>
              <Header controls={c} authorized={authorized} />
              {authorized ? <Body width={c.width} /> : <AuthorizeScreen />}
              <Toasts />
            </>
          )}
        </FloatingWindow>
      </div>
    </div>
  );
}

function MiniBar({ controls }: { controls: WindowControls }) {
  const t = useT();
  const snap = useStore((s) => s.snapshot);
  const { completion } = useDerived();
  return (
    <div
      {...controls.dragHandleProps}
      className="flex w-[340px] cursor-grab items-center gap-3 rounded-2xl border border-ink-200/80 bg-white/95 py-2.5 pl-3 pr-2 shadow-window backdrop-blur active:cursor-grabbing dark:border-ink-700 dark:bg-ink-900/95"
    >
      <Logo size={30} />
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold">ITSM Toolkit</div>
        <div className="truncate text-[12px] text-ink-500">{snap?.fields.number?.display || t('No ticket detected')}</div>
      </div>
      <ProgressRing pct={completion.pct} />
      <IconButton label={t('Restore window')} onClick={controls.toggleMin} tipSide="top">
        <Maximize2 size={15} />
      </IconButton>
      <IconButton label={t('Close')} onClick={() => visibility.set(false)} tipSide="top" tipAlign="right">
        <X size={17} />
      </IconButton>
    </div>
  );
}

function Header({ controls, authorized }: { controls: WindowControls; authorized: boolean }) {
  const t = useT();
  const { snapshot, scanning, rescan } = useStore();
  const { completion } = useDerived();
  const boot = getBoot();
  const number = snapshot?.fields.number?.display;
  return (
    <div
      {...controls.dragHandleProps}
      className="flex h-[60px] shrink-0 cursor-grab select-none items-center gap-3 border-b border-ink-200/70 bg-white px-4 active:cursor-grabbing dark:border-ink-800 dark:bg-ink-900"
    >
      <Logo />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="whitespace-nowrap text-[15px] font-semibold tracking-[-0.01em]">ITSM Toolkit</span>
        <span className="text-[11.5px] text-ink-400">{t('Version')} {VERSION}</span>
      </div>
      {authorized && (
        <div className="ml-3 hidden min-w-0 items-center gap-2 sm:flex">
          {number ? (
            <Badge tone="blue" icon={<Ticket size={13} />} className="!px-3 !py-1 !text-[13px]">
              {number}
            </Badge>
          ) : (
            <Badge tone="amber" icon={<AlertTriangle size={13} />}>
              {t('No ticket detected')}
            </Badge>
          )}
        </div>
      )}
      <div className="flex-1" />
      {boot.bookmarkletOutdated && (
        <Badge tone="amber" icon={<Info size={13} />}>
          {t('Bookmark update available')}
        </Badge>
      )}
      {authorized && (
        <Tooltip label={completion.missing.length ? `${t('Still to do')}: ${completion.missing.map((m) => t(m)).join(', ')}` : t('Everything is filled in')} align="right">
          <span className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-ink-50 dark:hover:bg-ink-850" tabIndex={0}>
            <ProgressRing pct={completion.pct} />
            <span className="hidden text-[12.5px] font-medium text-ink-600 md:inline dark:text-ink-300">{t('complete')}</span>
          </span>
        </Tooltip>
      )}
      <div className="flex items-center gap-0.5">
        {authorized && (
          <IconButton label={t('Read the ticket again')} onClick={() => rescan()}>
            <RefreshCw size={17} className={cx(scanning && 'animate-spin')} />
          </IconButton>
        )}
        <IconButton label={t('Minimize')} onClick={controls.toggleMin}>
          <Minus size={18} />
        </IconButton>
        <IconButton label={controls.maximized ? t('Restore window') : t('Maximize')} onClick={controls.toggleMax}>
          {controls.maximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </IconButton>
        <IconButton label={t('Close (click the bookmark to reopen)')} tipAlign="right" onClick={() => visibility.set(false)} className="hover:!bg-rose-50 hover:!text-rose-600 dark:hover:!bg-rose-500/15">
          <X size={19} />
        </IconButton>
      </div>
    </div>
  );
}

function Stepper({ compact }: { compact: boolean }) {
  const t = useT();
  const { steps } = useDerived();
  const setTab = useStore((s) => s.setTab);
  const pulse = useStore((s) => s.pulseOutput);
  const tab = useStore((s) => s.tab);
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-ink-200/70 bg-white/60 px-4 py-2.5 dark:border-ink-800 dark:bg-ink-900/60">
      <ol className="flex min-w-0 flex-1 items-center gap-1">
        {steps.map((s, i) => {
          const current = s === next;
          const active = s.tab === tab;
          return (
            <li key={s.id} className="flex min-w-0 items-center">
              <button
                type="button"
                onClick={() => (s.tab ? setTab(s.tab) : pulse())}
                aria-current={current ? 'step' : undefined}
                title={`${t('Step')} ${s.id}: ${t(s.label)}`}
                className={cx(
                  'flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-[12.5px] font-medium transition duration-150',
                  active ? 'bg-ink-100 dark:bg-ink-800' : 'hover:bg-ink-100/70 dark:hover:bg-ink-850',
                  s.done ? 'text-ink-800 dark:text-ink-100' : current ? 'text-ink-900 dark:text-white' : 'text-ink-400',
                )}
              >
                <span
                  className={cx(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold transition duration-300',
                    s.done ? 'bg-emerald-600 text-white' : current ? 'bg-brand-600 text-white' : 'border border-ink-200 bg-white text-ink-400 dark:border-ink-700 dark:bg-ink-850',
                  )}
                >
                  {s.done ? <Check size={13} strokeWidth={3} /> : s.id}
                </span>
                {(!compact || current) && <span className="truncate">{t(s.label)}</span>}
              </button>
              {i < steps.length - 1 && <span className={cx('mx-0.5 h-px w-3 shrink-0', s.done ? 'bg-emerald-300' : 'bg-ink-200 dark:bg-ink-700')} />}
            </li>
          );
        })}
      </ol>
      <span className="ml-2 hidden shrink-0 text-[12px] font-medium text-ink-500 lg:inline">{t('{n} of 6 done', { n: done })}</span>
    </div>
  );
}

function Body({ width }: { width: number }) {
  const t = useT();
  const lang = useStore((s) => s.settings.uiLanguage);
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const showOutputSide = width >= 1000;
  const labels = width >= 860;
  const content = {
    ticket: <TicketTab />,
    contact: <ContactTab />,
    update: <UpdateTab />,
    templates: <TemplatesTab />,
    assistant: <AssistantTab />,
    settings: <SettingsTab />,
  }[tab];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Stepper compact={width < (lang === 'nl' ? 1320 : 1100)} />
      <div className="flex min-h-0 flex-1">
        <nav
          aria-label={t('Sections')}
          className={cx('flex shrink-0 flex-col gap-1 border-r border-ink-200/70 bg-ink-50/60 p-3 dark:border-ink-800 dark:bg-ink-950', labels ? 'w-[216px]' : 'w-[68px] items-center')}
          data-nodrag
        >
          {NAV.map((n) => {
            const on = tab === n.id;
            const btn = (
              <button
                key={n.id}
                type="button"
                onClick={() => setTab(n.id)}
                aria-current={on ? 'page' : undefined}
                aria-label={t(n.label)}
                className={cx(
                  'group flex h-11 items-center gap-3 rounded-xl text-[13.5px] font-medium transition duration-150',
                  labels ? 'w-full px-3' : 'w-11 justify-center',
                  on
                    ? 'bg-white text-ink-900 shadow-card ring-1 ring-ink-200/70 dark:bg-ink-850 dark:text-white dark:ring-ink-700'
                    : 'text-ink-600 hover:bg-white/70 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-900 dark:hover:text-white',
                  n.id === 'settings' && 'mt-auto',
                )}
              >
                <span className={cx('transition', on ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400 group-hover:text-ink-600')}>{n.icon(19)}</span>
                {labels && <span className="truncate">{t(n.label)}</span>}
              </button>
            );
            return labels ? (
              btn
            ) : (
              <span key={n.id} className={cx(n.id === 'settings' && 'mt-auto')}>
                <Tooltip label={t(n.label)} side="right">
                  {btn}
                </Tooltip>
              </span>
            );
          })}
        </nav>
        <div className={cx('flex min-h-0 min-w-0 flex-1', showOutputSide ? 'flex-row' : 'flex-col')}>
          <main key={tab} className="min-h-0 min-w-0 flex-1 animate-tk-rise overflow-y-auto bg-ink-50 px-7 py-6 dark:bg-ink-950">
            <div className="mx-auto max-w-[760px]">{content}</div>
          </main>
          <OutputPanel side={showOutputSide} />
        </div>
      </div>
    </div>
  );
}

function Toasts() {
  const t = useT();
  const { toasts, dismissToast } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none absolute right-4 top-[72px] z-50 flex w-[360px] max-w-[calc(100%-32px)] flex-col gap-2.5" aria-live="polite">
      {toasts.map((x) => (
        <div
          key={x.id}
          className="pointer-events-auto flex animate-tk-drop items-start gap-3 rounded-2xl border border-ink-200/80 bg-white/95 p-4 shadow-window backdrop-blur dark:border-ink-700 dark:bg-ink-900"
          role={x.kind === 'error' ? 'alert' : 'status'}
        >
          <span
            className={cx(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              x.kind === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15' : x.kind === 'error' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/15',
            )}
          >
            {x.kind === 'success' ? <CheckCircle2 size={18} /> : x.kind === 'error' ? <AlertTriangle size={18} /> : <Info size={18} />}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="text-[13.5px] font-semibold text-ink-900 dark:text-white">{t(x.title)}</div>
            {x.text && <div className="mt-0.5 text-[12.5px] leading-snug text-ink-600 dark:text-ink-300">{t(x.text)}</div>}
          </div>
          <button type="button" aria-label={t('Dismiss')} onClick={() => dismissToast(x.id)} className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}


