import { ExternalLink, FileText, History, Trash2 } from 'lucide-react';
import { useStore } from '../../state/store';
import { Badge, Button, Card, Empty } from '../components/ui';

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

export function RecentTab() {
  const { recent, recentTemplates, templates, clearRecent, selectTemplate, setTab, settings } = useStore();
  const tpls = recentTemplates.map((id) => templates.find((t) => t.id === id)).filter(Boolean);
  return (
    <div className="space-y-4">
      <Card
        title="Recent tickets"
        icon={<History size={15} />}
        actions={
          (recent.length > 0 || tpls.length > 0) && (
            <Button size="sm" variant="ghost" icon={<Trash2 size={12} />} onClick={clearRecent}>
              Clear history
            </Button>
          )
        }
      >
        {!settings.keepHistory && <p className="mb-2 text-xs text-ink-500">History is disabled in Settings → Data.</p>}
        {recent.length ? (
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            {recent.map((r) => (
              <a
                key={r.sysId}
                href={`${location.origin}/${r.table}.do?sys_id=${r.sysId}`}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 py-2 hover:bg-ink-50 dark:hover:bg-ink-850"
              >
                <Badge color="blue">{r.number}</Badge>
                <span className="min-w-0 flex-1 truncate text-[12.5px]">{r.short || '—'}</span>
                <span className="text-[11px] text-ink-400">{ago(r.at)}</span>
                <ExternalLink size={13} className="text-ink-300 group-hover:text-brand-600" />
              </a>
            ))}
          </div>
        ) : (
          <Empty title="No recent tickets">Tickets you open with the toolkit appear here (number and short description only).</Empty>
        )}
      </Card>
      <Card title="Recently used templates" icon={<FileText size={15} />}>
        {tpls.length ? (
          <div className="flex flex-wrap gap-1.5">
            {tpls.map((t) => (
              <button
                key={t!.id}
                type="button"
                className="tk-chip tk-chip-off"
                onClick={() => {
                  selectTemplate(t!.id);
                  setTab('update');
                }}
              >
                {t!.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-500">No templates used yet.</p>
        )}
      </Card>
    </div>
  );
}
