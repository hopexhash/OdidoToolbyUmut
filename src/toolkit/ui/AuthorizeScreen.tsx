import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { useMemo } from 'react';
import { detectContext } from '../core/sn/context';
import { useStore } from '../state/store';
import { Button } from './components/ui';
import { visibility } from './visibility';

/**
 * Shown when the toolkit was launched on a host that is only covered by a
 * wildcard (e.g. *.service-now.com). The technician explicitly authorizes the
 * exact instance once; nothing is read from the page before that.
 */
export function AuthorizeScreen() {
  const { settings, updateSettings } = useStore();
  const host = location.hostname;
  const looksLikeSn = useMemo(() => {
    const ctx = detectContext();
    return !!(ctx.gck || ctx.gForm || location.pathname.startsWith('/now/') || /\.do$/.test(location.pathname));
  }, []);
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${looksLikeSn ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15'}`}>
          {looksLikeSn ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
        </div>
        <h2 className="text-lg font-semibold">Authorize this ServiceNow instance?</h2>
        <p className="mt-2 text-[13px] text-ink-500 dark:text-ink-400">
          The toolkit only runs on explicitly approved instances. It will read the ticket you have open using your own ServiceNow session and
          permissions. Nothing is sent outside <b className="text-ink-700 dark:text-ink-200">{host}</b>.
        </p>
        {!looksLikeSn && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            This page does not look like a ServiceNow instance (no session token or form detected).
          </p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => visibility.set(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => updateSettings({ allowedDomains: [...settings.allowedDomains.filter((d) => d !== host), host] })}>
            Authorize {host}
          </Button>
        </div>
      </div>
    </div>
  );
}
