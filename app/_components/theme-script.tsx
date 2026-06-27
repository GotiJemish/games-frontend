/**
 * Inlined into <head> of every page. Runs synchronously before paint so the
 * `.dark` class is already present on <html> when the first styles are
 * applied — eliminating the flash-of-wrong-theme.
 *
 * Resolution order:
 *   1. localStorage.theme ∈ {"light","dark"}  → user explicit choice
 *   2. window.matchMedia("(prefers-color-scheme: dark)").matches  → OS pref
 *   3. light (fallback)
 */
const SCRIPT = `(() => {
  try {
    var stored = localStorage.getItem("theme");
    var dark = stored === "dark" || (stored !== "light" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();`;

export function ThemeScript() {
  return (
    <script
      // The script mutates <html> before React hydrates; the suppressHydrationWarning
      // on <html> eats the consequent attribute-mismatch warning.
      dangerouslySetInnerHTML={{ __html: SCRIPT }}
    />
  );
}
