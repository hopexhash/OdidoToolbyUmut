// Poppins is embedded in the bundle (latin subset, ~33 KB) so it works on every
// ServiceNow instance without extra network requests. @font-face rules do not
// work inside a Shadow DOM, so they are registered once on the host document
// under a private family name that cannot clash with ServiceNow's own fonts.
import w400 from '@fontsource/poppins/files/poppins-latin-400-normal.woff2?inline';
import w500 from '@fontsource/poppins/files/poppins-latin-500-normal.woff2?inline';
import w600 from '@fontsource/poppins/files/poppins-latin-600-normal.woff2?inline';
import w700 from '@fontsource/poppins/files/poppins-latin-700-normal.woff2?inline';

export function registerFonts() {
  if (document.getElementById('itsmtk-fonts')) return;
  const style = document.createElement('style');
  style.id = 'itsmtk-fonts';
  style.textContent = (
    [
      [400, w400],
      [500, w500],
      [600, w600],
      [700, w700],
    ] as const
  )
    .map(([w, src]) => `@font-face{font-family:"ITSMTK Poppins";font-style:normal;font-weight:${w};font-display:swap;src:url(${src}) format("woff2");}`)
    .join('\n');
  (document.head || document.documentElement).appendChild(style);
}
