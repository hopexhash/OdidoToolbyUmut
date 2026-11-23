import { useCallback, useEffect, useRef, useState, type PointerEvent as RPE, type ReactNode } from 'react';
import { storage } from '../core/storage';
import { cx } from './components/ui';

export interface Geom {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface WinState {
  geom: Geom;
  minimized: boolean;
  maximized: boolean;
}

const MIN_W = 560;
const MIN_H = 420;

function defaults(): WinState {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(1040, vw - 32);
  const h = Math.min(720, vh - 32);
  return { geom: { x: Math.max(16, vw - w - 24), y: Math.max(16, Math.min(64, vh - h - 16)), w, h }, minimized: false, maximized: false };
}

function clamp(g: Geom): Geom {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.max(Math.min(g.w, vw - 8), Math.min(MIN_W, vw - 8));
  const h = Math.max(Math.min(g.h, vh - 8), Math.min(MIN_H, vh - 8));
  return { w, h, x: Math.min(Math.max(g.x, -w + 120), vw - 120), y: Math.min(Math.max(g.y, 0), vh - 44) };
}

type Edge = 'e' | 's' | 'se' | 'w' | 'sw';

export interface WindowControls {
  minimized: boolean;
  maximized: boolean;
  toggleMin(): void;
  toggleMax(): void;
  dragHandleProps: { onPointerDown: (e: RPE) => void; onDoubleClick: (e: React.MouseEvent) => void };
  width: number;
}

export function FloatingWindow({ children, minimizedView }: { children: (c: WindowControls) => ReactNode; minimizedView: (c: WindowControls) => ReactNode }) {
  const [st, setSt] = useState<WinState>(() => {
    const saved = storage.get<WinState | null>('window', null);
    return saved?.geom ? { ...saved, geom: clamp(saved.geom) } : defaults();
  });
  const stRef = useRef(st);
  stRef.current = st;
  const persist = useCallback((s: WinState) => storage.set('window', s), []);

  useEffect(() => {
    const onResize = () => setSt((s) => ({ ...s, geom: clamp(s.geom) }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startDrag = (e: RPE) => {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('button, input, select, textarea, a, [data-nodrag]')) return;
    if (stRef.current.maximized) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const sx = e.clientX;
    const sy = e.clientY;
    const g0 = stRef.current.geom;
    const move = (ev: PointerEvent) => setSt((s) => ({ ...s, geom: clamp({ ...g0, x: g0.x + ev.clientX - sx, y: g0.y + ev.clientY - sy }) }));
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      persist(stRef.current);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };

  const startResize = (edge: Edge) => (e: RPE) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const sx = e.clientX;
    const sy = e.clientY;
    const g0 = stRef.current.geom;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      const g = { ...g0 };
      if (edge.includes('e')) g.w = Math.max(MIN_W, g0.w + dx);
      if (edge.includes('s')) g.h = Math.max(MIN_H, g0.h + dy);
      if (edge.includes('w')) {
        g.w = Math.max(MIN_W, g0.w - dx);
        g.x = g0.x + (g0.w - g.w);
      }
      setSt((s) => ({ ...s, geom: clamp(g) }));
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      persist(stRef.current);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };

  const update = (patch: Partial<WinState>) =>
    setSt((s) => {
      const n = { ...s, ...patch };
      persist(n);
      return n;
    });

  const controls: WindowControls = {
    minimized: st.minimized,
    maximized: st.maximized,
    toggleMin: () => update({ minimized: !st.minimized }),
    toggleMax: () => update({ maximized: !st.maximized, minimized: false }),
    dragHandleProps: {
      onPointerDown: startDrag,
      onDoubleClick: (e) => {
        if ((e.target as HTMLElement).closest('button, input, select, textarea')) return;
        update({ maximized: !st.maximized });
      },
    },
    width: st.maximized ? window.innerWidth - 24 : st.geom.w,
  };

  if (st.minimized) {
    return (
      <div className="fixed animate-tk-pop" style={{ left: Math.max(8, st.geom.x + st.geom.w - 340), top: st.geom.y }}>
        {minimizedView(controls)}
      </div>
    );
  }

  const style = st.maximized ? { left: 12, top: 12, right: 12, bottom: 12 } : { left: st.geom.x, top: st.geom.y, width: st.geom.w, height: st.geom.h };
  const handle = 'absolute z-20';
  return (
    <div
      role="dialog"
      aria-label="ITSM Toolkit"
      className={cx(
        'fixed flex animate-tk-pop flex-col overflow-hidden rounded-2xl border border-ink-200/80 bg-ink-50 shadow-window dark:border-ink-800 dark:bg-ink-950',
      )}
      style={style}
    >
      {children(controls)}
      {!st.maximized && (
        <>
          <div className={cx(handle, 'right-0 top-3 bottom-3 w-1.5 cursor-ew-resize')} onPointerDown={startResize('e')} />
          <div className={cx(handle, 'left-0 top-3 bottom-3 w-1.5 cursor-ew-resize')} onPointerDown={startResize('w')} />
          <div className={cx(handle, 'bottom-0 left-3 right-3 h-1.5 cursor-ns-resize')} onPointerDown={startResize('s')} />
          <div className={cx(handle, 'bottom-0 right-0 h-4 w-4 cursor-nwse-resize')} onPointerDown={startResize('se')}>
            <svg viewBox="0 0 10 10" className="absolute bottom-1 right-1 h-2.5 w-2.5 text-ink-300 dark:text-ink-600">
              <path d="M9 1L1 9M9 5L5 9" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </div>
          <div className={cx(handle, 'bottom-0 left-0 h-4 w-4 cursor-nesw-resize')} onPointerDown={startResize('sw')} />
        </>
      )}
    </div>
  );
}
