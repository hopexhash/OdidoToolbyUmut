import { useRef, useState } from 'react';
import { Bot, Database, Download, ExternalLink, Globe, History, Info, LogOut, Palette, RefreshCw, RotateCcw, Trash2, Upload, User } from 'lucide-react';
import { getApiKey, setApiKey } from '../../core/advice/ai';
import { copyText } from '../../core/clipboard';
import { FIELD_DEFS, DEFAULT_INSERT_SELECTORS, type FieldKey } from '../../core/fields';
import { safeParse, safeStringify } from '../../core/safeJson';
import { DEFAULT_SETTINGS, type Settings } from '../../core/settings';
import { storage } from '../../core/storage';
import { getBoot, VERSION } from '../../boot';
import { useT } from '../../i18n';
import { useStore } from '../../state/store';
import { Badge, Button, Card, cx, Disclosure, Dropdown, Empty, Field, Input, Notice, SectionHeader, Switch, TextArea } from '../components/ui';

type Section = 'general' | 'servicenow' | 'ai' | 'history' | 'data' | 'about';
const SECTIONS: { id: Section; label: string; icon: JSX.Element }[] = [
  { id: 'general', label: 'General', icon: <User size={16} /> },
  { id: 'servicenow', label: 'ServiceNow', icon: <Globe size={16} /> },
  { id: 'ai', label: 'AI', icon: <Bot size={16} /> },
  { id: 'history', label: 'History', icon: <History size={16} /> },
  { id: 'data', label: 'Backup & data', icon: <Database size={16} /> },
  { id: 'about', label: 'About', icon: <Info size={16} /> },
];

const lines = (v: string) => v.split('\n').map((s) => s.trim()).filter(Boolean);
const csv = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);

export function SettingsTab() {
  const t = useT();
  const [section, setSection] = useState<Section>(() => {
    const s = storage.session.get<Section>('settingsSection', 'general');
    return SECTIONS.some((x) => x.id === s) ? s : 'general';
  });
  const pick = (s: Section) => {
    setSection(s);
    storage.session.set('settingsSection', s);
  };
  return (
    <div>
      <SectionHeader title={t('Settings')} description={t('Personalise the toolkit. Changes are saved automatically.')} />
      <div className="mb-6 flex flex-wrap gap-1 rounded-2xl bg-ink-100 p-1 dark:bg-ink-850" role="tablist">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            onClick={() => pick(s.id)}
            className={cx(
              'flex h-9 items-center gap-2 rounded-xl px-3.5 text-[13px] font-medium transition duration-150',
              section === s.id ? 'bg-white text-ink-900 shadow-card dark:bg-ink-700 dark:text-white' : 'text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white',
            )}
          >
            {s.icon}
            {t(s.label)}
          </button>
        ))}
      </div>
      <div key={section} className="animate-tk-rise space-y-5">
        {section === 'general' && <General />}
        {section === 'servicenow' && <ServiceNowSettings />}
        {section === 'ai' && <AiSettingsView />}
        {section === 'history' && <HistoryView />}
        {section === 'data' && <DataSettings />}
        {section === 'about' && <About />}
      </div>
    </div>
  );
}

