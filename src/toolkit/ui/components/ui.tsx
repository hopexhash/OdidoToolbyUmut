import {
  forwardRef, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes,
} from 'react';
import { Check, ChevronDown, Loader2, X } from 'lucide-react';
import { useT } from '../../i18n';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ───────────────────────── Buttons ───────────────────────── */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'subtle';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-md active:bg-brand-800 disabled:bg-brand-600/45 disabled:shadow-none',
  secondary:
    'border border-ink-200 bg-white text-ink-800 shadow-card hover:border-ink-300 hover:bg-ink-25 dark:border-ink-700 dark:bg-ink-850 dark:text-ink-100 dark:hover:bg-ink-800',
  subtle: 'bg-ink-100 text-ink-800 hover:bg-ink-200/70 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white',
  danger: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-500/10',
  success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
};
const SIZES = { sm: 'h-8 px-3 text-[12.5px] gap-1.5 rounded-lg', md: 'h-10 px-4 text-[13.5px] gap-2 rounded-[10px]', lg: 'h-12 px-5 text-[14.5px] gap-2 rounded-xl' };

export function Button({
  variant = 'secondary', size = 'md', icon, loading, className, children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof SIZES; icon?: ReactNode; loading?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cx(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition duration-150 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-70',
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={size === 'lg' ? 18 : 15} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

/** Icon-only button. Always has a visible tooltip and an accessible label. */
export function IconButton({
  label, className, children, tipAlign = 'center', tipSide = 'bottom', ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tipAlign?: 'center' | 'right' | 'left'; tipSide?: 'bottom' | 'top' | 'right' }) {
  return (
    <Tooltip label={label} align={tipAlign} side={tipSide}>
      <button
        type="button"
        aria-label={label}
        className={cx(
          'inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-500 transition duration-150 hover:bg-ink-100 hover:text-ink-900 active:scale-95 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export function Tooltip({ label, children, align = 'center', side = 'bottom' }: { label: string; children: ReactNode; align?: 'center' | 'right' | 'left'; side?: 'bottom' | 'top' | 'right' }) {
  const pos =
    side === 'right'
      ? 'left-full top-1/2 ml-2 -translate-y-1/2'
      : cx(side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2', align === 'center' ? 'left-1/2 -translate-x-1/2' : align === 'right' ? 'right-0' : 'left-0');
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cx(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-lift transition delay-300 duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 dark:bg-ink-100 dark:text-ink-900',
          pos,
        )}
      >
        {label}
      </span>
    </span>
  );
}

/* ───────────────────────── Form fields ───────────────────────── */

export function Field({ label, help, children, className, right }: { label: string; help?: ReactNode; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <label className={cx('block', className)}>
      <span className="flex items-center justify-between gap-2">
        <span className="tk-label">{label}</span>
        {right}
      </span>
      {children}
      {help && <span className="tk-help">{help}</span>}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...rest }, ref) => (
  <input ref={ref} className={cx('tk-input', className)} {...rest} />
));

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...rest }, ref) => (
  <textarea ref={ref} className={cx('tk-input min-h-[88px] resize-y', className)} {...rest} />
));

export interface Option {
  value: string;
  label: string;
  description?: string;
}

/** Accessible custom dropdown (listbox) with keyboard support. */
export function Dropdown({ value, onChange, options, placeholder, className, ariaLabel }: { value: string; onChange: (v: string) => void; options: Option[]; placeholder?: string; className?: string; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (!ref.current?.contains(e.composedPath()[0] as Node)) setOpen(false);
    };
    const root = ref.current?.getRootNode() as Document | ShadowRoot;
    root.addEventListener('pointerdown', close);
    return () => root.removeEventListener('pointerdown', close);
  }, [open]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setActive(Math.max(0, options.findIndex((o) => o.value === value)));
      setOpen(true);
    } else if (open) {
      if (e.key === 'Escape') setOpen(false);
      else if (e.key === 'ArrowDown') setActive((a) => Math.min(options.length - 1, a + 1));
      else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1));
      else if (e.key === 'Enter') choose(options[active].value);
      else return;
      e.preventDefault();
    }
  };

  return (
    <div ref={ref} className={cx('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={ariaLabel}
        onClick={() => setOpen(!open)}
        onKeyDown={onKey}
        className={cx('tk-input flex items-center justify-between gap-2 text-left', open && '!border-brand-500 shadow-focus')}
      >
        <span className={cx('truncate', !current && 'text-ink-400')}>{current?.label || placeholder}</span>
        <ChevronDown size={16} className={cx('shrink-0 text-ink-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <ul
          id={id}
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-1.5 max-h-72 animate-tk-drop overflow-auto rounded-xl border border-ink-200 bg-white p-1.5 shadow-lift dark:border-ink-700 dark:bg-ink-850"
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o.value)}
              className={cx(
                'flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 text-[13.5px]',
                i === active ? 'bg-ink-100 dark:bg-ink-800' : '',
              )}
            >
              <span className="mt-0.5 w-4 shrink-0 text-brand-600">{o.value === value && <Check size={15} />}</span>
              <span>
                <span className="block">{o.label}</span>
                {o.description && <span className="block text-[12px] text-ink-500">{o.description}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Selectable pill (used for choices such as outcomes, quick dates, actions). */
export function Pill({ on, onClick, children, className, icon }: { on?: boolean; onClick?: () => void; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <button type="button" aria-pressed={!!on} onClick={onClick} className={cx('tk-pill', on ? 'tk-pill-on' : 'tk-pill-off', className)}>
      {on ? <Check size={14} strokeWidth={2.5} /> : icon}
      {children}
    </button>
  );
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="group flex w-full items-start gap-3 rounded-xl py-1 text-left">
      <span
        className={cx(
          'mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition duration-200',
          checked ? 'bg-brand-600' : 'bg-ink-200 group-hover:bg-ink-300 dark:bg-ink-700',
        )}
      >
        <span className={cx('h-5 w-5 rounded-full bg-white shadow-sm transition duration-200', checked && 'translate-x-5')} />
      </span>
      <span>
        <span className="block text-[13.5px] font-medium text-ink-900 dark:text-ink-100">{label}</span>
        {description && <span className="block text-[12.5px] leading-snug text-ink-500 dark:text-ink-400">{description}</span>}
      </span>
    </button>
  );
}

/* ───────────────────────── Layout ───────────────────────── */

export function Card({ title, description, icon, actions, children, className }: { title?: ReactNode; description?: ReactNode; icon?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <section className={cx('tk-card', className)}>
      {(title || actions) && (
        <header className={cx('flex items-start justify-between gap-3', children ? 'mb-4' : '')}>
          <div className="flex items-start gap-3">
            {icon && <IconTile>{icon}</IconTile>}
            <div>
              <h3 className="text-[15px] font-semibold leading-tight text-ink-900 dark:text-white">{title}</h3>
              {description && <p className="mt-1 text-[12.5px] leading-snug text-ink-500 dark:text-ink-400">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function IconTile({ children, tone = 'gray', size = 36 }: { children: ReactNode; tone?: 'gray' | 'blue' | 'green' | 'amber' | 'red'; size?: number }) {
  const tones = {
    gray: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
    blue: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    red: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  };
  return (
    <span className={cx('inline-flex shrink-0 items-center justify-center rounded-[10px]', tones[tone])} style={{ width: size, height: size }}>
      {children}
    </span>
  );
}

/** Collapsible card section (keeps optional content out of the way). */
export function Disclosure({ title, description, icon, children, defaultOpen = false, badge }: { title: ReactNode; description?: ReactNode; icon?: ReactNode; children: ReactNode; defaultOpen?: boolean; badge?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="tk-card !p-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-left transition hover:bg-ink-25 dark:hover:bg-ink-850">
        {icon && <IconTile>{icon}</IconTile>}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[15px] font-semibold text-ink-900 dark:text-white">
            {title}
            {badge}
          </span>
          {description && <span className="mt-0.5 block text-[12.5px] text-ink-500 dark:text-ink-400">{description}</span>}
        </span>
        <ChevronDown size={18} className={cx('shrink-0 text-ink-400 transition duration-200', open && 'rotate-180')} />
      </button>
      {open && <div className="animate-tk-rise border-t border-ink-100 px-5 pb-5 pt-4 dark:border-ink-800">{children}</div>}
    </section>
  );
}

const BADGE = {
  gray: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
  blue: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  red: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};
export function Badge({ tone = 'gray', icon, children, className }: { tone?: keyof typeof BADGE; icon?: ReactNode; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium', BADGE[tone], className)}>{icon}{children}</span>;
}

/** Inline message with icon + text (never colour alone). */
export function Notice({ tone = 'blue', icon, title, children, action }: { tone?: 'blue' | 'amber' | 'red' | 'green' | 'gray'; icon: ReactNode; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  const tones = {
    blue: 'border-brand-100 bg-brand-50/70 text-brand-900 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-100',
    amber: 'border-amber-200/70 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100',
    red: 'border-rose-200/70 bg-rose-50 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100',
    green: 'border-emerald-200/70 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100',
    gray: 'border-ink-200 bg-ink-50 text-ink-800 dark:border-ink-700 dark:bg-ink-850 dark:text-ink-200',
  };
  return (
    <div role={tone === 'red' ? 'alert' : 'status'} className={cx('flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px] leading-relaxed', tones[tone])}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {icon && <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-400 dark:bg-ink-800">{icon}</div>}
      <p className="text-[14.5px] font-semibold text-ink-800 dark:text-ink-100">{title}</p>
      {children && <div className="mt-1.5 max-w-sm text-[13px] text-ink-500 dark:text-ink-400">{children}</div>}
    </div>
  );
}

export function SectionHeader({ step, title, description, actions }: { step?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {step && <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-600 dark:text-brand-400">{step}</div>}
        <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.01em] text-ink-900 dark:text-white">{title}</h2>
        {description && <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-ink-500 dark:text-ink-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ProgressRing({ pct, size = 38 }: { pct: number; size?: number }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const color = pct >= 100 ? '#059669' : '#2856eb';
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-ink-100 dark:text-ink-800" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset .5s cubic-bezier(.2,.9,.25,1)' }} />
      </svg>
      <span className="absolute text-[10px] font-semibold tabular-nums text-ink-700 dark:text-ink-200">{pct >= 100 ? <Check size={15} strokeWidth={3} className="text-emerald-600" /> : `${pct}%`}</span>
    </span>
  );
}

export function AnimatedCheck({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray={24} className="animate-tk-check" />
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-[10px] bg-ink-900 text-white shadow-sm dark:bg-white dark:text-ink-900" style={{ width: size, height: size }}>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    </span>
  );
}

/** Modal rendered inside the toolkit window. */
export function Modal({ open, onClose, title, description, children, footer, wide }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex animate-tk-fade items-center justify-center bg-ink-900/25 p-6 backdrop-blur-[2px]" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('flex max-h-full w-full animate-tk-pop flex-col overflow-hidden rounded-2xl bg-white shadow-window dark:bg-ink-900', wide ? 'max-w-3xl' : 'max-w-xl')}>
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-5 dark:border-ink-800">
          <div>
            <h3 className="text-[17px] font-semibold text-ink-900 dark:text-white">{title}</h3>
            {description && <p className="mt-1 text-[13px] text-ink-500">{description}</p>}
          </div>
          <IconButton label={t('Close')} onClick={onClose} tipAlign="right">
            <X size={18} />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-ink-100 bg-ink-25 px-6 py-4 dark:border-ink-800 dark:bg-ink-850">{footer}</div>}
      </div>
    </div>
  );
}
