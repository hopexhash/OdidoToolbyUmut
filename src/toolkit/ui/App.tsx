import { useEffect, useMemo, useState } from 'react';
import {
  Boxes, ClipboardList, History, Lightbulb, Maximize2, Minimize2, Minus, Moon, PhoneCall, RefreshCw, Settings as SettingsIcon, Sun,
  Ticket, X, Truck, CheckCircle2, AlertTriangle, Info,
} from 'lucide-react';
import { getBoot, VERSION } from '../boot';
import { hostAllowed } from '../core/settings';
import { quickSignature } from '../core/sn/context';
import { useDerived, useStore, type TabId } from '../state/store';
import { Badge, cx, IconButton, Logo, ProgressRing } from './components/ui';
import { FloatingWindow } from './FloatingWindow';
import { OutputPanel } from './OutputPanel';
import { AuthorizeScreen } from './AuthorizeScreen';
import { visibility } from './visibility';
import { TicketTab } from './tabs/TicketTab';
import { ContactTab } from './tabs/ContactTab';
import { UpdateTab } from './tabs/UpdateTab';
import { RecentTab } from './tabs/RecentTab';
import { AdviceTab } from './tabs/AdviceTab';
import { AssetsTab } from './tabs/AssetsTab';
import { HardwareTab } from './tabs/HardwareTab';
import { SettingsTab } from './tabs/SettingsTab';

