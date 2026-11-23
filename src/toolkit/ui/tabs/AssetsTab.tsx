import { useEffect, useState } from 'react';
import { Boxes, Copy, Cpu, Loader2, RefreshCw, Truck, Wrench } from 'lucide-react';
import { copyText } from '../../core/clipboard';
import { loadCi, loadUserAssets, type AssetRow, type CiDetails } from '../../core/sn/related';
import { useStore } from '../../state/store';
import { Badge, Button, Card, Empty } from '../components/ui';

export function AssetsTab() {
  const { snapshot, patchDraft, setTab, toast } = useStore();
  const [assets, setAssets] = useState<AssetRow[] | null>(null);
  const [ci, setCi] = useState<CiDetails | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const userId = snapshot?.user?.sysId;
  const ciRef = snapshot?.fields.configuration_item;
  const ciId = ciRef && /^[0-9a-f]{32}$/.test(ciRef.value) ? ciRef.value : null;

  const load = async () => {
    if (!snapshot) return;
    setLoading(true);
    setErr('');
    try {
      const [a, c] = await Promise.allSettled([
        userId ? loadUserAssets(snapshot.gck, userId) : Promise.resolve([]),
        ciId ? loadCi(snapshot.gck, ciId) : Promise.resolve(null),
      ]);
      if (a.status === 'fulfilled') setAssets(a.value);
      else setErr(`Assets: ${(a.reason as Error).message}`);
      if (c.status === 'fulfilled') setCi(c.value);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    setAssets(null);
    setCi(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, ciId]);

  const useForHardware = (a: { name: string; serial: string; assetTag: string; model: string }) => {
    patchDraft((d) => {
      d.hardware.include = true;
      d.hardware.oldSerial = a.serial || '';
      d.hardware.model = d.hardware.model || a.model || '';
    });
    setTab('hardware');
  };
  const setAsCi = (name: string) => {
    patchDraft((d) => void (d.overrides.configuration_item = name));
    toast('success', `Configuration item for notes set to ${name}.`);
  };
  const copy = async (v: string) => toast((await copyText(v)) ? 'success' : 'error', `Copied ${v}`);

  if (!snapshot?.sysId) return <Empty icon={<Boxes size={32} />} title="Open a saved ticket to see related assets" />;

  return (
    <div className="space-y-4">
      <Card title="Configuration item on the ticket" icon={<Cpu size={15} />}>
        {ci ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px] sm:grid-cols-3">
            {[
              ['Name', ci.name], ['Class', ci.className], ['Model', ci.model], ['Serial', ci.serial], ['Asset tag', ci.assetTag],
              ['Manufacturer', ci.manufacturer], ['OS', ci.os], ['IP', ci.ip], ['Location', ci.location], ['Status', ci.status],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <div className="text-[10.5px] uppercase tracking-wide text-ink-400">{k}</div>
                <div className="truncate">{v || '—'}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-500">{ciRef?.display ? `${ciRef.display} (details not accessible)` : 'No configuration item on this ticket.'}</p>
        )}
      </Card>

      <Card
        title={`Assets of ${snapshot.user?.name || 'the affected user'}`}
        icon={<Boxes size={15} />}
        actions={
          <Button size="sm" variant="ghost" icon={loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} onClick={load}>
            Refresh
          </Button>
        }
      >
        {err && <p className="mb-2 text-xs text-rose-600">{err}</p>}
        {!userId && <p className="text-xs text-ink-500">Affected user record not available (REST disabled or no access).</p>}
        {assets && assets.length === 0 && userId && <p className="text-xs text-ink-500">No active hardware assigned to this user.</p>}
        {assets && assets.length > 0 && (
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            {assets.map((a) => (
              <div key={a.sysId} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[13px] font-medium">
                    <span className="truncate">{a.name || a.model}</span>
                    <Badge>{a.className}</Badge>
                    {a.status && <Badge color="green">{a.status}</Badge>}
                  </div>
                  <div className="mt-0.5 flex gap-3 text-[11.5px] text-ink-500">
                    {a.serial && (
                      <button type="button" className="hover:text-brand-600" onClick={() => copy(a.serial)}>
                        SN {a.serial} <Copy size={10} className="inline" />
                      </button>
                    )}
                    {a.assetTag && <span>Tag {a.assetTag}</span>}
                    {a.model && <span className="truncate">{a.model}</span>}
                  </div>
                </div>
                <Button size="sm" variant="ghost" icon={<Wrench size={12} />} onClick={() => setAsCi(a.name || a.model)}>
                  Use as CI
                </Button>
                <Button size="sm" variant="ghost" icon={<Truck size={12} />} onClick={() => useForHardware(a)}>
                  Swap
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
