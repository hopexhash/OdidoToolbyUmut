import type { FieldKey } from './fields';
import type { Lang } from './settings';

export type ContactMethod = 'teams' | 'phone' | 'email' | '';
export type ContactOutcome = 'reached' | 'no_answer' | 'voicemail' | 'message_sent' | '';

export interface ContactDraft {
  method: ContactMethod;
  outcome: ContactOutcome;
  followDate: string; // yyyy-MM-dd
  followTime: string; // HH:mm
  pendingReason: string;
  note: string;
}

export interface UpdateDraft {
  templateId: string | null;
  actions: string[];
  updateText: string;
  customerUpdate: string;
  nextSteps: string;
  /** AI / rule-based suggestions the technician chose to record — NOT performed. */
  suggestions: string[];
}

export interface HardwareDraft {
  include: boolean;
  requestType: string;
  deviceType: string;
  model: string;
  serial: string;
  assetTag: string;
  oldSerial: string;
  deliveryMethod: string;
  carrier: string;
  podReference: string;
  address: string;
  deliveryDate: string;
  timeSlot: string;
  backupConfirmed: boolean;
  notes: string;
}

export interface Draft {
  overrides: Partial<Record<FieldKey, string>>;
  contact: ContactDraft;
  update: UpdateDraft;
  hardware: HardwareDraft;
  commentLang: Lang;
  /** Non-null when the technician edited the generated text by hand. */
  workNotesManual: string | null;
  commentsManual: string | null;
}

export const emptyDraft = (lang: Lang): Draft => ({
  overrides: {},
  contact: { method: '', outcome: '', followDate: '', followTime: '', pendingReason: '', note: '' },
  update: { templateId: null, actions: [], updateText: '', customerUpdate: '', nextSteps: '', suggestions: [] },
  hardware: {
    include: false, requestType: 'Replacement', deviceType: 'Laptop', model: '', serial: '', assetTag: '', oldSerial: '',
    deliveryMethod: 'Courier (POD)', carrier: '', podReference: '', address: '', deliveryDate: '', timeSlot: '',
    backupConfirmed: false, notes: '',
  },
  commentLang: lang,
  workNotesManual: null,
  commentsManual: null,
});

export interface PendingReason {
  id: string;
  label: string;
  en: string;
  nl: string;
}

export const PENDING_REASONS: PendingReason[] = [
  { id: 'awaiting_caller', label: 'Awaiting caller / user', en: 'We are waiting for your response or availability.', nl: 'We wachten op uw reactie of beschikbaarheid.' },
  { id: 'appointment', label: 'Appointment scheduled', en: 'We have scheduled a follow-up moment with you.', nl: 'We hebben een vervolgmoment met u ingepland.' },
  { id: 'awaiting_vendor', label: 'Awaiting supplier / vendor', en: 'We are waiting for feedback from our supplier.', nl: 'We wachten op terugkoppeling van onze leverancier.' },
  { id: 'awaiting_hardware', label: 'Awaiting hardware delivery', en: 'We are waiting for the delivery of hardware.', nl: 'We wachten op de levering van hardware.' },
  { id: 'awaiting_change', label: 'Awaiting change', en: 'A planned change is required to resolve this.', nl: 'Voor de oplossing is een geplande wijziging nodig.' },
  { id: 'awaiting_problem', label: 'Awaiting problem investigation', en: 'The underlying cause is being investigated.', nl: 'De onderliggende oorzaak wordt onderzocht.' },
  { id: 'monitoring', label: 'Monitoring / awaiting confirmation', en: 'We are monitoring the situation and await your confirmation that everything works.', nl: 'We houden de situatie in de gaten en wachten op uw bevestiging dat alles werkt.' },
  { id: 'awaiting_approval', label: 'Awaiting approval', en: 'We are waiting for the required approval.', nl: 'We wachten op de benodigde goedkeuring.' },
];

export const COMMON_ACTIONS = [
  'Remote session started',
  'Device restarted',
  'Cache / temp files cleared',
  'Drivers updated',
  'Windows updates installed',
  'Software reinstalled',
  'Profile rebuilt',
  'Network settings reset',
  'Account unlocked',
  'MFA re-registered',
  'Certificate renewed',
  'Group policy refreshed (gpupdate)',
  'Hardware diagnostics run',
  'Knowledge article followed',
];
