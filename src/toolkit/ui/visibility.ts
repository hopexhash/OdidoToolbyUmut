type Listener = (v: boolean) => void;
let visible = true;
const listeners = new Set<Listener>();
export const visibility = {
  get: () => visible,
  set(v: boolean) {
    visible = v;
    listeners.forEach((l) => l(v));
  },
  toggle() {
    this.set(!visible);
  },
  show() {
    this.set(true);
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
