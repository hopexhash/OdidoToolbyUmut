import { createRoot, type Root } from 'react-dom/client';
import css from './toolkit.css?inline';
import { App } from './ui/App';
import { HOST_ID } from './core/sn/dom';
import { VERSION } from './boot';
import { visibility } from './ui/visibility';
import { registerFonts } from './fonts';

/**
 * Entry point of the injected bundle. Mounts the toolkit into an isolated
 * Shadow DOM so neither ServiceNow's CSS nor ours leaks across.
 * Exposes window.__SNTK for the loader (toggle / destroy / version).
 */
interface Api {
  version: string;
  toggle(): void;
  show(): void;
  destroy(): void;
}

declare global {
  interface Window {
    __SNTK?: Api;
  }
}

function mount(): Api {
  registerFonts();
  document.getElementById(HOST_ID)?.remove();
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('data-version', VERSION);
  host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483000;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);
  const container = document.createElement('div');
  shadow.appendChild(container);
  // Keep keystrokes typed in the toolkit away from ServiceNow's global shortcuts.
  for (const ev of ['keydown', 'keyup', 'keypress']) host.addEventListener(ev, (e) => e.stopPropagation());
  (document.body || document.documentElement).appendChild(host);

  const root: Root = createRoot(container);
  root.render(<App />);

  return {
    version: VERSION,
    toggle: () => visibility.toggle(),
    show: () => visibility.show(),
    destroy: () => {
      try {
        root.unmount();
      } catch {
        /* ignore */
      }
      host.remove();
      delete window.__SNTK;
    },
  };
}

if (window.top !== window.self) {
  // The bookmarklet always runs in the top window; refuse to mount inside frames.
  console.warn('[ITSM Toolkit] not mounting inside a frame');
} else {
  window.__SNTK?.destroy();
  window.__SNTK = mount();
}
