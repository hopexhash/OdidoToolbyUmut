import { formatIso, formatTime, formatDate, weekday, type DateFormat } from './dates';
import type { ContactMethod, ContactOutcome, Draft } from './draft';
import { PENDING_REASONS } from './draft';
import type { FieldKey } from './fields';
import type { Lang, Settings } from './settings';
import type { TicketSnapshot } from './sn/extract';
import { renderTemplate, type Template } from './templates/engine';

export const METHOD_LABEL: Record<Exclude<ContactMethod, ''>, { en: string; nl: string; internal: string }> = {
  teams: { en: 'Microsoft Teams', nl: 'Microsoft Teams', internal: 'Teams' },
  phone: { en: 'telephone', nl: 'telefoon', internal: 'Telephone' },
  email: { en: 'email', nl: 'e-mail', internal: 'Email' },
};

export const OUTCOME_LABEL: Record<Exclude<ContactOutcome, ''>, string> = {
  reached: 'Reached',
  no_answer: 'No answer',
  voicemail: 'Voicemail left',
  message_sent: 'Message sent',
};

/** Effective (override → detected) value of a ticket field. */
export function fieldValue(snap: TicketSnapshot | null, draft: Draft, key: FieldKey): string {
  const o = draft.overrides[key];
  if (o !== undefined) return o;
  return snap?.fields[key]?.display || '';
}

export function buildVariables(snap: TicketSnapshot | null, draft: Draft, settings: Settings, now = new Date()): Record<string, string> {
  const f = (k: FieldKey) => fieldValue(snap, draft, k);
  const userName = f('affected_user') || f('caller');
  const firstName = draft.overrides.affected_user !== undefined ? userName.split(' ')[0] : snap?.user?.firstName || userName.split(' ')[0] || '';
  const fmt = settings.dateFormat as DateFormat;
  const pending = PENDING_REASONS.find((p) => p.id === draft.contact.pendingReason);
  return {
    user_name: userName,
    first_name: firstName,
    ticket_number: f('number'),
    phone: f('phone'),
    email: f('email'),
    date: formatDate(now, fmt),
    time: formatTime(now),
    engineer: f('assigned_to'),
    technician: settings.technicianName || snap?.sessionUser || '',
    department: settings.department,
    contact_method: draft.contact.method ? METHOD_LABEL[draft.contact.method].internal : '',
    configuration_item: f('configuration_item'),
    priority: f('priority'),
    incident_status: f('state'),
    assignment_group: f('assignment_group'),
    short_description: f('short_description'),
    followup_date: draft.contact.followDate ? formatIso(draft.contact.followDate, fmt) : '',
    followup_time: draft.contact.followTime,
    pending_reason: pending?.label || '',
  };
}

const bullet = (s: string) => `• ${s}`;