const TABS: { id: TabId; label: string; icon: JSX.Element }[] = [
  { id: 'ticket', label: 'Ticket', icon: <Ticket size={15} /> },
  { id: 'contact', label: 'Contact & Follow-up', icon: <PhoneCall size={15} /> },
  { id: 'update', label: 'Update Details', icon: <ClipboardList size={15} /> },
  { id: 'recent', label: 'Recent', icon: <History size={15} /> },
  { id: 'advice', label: 'Advice', icon: <Lightbulb size={15} /> },
  { id: 'assets', label: 'Assets', icon: <Boxes size={15} /> },
  { id: 'hardware', label: 'Hardware & POD', icon: <Truck size={15} /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon size={15} /> },
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

/** Watches for ticket navigation (Workspace tabs, Polaris iframe, classic) and rescans. */
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

export function App() {
  const dark = useDarkMode();
  const authorized = useAuthorized();
  const [visible, setVisible] = useState(visibility.get());
  useEffect(() => {
    const u = visibility.subscribe(setVisible);
    return () => {
      u();
    };
  }, []);
  useAutoRescan(authorized);

  if (!visible) return null;
  return (
    <div className={cx(dark && 'tk-dark')}>
     <div className="tk-root font-sans text-ink-900 dark:text-ink-100">
      <FloatingWindow minimizedView={(c) => <MiniBar controls={c} />}>
        {(c) => (
          <>
            <Header controls={c} authorized={authorized} />
            {authorized ? <Body width={c.width} /> : <AuthorizeScreen />}
          </>
        )}
      </FloatingWindow>
      <Toasts />
     </div>
    </div>
  );
}

function MiniBar({ controls }: { controls: import('./FloatingWindow').WindowControls }) {
  const snap = useStore((s) => s.snapshot);
  const { completion } = useDerived();
  return (
    <div
      {...controls.dragHandleProps}
      className="flex w-[340px] cursor-grab items-center gap-2.5 rounded-xl border border-ink-200 bg-white/95 px-2.5 py-2 shadow-window backdrop-blur dark:border-ink-700 dark:bg-ink-900/95"
    >
      <Logo size={24} />
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold">ITSM Toolkit</div>
        <div className="truncate text-[11px] text-ink-500">{snap?.fields.number?.display || 'No ticket'}</div>
      </div>
      <ProgressRing pct={completion.pct} size={26} />
      <IconButton label="Restore" onClick={controls.toggleMin}>
        <Maximize2 size={14} />
      </IconButton>
      <IconButton label="Close" onClick={() => visibility.set(false)}>
        <X size={15} />
      </IconButton>
    </div>
  );
}

function Header({ controls, authorized }: { controls: import('./FloatingWindow').WindowControls; authorized: boolean }) {
  const { snapshot, scanning, rescan, updateSettings } = useStore();
  const { completion } = useDerived();
  const boot = getBoot();
  const number = snapshot?.fields.number?.display;
  const dark = useDarkMode();
  return (
    <div
      {...controls.dragHandleProps}
      className="flex h-12 shrink-0 cursor-grab items-center gap-3 border-b border-ink-200/80 bg-white px-3 active:cursor-grabbing dark:border-ink-800 dark:bg-ink-900"
    >
      <Logo />
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="whitespace-nowrap text-[14px] font-semibold tracking-tight">ITSM Toolkit</span>
        <span className="text-[11px] font-medium text-ink-400">v{VERSION}</span>
      </div>
      {authorized && (
        <div className="ml-1 flex min-w-0 items-center gap-2">
          {number ? (
            <Badge color="blue" className="!text-[12px]">
              <Ticket size={12} /> {number}
            </Badge>
          ) : (
            <Badge color="amber">No ticket detected</Badge>
          )}
          {snapshot && <span className="hidden truncate text-[11px] text-ink-400 md:inline">{kindLabel(snapshot.kind)}</span>}
        </div>
      )}
      <div className="flex-1" />
      {boot.bookmarkletOutdated && <Badge color="amber">Bookmarklet update available</Badge>}
      {authorized && (
        <div className="flex items-center gap-1.5" title={completion.missing.length ? `Missing: ${completion.missing.join(', ')}` : 'Complete'}>
          <ProgressRing pct={completion.pct} />
          <span className="hidden text-[11px] font-medium text-ink-500 sm:inline">complete</span>
        </div>
      )}
      <div className="ml-1 flex items-center gap-0.5">
        {authorized && (
          <IconButton label="Rescan ticket" onClick={() => rescan()}>
            <RefreshCw size={15} className={cx(scanning && 'animate-spin')} />
          </IconButton>
        )}
        <IconButton label="Toggle theme" onClick={() => updateSettings({ theme: dark ? 'light' : 'dark' })}>
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </IconButton>
        <IconButton label="Minimize" onClick={controls.toggleMin}>
          <Minus size={16} />
        </IconButton>
        <IconButton label={controls.maximized ? 'Restore' : 'Maximize'} onClick={controls.toggleMax}>
          {controls.maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </IconButton>
        <IconButton label="Close (click the bookmark to reopen)" onClick={() => visibility.set(false)} className="hover:!bg-rose-500 hover:!text-white">
          <X size={16} />
        </IconButton>
      </div>
    </div>
  );
}

function kindLabel(k: string) {
  return { classic: 'Classic UI', 'next-experience': 'Next Experience', workspace: 'Workspace', portal: 'Service Portal', unknown: 'ServiceNow' }[k] || k;
}

function Body({ width }: { width: number }) {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const wide = width >= 900;
  const content = {
    ticket: <TicketTab />,
    contact: <ContactTab />,
    update: <UpdateTab />,
    recent: <RecentTab />,
    advice: <AdviceTab />,
    assets: <AssetsTab />,
    hardware: <HardwareTab />,
    settings: <SettingsTab />,
  }[tab];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-ink-200/80 bg-white px-2 dark:border-ink-800 dark:bg-ink-900" data-nodrag>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cx(
              'relative flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-md px-2.5 text-[12.5px] font-medium transition',
              tab === t.id ? 'text-brand-700 dark:text-brand-300' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100',
            )}
          >
            {t.icon}
            {t.label}
            {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600 dark:bg-brand-400" />}
          </button>
        ))}
      </nav>
      <div className={cx('flex min-h-0 flex-1', wide ? 'flex-row' : 'flex-col')}>
        <main key={tab} className="min-h-0 flex-1 animate-tk-fade overflow-y-auto p-4">
          {content}
        </main>
        <OutputPanel wide={wide} />
      </div>
    </div>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={cx(
            'pointer-events-auto flex max-w-[560px] animate-tk-pop cursor-pointer items-start gap-2 rounded-xl px-3.5 py-2.5 text-[13px] text-white shadow-window',
            t.kind === 'success' ? 'bg-emerald-600' : t.kind === 'error' ? 'bg-rose-600' : 'bg-ink-800',
          )}
        >
          <span className="mt-0.5">
            {t.kind === 'success' ? <CheckCircle2 size={15} /> : t.kind === 'error' ? <AlertTriangle size={15} /> : <Info size={15} />}
          </span>
          {t.text}
        </div>
      ))}
    </div>
  );
}