function General() {
  const t = useT();
  const { settings: s, updateSettings: u, snapshot } = useStore();
  return (
    <>
      <Card title={t('About you')} icon={<User size={18} />} description={t('Used to sign your notes and replies.')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('Your name')} help={!s.technicianName && snapshot?.sessionUser ? t('Empty = your ServiceNow name ({name})', { name: snapshot.sessionUser }) : undefined}>
            <Input value={s.technicianName} onChange={(e) => u({ technicianName: e.target.value })} placeholder={snapshot?.sessionUser || ''} />
          </Field>
          <Field label={t('Department')}>
            <Input value={s.department} onChange={(e) => u({ department: e.target.value })} />
          </Field>
        </div>
        <Field label={t('Signature under work notes')} className="mt-4" help={t('Optional. Leave empty to use your name and department.')}>
          <TextArea rows={2} value={s.signature} onChange={(e) => u({ signature: e.target.value })} />
        </Field>
      </Card>
      <Card title={t('Language & appearance')} icon={<Palette size={18} />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('Toolkit language')}>
            <Dropdown ariaLabel={t('Toolkit language')} value={s.uiLanguage} onChange={(v) => u({ uiLanguage: v as Settings['uiLanguage'] })} options={[{ value: 'nl', label: 'Nederlands' }, { value: 'en', label: 'English' }]} />
          </Field>
          <Field label={t('Default language for replies to users')}>
            <Dropdown value={s.language} onChange={(v) => u({ language: v as Settings['language'] })} options={[{ value: 'nl', label: 'Nederlands' }, { value: 'en', label: 'English' }]} />
          </Field>
          <Field label={t('Theme')}>
            <Dropdown
              value={s.theme}
              onChange={(v) => u({ theme: v as Settings['theme'] })}
              options={[
                { value: 'light', label: t('Light') },
                { value: 'dark', label: t('Dark') },
                { value: 'system', label: t('Same as my computer') },
              ]}
            />
          </Field>
          <Field label={t('Date format')}>
            <Dropdown value={s.dateFormat} onChange={(v) => u({ dateFormat: v as Settings['dateFormat'] })} options={['dd-MM-yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy'].map((f) => ({ value: f, label: f }))} />
          </Field>
        </div>
      </Card>
    </>
  );
}

function ServiceNowSettings() {
  const t = useT();
  const { settings: s, updateSettings: u, snapshot, rescan } = useStore();
  const boot = getBoot();
  const setEntry = (k: FieldKey, patch: { fields?: string[]; selectors?: string[] }) => {
    const cur = s.fieldMap[k] || { fields: [], selectors: [] };
    u({ fieldMap: { ...s.fieldMap, [k]: { ...cur, ...patch } } });
  };
  return (
    <>
      <Card title={t('Behaviour')} icon={<Globe size={18} />}>
        <div className="space-y-4">
          <Switch checked={s.autoRescan} onChange={(v) => u({ autoRescan: v })} label={t('Follow me when I open another ticket')} description={t('The toolkit reads the new ticket automatically.')} />
          <Switch checked={s.useRestApi} onChange={(v) => u({ useRestApi: v })} label={t('Load extra details from ServiceNow')} description={t('User details, deadlines, devices and earlier notes. Read-only, with your own permissions.')} />
          <Field label={t('When the notes field already contains text')}>
            <Dropdown
              value={s.insertMode}
              onChange={(v) => u({ insertMode: v as Settings['insertMode'] })}
              options={[
                { value: 'append', label: t('Add my text below it') },
                { value: 'replace', label: t('Replace it with my text') },
              ]}
            />
          </Field>
        </div>
      </Card>
      <Card title={t('Allowed ServiceNow sites')} description={t('The toolkit only works on these addresses. One per line.')}>
        <TextArea rows={3} className="font-mono !text-[12.5px]" value={s.allowedDomains.join('\n')} onChange={(e) => u({ allowedDomains: lines(e.target.value) })} />
        <p className="tk-help">
          {t('This page')}: <b>{location.hostname}</b>
          {boot.domains.length > 0 && (
            <>
              {' · '}
              {t('From your bookmark')}: {boot.domains.join(', ')}
            </>
          )}
        </p>
      </Card>
      <Disclosure title={t('Advanced: field mapping')} description={t('For admins — when a field is not found on your instance.')} icon={<Database size={18} />}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-ink-500">{t('Enter the ServiceNow column names to try, separated by commas. Leave empty for the defaults.')}</p>
          <Button size="sm" icon={<RefreshCw size={13} />} onClick={() => rescan()}>
            {t('Test')}
          </Button>
        </div>
        <div className="space-y-2">
          {FIELD_DEFS.map((d) => {
            const e = s.fieldMap[d.key];
            const found = snapshot?.fields[d.key];
            return (
              <div key={d.key} className="grid items-center gap-2 rounded-xl border border-ink-100 p-3 dark:border-ink-800 md:grid-cols-[170px_1fr_1fr]">
                <div>
                  <div className="text-[13px] font-medium">{t(d.label)}</div>
                  <div className="text-[11.5px]">{found ? <span className="text-emerald-700 dark:text-emerald-400">✓ {found.snField}</span> : <span className="text-ink-400">{t('not found')}</span>}</div>
                </div>
                <Input className="!h-9 font-mono !text-[12px]" placeholder={d.fields.join(', ')} value={(e?.fields || []).join(', ')} onChange={(ev) => setEntry(d.key, { fields: csv(ev.target.value) })} aria-label={`${t(d.label)} – ${t('column names')}`} />
                <Input className="!h-9 font-mono !text-[12px]" placeholder={t('CSS selector (optional)')} value={(e?.selectors || []).join(', ')} onChange={(ev) => setEntry(d.key, { selectors: csv(ev.target.value) })} aria-label={`${t(d.label)} – CSS`} />
              </div>
            );
          })}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label={t('Work notes field (CSS, one per line)')}>
            <TextArea rows={5} className="font-mono !text-[11.5px]" value={s.insertSelectors.work_notes.join('\n')} onChange={(e) => u({ insertSelectors: { ...s.insertSelectors, work_notes: lines(e.target.value) } })} />
          </Field>
          <Field label={t('Customer reply field (CSS, one per line)')}>
            <TextArea rows={5} className="font-mono !text-[11.5px]" value={s.insertSelectors.comments.join('\n')} onChange={(e) => u({ insertSelectors: { ...s.insertSelectors, comments: lines(e.target.value) } })} />
          </Field>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={() => u({ fieldMap: {}, insertSelectors: { ...DEFAULT_INSERT_SELECTORS } })}>
            {t('Reset to defaults')}
          </Button>
        </div>
      </Disclosure>
    </>
  );
}

