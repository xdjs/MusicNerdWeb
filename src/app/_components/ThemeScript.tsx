// Intentionally a synchronous head script: next/script scheduling would leave
// the initial paint dependent on loading the Next.js runtime.
const themeScript = `(function () {
  var theme;
  try { theme = localStorage.getItem("musicnerd-theme"); } catch (_) {}
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  var root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
})();`;

export default function ThemeScript() {
  return <script id="musicnerd-theme-init" dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
