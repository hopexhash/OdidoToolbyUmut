/**
 * DOM helpers that see through open shadow roots (Next Experience / Workspace
 * render everything inside web components) and same-origin iframes.
 */
const HOST_ID = 'itsm-toolkit-host';

export function isOwnElement(el: Element): boolean {
  return !!(el.id === HOST_ID || el.closest?.('#' + HOST_ID));
}

/** querySelectorAll that also descends into open shadow roots. */
export function deepQueryAll<T extends Element = Element>(root: ParentNode, selector: string, limit = 50): T[] {
  const out: T[] = [];
  const visit = (node: ParentNode) => {
    if (out.length >= limit) return;
    let matches: NodeListOf<Element>;
    try {
      matches = node.querySelectorAll(selector);
    } catch {
      return; // invalid selector
    }
    for (let i = 0; i < matches.length && out.length < limit; i++) {
      if (!isOwnElement(matches[i])) out.push(matches[i] as T);
    }
    const all = node.querySelectorAll('*');
    for (let i = 0; i < all.length && out.length < limit; i++) {
      const sr = (all[i] as HTMLElement).shadowRoot;
      if (sr && !isOwnElement(all[i])) visit(sr);
    }
  };
  visit(root);
  return out;
}

export function deepQuery<T extends Element = Element>(root: ParentNode, selector: string): T | null {
  return deepQueryAll<T>(root, selector, 1)[0] || null;
}

/** All same-origin windows reachable from `win` (including nested iframes inside shadow DOM). */
export function collectWindows(win: Window, depth = 0, acc: Window[] = []): Window[] {
  acc.push(win);
  if (depth > 3) return acc;
  let doc: Document | null = null;
  try {
    doc = win.document;
  } catch {
    return acc;
  }
  const frames = deepQueryAll<HTMLIFrameElement>(doc, 'iframe, frame', 30);
  for (const f of frames) {
    try {
      const w = f.contentWindow;
      if (w && w.document && !acc.includes(w)) collectWindows(w, depth + 1, acc);
    } catch {
      /* cross-origin frame — ignored */
    }
  }
  return acc;
}

export function isVisible(el: Element): boolean {
  const r = (el as HTMLElement).getBoundingClientRect?.();
  if (!r) return false;
  if (r.width === 0 && r.height === 0) return false;
  const st = el.ownerDocument?.defaultView?.getComputedStyle(el as HTMLElement);
  return !st || (st.display !== 'none' && st.visibility !== 'hidden');
}

/** Reads a human readable value from an input/select/textarea or plain element. */
export function readElementValue(el: Element): string {
  if (el instanceof (el.ownerDocument?.defaultView as any)?.HTMLSelectElement || el.tagName === 'SELECT') {
    const s = el as HTMLSelectElement;
    return s.selectedIndex >= 0 ? (s.options[s.selectedIndex]?.text || '').trim() : '';
  }
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return ((el as HTMLInputElement).value || '').trim();
  const v = (el as any).value;
  if (typeof v === 'string' && v) return v.trim();
  return (el.textContent || '').trim();
}

/**
 * Sets the value of a native or framework-controlled text field the way a user
 * would: uses the prototype's value setter (so React/Angular/Seismic wrappers
 * notice the change) and dispatches input/change events.
 */
export function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const view = el.ownerDocument.defaultView as any;
  const proto = el.tagName === 'TEXTAREA' ? view.HTMLTextAreaElement.prototype : view.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  el.focus();
  if (setter) setter.call(el, value);
  else el.value = value;
  const Ev = view.Event as typeof Event;
  el.dispatchEvent(new Ev('input', { bubbles: true, composed: true }));
  el.dispatchEvent(new Ev('change', { bubbles: true, composed: true }));
  try {
    const KE = view.KeyboardEvent as typeof KeyboardEvent;
    el.dispatchEvent(new KE('keyup', { bubbles: true, composed: true, key: ' ' }));
  } catch {
    /* ignore */
  }
  el.dispatchEvent(new (view.FocusEvent as typeof FocusEvent)('blur', { bubbles: false }));
}

export { HOST_ID };