function AiSettingsView() {
  const t = useT();
  const { settings: s, updateSettings: u, toast } = useStore();
  const ai = s.ai;
  const [key, setKey] = useState(() => getApiKey(ai));
  const setAi = (p: Partial<Settings['ai']>) => u({ ai: { ...ai, ...p } });
  return (
    <Card title={t('AI suggestions')} icon={<Bot size={18} />} actions={<Badge tone={ai.enabled && ai.consent ? 'green' : 'gray'}>{ai.enabled && ai.consent ? t('On') : t('Off')}</Badge>}>
      <Notice tone="amber" icon={<Info size={16} />} title={t('Only turn this on if your organisation approved it')}>
        {t('When you click "Get AI suggestions", the short description, description and device of the ticket are sent to Anthropic (Claude). Personal details are removed first.')}
      </Notice>
      <div className="mt-5 space-y-4">
        <Switch checked={ai.enabled} onChange={(v) => setAi({ enabled: v })} label={t('Turn on AI suggestions')} />
        <Switch checked={ai.consent} onChange={(v) => setAi({ consent: v })} label={t('My organisation approved sending ticket text to this AI service')} />
        <Switch checked={ai.redact} onChange={(v) => setAi({ redact: v })} label={t('Remove personal details before sending')} description={t('Names, email addresses, phone numbers and ticket numbers. Strongly recommended.')} />
        <Field label={t('API key')} help={ai.rememberKey ? t('Stored in this browser.') : t('Forgotten when you close the browser.')}>
          <div className="flex gap-2">
            <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" autoComplete="off" />
            <Button
              variant="primary"
              onClick={() => {
                setApiKey(key.trim(), ai.rememberKey);
                toast('success', 'API key saved');
              }}
            >
              {t('Save')}
            </Button>
          </div>
        </Field>
        <Switch
          checked={ai.rememberKey}
          onChange={(v) => {
            setAi({ rememberKey: v });
            setApiKey(key.trim(), v);
          }}
          label={t('Remember the key in this browser')}
        />
        <Disclosure title={t('Advanced')} description={t('Model and gateway')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('Model')}>
              <Input value={ai.model} onChange={(e) => setAi({ model: e.target.value })} placeholder="claude-opus-5-5" />
            </Field>
            <Field label={t('Gateway address (optional)')}>
              <Input value={ai.baseUrl} onChange={(e) => setAi({ baseUrl: e.target.value })} placeholder="https://api.anthropic.com" />
            </Field>
          </div>
        </Disclosure>
      </div>
    </Card>
  );
}

