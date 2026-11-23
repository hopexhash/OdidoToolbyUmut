import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { useMemo } from 'react';
import { detectContext } from '../core/sn/context';
import { useStore } from '../state/store';
import { Button } from './components/ui';
import { useT } from '../i18n';
import { visibility } from './visibility';

/**
 * Shown when the toolkit was launched on a host that is only covered by a
 * wildcard (e.g. *.service-now.com). The technician explicitly authorizes the
 * exact instance once; nothing is read from the page before that.
 */
export function AuthorizeScreen() {
  const t = useT();
  const { settings, updateSettings } = useStore();
  const host = location.hostname;
  const looksLikeSn = useMemo(() => {
    const ctx = detectContext();
    return !!(ctx.gck || ctx.gForm || location.pathname.startsWith('/now/') || /\.do$/.test(location.pathname));
  }, []);
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${looksLikeSn ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15'}`}>
          {looksLikeSn ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
        </div>
        <h2 className="text-[20px] font-semibold">{t('Use the toolkit on this ServiceNow site?')}</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500 dark:text-ink-400">
          {t('The toolkit reads the ticket you have open, using your own login and permissions. Nothing is sent outside {host}.', { host })}
        </p>
        {!looksLikeSn && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            {t('This page does not look like ServiceNow. Only continue if you are sure.')}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button size="lg" onClick={() => visibility.set(false)}>{t('Not now')}</Button>
          <Button size="lg" variant="primary" onClick={() => updateSettings({ allowedDomains: [...settings.allowedDomains.filter((d) => d !== host), host] })}>
            {t('Yes, allow {host}', { host })}
          </Button>
        </div>
      </div>
    </div>
  );
}