/** Internal work notes. May contain technical detail; never shown to the customer. */
export function generateWorkNotes(snap: TicketSnapshot | null, draft: Draft, settings: Settings, template: Template | null, now = new Date()): string {
  const v = buildVariables(snap, draft, settings, now);
  const blocks: string[] = [];
  const c = draft.contact;

  if (template?.workNotes) blocks.push(renderTemplate(template.workNotes, v));

  if (c.method || c.outcome) {
    const who = [v.user_name, c.method === 'email' ? v.email : c.method ? v.phone : ''].filter(Boolean).join(' – ');
    const line = [
      'Contact',
      c.method ? `via ${METHOD_LABEL[c.method].internal}` : '',
      who ? `with ${who}` : '',
      c.outcome ? `: ${OUTCOME_LABEL[c.outcome]}` : '',
      ` (${v.date} ${v.time})`,
    ].join(' ').replace(/\s+:/, ':').replace(/\s{2,}/g, ' ');
    blocks.push(line.trim());
  }
  if (c.note.trim()) blocks.push(c.note.trim());

  const u = draft.update;
  if (u.actions.length) blocks.push(['Actions performed:', ...u.actions.map(bullet)].join('\n'));
  if (u.updateText.trim()) blocks.push(`Findings / update:\n${u.updateText.trim()}`);

  const h = draft.hardware;
  if (h.include) {
    const hw = [
      `Hardware${h.requestType ? ` (${h.requestType})` : ''}:`,
      bullet(`Device: ${[h.deviceType, h.model].filter(Boolean).join(' – ') || '-'}`),
      h.serial && bullet(`Serial (new): ${h.serial}`),
      h.assetTag && bullet(`Asset tag: ${h.assetTag}`),
      h.oldSerial && bullet(`Serial (old / return): ${h.oldSerial}`),
      h.deliveryMethod && bullet(`Delivery: ${h.deliveryMethod}${h.carrier ? ` (${h.carrier})` : ''}`),
      h.podReference && bullet(`POD / tracking reference: ${h.podReference}`),
      h.deliveryDate && bullet(`Delivery date: ${formatIso(h.deliveryDate, settings.dateFormat)}${h.timeSlot ? ` ${h.timeSlot}` : ''}`),
      h.address && bullet(`Delivery address: ${h.address}`),
      bullet(`Data backup confirmed: ${h.backupConfirmed ? 'Yes' : 'No'}`),
      h.notes && bullet(h.notes),
    ].filter(Boolean);
    blocks.push(hw.join('\n'));
  }

  if (u.suggestions.length) {
    blocks.push(['Suggested next checks (NOT yet performed):', ...u.suggestions.map(bullet)].join('\n'));
  }
  if (u.nextSteps.trim()) blocks.push(`Next steps:\n${u.nextSteps.trim()}`);

  if (c.followDate || c.pendingReason) {
    const parts = [];
    if (c.followDate) parts.push(`Follow-up: ${v.followup_date}${c.followTime ? ` ${c.followTime}` : ''}`);
    if (v.pending_reason) parts.push(`Pending reason: ${v.pending_reason}`);
    blocks.push(parts.join(' · '));
  }

  const sig = settings.signature ? renderTemplate(settings.signature, v) : v.technician ? `— ${v.technician}${v.department ? `, ${v.department}` : ''}` : '';
  if (sig && blocks.length) blocks.push(sig);
  return blocks.filter(Boolean).join('\n\n').trim();
}

const COPY = {
  en: {
    greet: (n: string) => (n ? `Dear ${n},` : 'Dear Sir/Madam,'),
    reached: (m: string) => `Thank you for your time on ${m} today.`,
    noAnswer: (m: string, t: string) => `Today at ${t} we tried to reach you by ${m}, but unfortunately we were unable to reach you.`,
    voicemail: (t: string) => `Today at ${t} we tried to call you and left a voicemail.`,
    messageSent: (m: string) => `We have sent you a message via ${m}.`,
    follow: (d: string, wd: string, t: string, m: string) => `We will contact you again on ${wd} ${d}${t ? ` at ${t}` : ''}${m ? ` via ${m}` : ''}.`,
    followNoContactInfo: 'If this moment is not convenient, please let us know by replying to this ticket.',
    hw: (method: string, d: string, ref: string) =>
      `Your new device will be delivered via ${method.toLowerCase()}${d ? ` on ${d}` : ''}.${ref ? ` Reference: ${ref}.` : ''}`,
    close: 'Kind regards,',
  },
  nl: {
    greet: (n: string) => (n ? `Beste ${n},` : 'Geachte heer/mevrouw,'),
    reached: (m: string) => `Bedankt voor uw tijd via ${m} vandaag.`,
    noAnswer: (m: string, t: string) => `Vandaag om ${t} hebben wij geprobeerd u via ${m} te bereiken, helaas zonder succes.`,
    voicemail: (t: string) => `Vandaag om ${t} hebben wij geprobeerd u te bellen en een voicemail ingesproken.`,
    messageSent: (m: string) => `Wij hebben u een bericht gestuurd via ${m}.`,
    follow: (d: string, wd: string, t: string, m: string) => `Wij nemen op ${wd} ${d}${t ? ` om ${t}` : ''}${m ? ` via ${m}` : ''} opnieuw contact met u op.`,
    followNoContactInfo: 'Komt dit moment niet uit? Laat het ons weten door op deze melding te reageren.',
    hw: (method: string, d: string, ref: string) =>
      `Uw nieuwe apparaat wordt geleverd via ${method.toLowerCase()}${d ? ` op ${d}` : ''}.${ref ? ` Referentie: ${ref}.` : ''}`,
    close: 'Met vriendelijke groet,',
  },
};

/**
 * Customer-facing additional comments. Only uses customer-safe inputs:
 * template customer text, the explicit "customer update" field, contact
 * outcome, follow-up and pending wording. Internal notes, actions, findings,
 * suggestions and hardware internals are never included.
 */