function HistoryView() {
  const t = useT();
  const { recent, clearRecent, settings, updateSettings } = useStore();
  return (
    <Card
      title={t('Recently opened tickets')}
      icon={<History size={18} />}
      actions={
        recent.length > 0 && (
          <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={clearRecent}>
            {t('Clear')}
          </Button>
        )
      }
    >
      <Switch checked={settings.keepHistory} onChange={(v) => updateSettings({ keepHistory: v })} label={t('Remember recently opened tickets')} description={t('Only the ticket number and short description, max. 15.')} />
      {recent.length ? (
        <ul className="mt-4 divide-y divide-ink-100 dark:divide-ink-800">
          {recent.map((r) => (
            <li key={r.sysId}>
              <a href={`${location.origin}/${r.table}.do?sys_id=${r.sysId}`} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-ink-50 dark:hover:bg-ink-850">
                <Badge tone="blue">{r.number}</Badge>
                <span className="min-w-0 flex-1 truncate text-[13px]">{r.short || '—'}</span>
                <span className="text-[12px] text-ink-400">{new Date(r.at).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <ExternalLink size={14} className="text-ink-300 group-hover:text-brand-600" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={<History size={22} />} title={t('No tickets yet')}>
          {t('Tickets you open with the toolkit appear here.')}
        </Empty>
      )}
    </Card>
  );
}

function DataSettings() {
  const t = useT();
  const { settings, templates, updateSettings, setTemplates, toast } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const exportAll = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([safeStringify({ app: 'itsm-toolkit', version: VERSION, settings, templates }, 2)], { type: 'application/json' }));
    a.download = 'itsm-toolkit-settings.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const importAll = async (f: File) => {
    const data = safeParse<any>(await f.text(), null);
    if (!data || data.app !== 'itsm-toolkit') return toast('error', 'This is not an ITSM Toolkit settings file');
    if (data.settings) updateSettings({ ...DEFAULT_SETTINGS, ...data.settings, ai: { ...DEFAULT_SETTINGS.ai, ...(data.settings.ai || {}) } });
    if (Array.isArray(data.templates)) setTemplates(data.templates);
    toast('success', 'Settings imported');
  };
  return (
    <>
      <Card title={t('Backup or share your setup')} icon={<Download size={18} />} description={t('Settings and templates — never ticket data or API keys. Share the file with colleagues to give them the same setup.')}>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && importAll(e.target.files[0])} />
        <div className="flex flex-wrap gap-2">
          <Button icon={<Download size={15} />} onClick={exportAll}>
            {t('Download backup')}
          </Button>
          <Button icon={<Upload size={15} />} onClick={() => fileRef.current?.click()}>
            {t('Restore from backup')}
          </Button>
        </div>
      </Card>
      <Card title={t('What is stored?')} icon={<Database size={18} />}>
        <ul className="space-y-2 text-[13px] text-ink-700 dark:text-ink-300">
          <li>• {t('Settings, templates and window position — only in this browser.')}</li>
          <li>• {t('Recently opened tickets (optional) — number and short description only.')}</li>
          <li>• {t('Your notes in progress — deleted when you close the browser.')}</li>
        </ul>
        <Button
          variant="danger"
          className="mt-5"
          icon={<Trash2 size={15} />}
          onClick={() => {
            if (confirm(t('Delete all toolkit data in this browser? This cannot be undone.'))) {
              storage.clearAll();
              window.__SNTK?.destroy();
            }
          }}
        >
          {t('Delete all toolkit data')}
        </Button>
      </Card>
    </>
  );
}

function About() {
  const t = useT();
  const { snapshot, toast } = useStore();
  const boot = getBoot();
  const [check, setCheck] = useState('');
  const [checking, setChecking] = useState(false);
  const checkUpdate = () => {
    if (!boot.base) return setCheck(t('Reinstall the bookmark from the installation page to enable updates.'));
    setChecking(true);
    (window as any).__SNTK_CHECK = (latest: string) => {
      delete (window as any).__SNTK_CHECK;
      setChecking(false);
      setCheck(latest === VERSION ? t('You have the latest version.') : t('Version {v} is available — click "Load latest version".', { v: latest }));
    };
    const s = document.createElement('script');
    s.src = `${boot.base}loader.js?check=1&t=${Date.now()}`;
    s.onerror = () => {
      setChecking(false);
      setCheck(t('Could not check for updates right now.'));
    };
    document.head.appendChild(s);
    setTimeout(() => s.remove(), 10000);
  };
  const reload = () => {
    const s = document.createElement('script');
    s.src = `${boot.base}loader.js?t=${Date.now()}`;
    (window as any).__SNTK_FORCE = true;
    document.head.appendChild(s);
  };
  const diagnostics = () => {
    const d = {
      version: VERSION, bookmarklet: boot.bv, ui: snapshot?.kind, table: snapshot?.table, hasRecord: !!snapshot?.sysId,
      hasGForm: snapshot?.hasGForm, hasToken: snapshot?.hasToken, sources: snapshot?.sources,
      fields: Object.fromEntries(Object.entries(snapshot?.fields || {}).map(([k, v]) => [k, `${v!.source}:${v!.snField || ''}`])),
      warnings: snapshot?.warnings, path: location.pathname, userAgent: navigator.userAgent,
    };
    copyText(safeStringify(d, 2)).then((ok) => (ok ? toast('success', 'Support information copied', 'It contains no ticket content.') : toast('error', 'Copying was blocked by your browser')));
  };
  return (
    <>
      <Card title="ITSM Toolkit" icon={<Info size={18} />} description={`${t('Version')} ${VERSION}`}>
        <div className="flex flex-wrap gap-2">
          <Button icon={<RefreshCw size={15} />} loading={checking} onClick={checkUpdate}>
            {t('Check for updates')}
          </Button>
          <Button onClick={reload}>{t('Load latest version')}</Button>
        </div>
        {check && <p className="tk-help">{check}</p>}
        {boot.bookmarkletOutdated && (
          <div className="mt-4">
            <Notice tone="amber" icon={<Info size={16} />}>
              {t('A newer bookmark is available. Install it again from the installation page.')}
            </Notice>
          </div>
        )}
      </Card>
      <Card title={t('Privacy & safety')} icon={<Globe size={18} />}>
        <p className="text-[13px] leading-relaxed text-ink-700 dark:text-ink-300">
          {t('The toolkit never saves or submits tickets and never reads passwords. It only talks to this ServiceNow site with your own login — unless you turn on AI suggestions.')}
        </p>
      </Card>
      <Card title={t('Support')}>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={diagnostics}>
            {t('Copy support information')}
          </Button>
          <Button variant="ghost" icon={<LogOut size={15} />} onClick={() => window.__SNTK?.destroy()}>
            {t('Close toolkit completely')}
          </Button>
        </div>
      </Card>
    </>
  );
}
