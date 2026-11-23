import { ArrowRight } from 'lucide-react';
import { useT } from '../../i18n';
import { useStore, type TabId } from '../../state/store';
import { Button } from './ui';

/** Footer that tells the user exactly what to do next. */
export function NextStep({ to, label, hint }: { to: TabId | 'output'; label: string; hint?: string }) {
  const t = useT();
  const setTab = useStore((s) => s.setTab);
  const pulse = useStore((s) => s.pulseOutput);
  return (
    <div className="mt-8 flex items-center justify-between gap-4 border-t border-ink-200/70 pt-6 dark:border-ink-800">
      <p className="text-[13px] text-ink-500 dark:text-ink-400">{hint ? t(hint) : ''}</p>
      <Button variant="primary" size="lg" onClick={() => (to === 'output' ? pulse() : setTab(to))} icon={null}>
        {t(label)}
        <ArrowRight size={17} />
      </Button>
    </div>
  );
}