export function generateComment(snap: TicketSnapshot | null, draft: Draft, settings: Settings, template: Template | null, lang: Lang, now = new Date()): string {
  const v = buildVariables(snap, draft, settings, now);
  const L = COPY[lang];
  const c = draft.contact;
  const body: string[] = [];
  const m = c.method ? METHOD_LABEL[c.method][lang] : '';

  if (c.outcome === 'reached') body.push(L.reached(m || (lang === 'nl' ? 'telefoon' : 'telephone')));
  else if (c.outcome === 'no_answer') body.push(L.noAnswer(m || (lang === 'nl' ? 'telefoon' : 'telephone'), v.time));
  else if (c.outcome === 'voicemail') body.push(L.voicemail(v.time));
  else if (c.outcome === 'message_sent') body.push(L.messageSent(m || 'Teams'));

  const tpl = template ? (lang === 'nl' ? template.commentNl : template.commentEn) : '';
  if (tpl.trim()) body.push(renderTemplate(tpl, v));
  if (draft.update.customerUpdate.trim()) body.push(renderTemplate(draft.update.customerUpdate.trim(), v));

  const h = draft.hardware;
  if (h.include && (h.deliveryDate || h.podReference)) {
    body.push(L.hw(h.deliveryMethod || (lang === 'nl' ? 'onze bezorgdienst' : 'our delivery service'), h.deliveryDate ? formatIso(h.deliveryDate, settings.dateFormat) : '', h.podReference));
  }

  const pending = PENDING_REASONS.find((p) => p.id === c.pendingReason);
  if (pending) body.push(pending[lang]);
  if (c.followDate) {
    body.push(`${L.follow(v.followup_date, weekday(c.followDate, lang), c.followTime, m)} ${L.followNoContactInfo}`);
  }

  if (!body.length) return '';
  const sigName = [v.technician, v.department].filter(Boolean).join('\n');
  return [L.greet(v.first_name), body.join('\n\n'), [L.close, sigName].filter(Boolean).join('\n')].join('\n\n').trim();
}

export interface ConfidentialityWarning {
  label: string;
  sample: string;
}

const CONFIDENTIAL_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'IP address', re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/ },
  { label: 'Password / credential', re: /\b(password|passwd|wachtwoord|pwd|credential|secret|token)\b\s*[:=]?/i },
  { label: 'ServiceNow sys_id', re: /\b[0-9a-f]{32}\b/ },
  { label: 'Internal hostname / UNC path', re: /\\\\[\w.-]+\\|\b[\w-]+\.(?:corp|internal|local|lan)\b/i },
  { label: 'Internal-only wording', re: /\b(internal only|intern gebruik|work ?notes?|werknotitie)\b/i },
];

/** Flags content that should probably not be visible to the customer. */
export function scanConfidential(text: string, extraTerms: string[] = []): ConfidentialityWarning[] {
  const out: ConfidentialityWarning[] = [];
  for (const p of CONFIDENTIAL_PATTERNS) {
    const m = p.re.exec(text);
    if (m) out.push({ label: p.label, sample: m[0] });
  }
  for (const term of extraTerms) {
    if (term && term.length > 3 && text.toLowerCase().includes(term.toLowerCase())) out.push({ label: 'Assignment group name', sample: term });
  }
  return out;
}

/** Completion score for the header ring. */
export function completion(snap: TicketSnapshot | null, draft: Draft, template: Template | null): { pct: number; missing: string[] } {
  const checks: [string, boolean][] = [
    ['Ticket detected', !!fieldValue(snap, draft, 'number')],
    ['Affected user', !!fieldValue(snap, draft, 'affected_user') || !!fieldValue(snap, draft, 'caller')],
    ['Phone or email', !!fieldValue(snap, draft, 'phone') || !!fieldValue(snap, draft, 'email')],
    ['Contact method', !!draft.contact.method],
    ['Contact outcome', !!draft.contact.outcome],
    ['Template or update', !!template || !!draft.update.updateText.trim() || draft.update.actions.length > 0],
    ['Follow-up or resolution', !!draft.contact.followDate || template?.category === 'Resolution'],
  ];
  const done = checks.filter((c) => c[1]).length;
  return { pct: Math.round((done / checks.length) * 100), missing: checks.filter((c) => !c[1]).map((c) => c[0]) };
}
