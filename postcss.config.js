// rem -> px: the toolkit renders inside a Shadow DOM on top of ServiceNow, whose
// root font-size we do not control. Converting rem to px keeps sizing stable.
const remToPx = () => ({
  postcssPlugin: 'rem-to-px',
  Declaration(decl) {
    if (decl.value && decl.value.includes('rem')) {
      decl.value = decl.value.replace(/(-?\d*\.?\d+)rem\b/g, (_, n) => `${parseFloat(n) * 16}px`);
    }
  },
});
remToPx.postcss = true;

export default {
  plugins: [(await import('tailwindcss')).default, remToPx(), (await import('autoprefixer')).default],
};
