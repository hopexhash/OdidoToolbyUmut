/** Data handed over by the bookmarklet + loader (window.__SNTK_BOOT). */
export interface BootInfo {
  base: string;
  /** Bookmarklet protocol version that launched us. */
  bv: number;
  /** Domains embedded in the bookmarklet. */
  domains: string[];
  latestVersion?: string;
  bookmarkletOutdated?: boolean;
}

export function getBoot(): BootInfo {
  const b = ((window as any).__SNTK_BOOT || {}) as Partial<BootInfo>;
  return {
    base: b.base || '',
    bv: b.bv || 0,
    domains: Array.isArray(b.domains) ? b.domains : [],
    latestVersion: b.latestVersion,
    bookmarkletOutdated: !!b.bookmarkletOutdated,
  };
}

export const VERSION = __APP_VERSION__;
