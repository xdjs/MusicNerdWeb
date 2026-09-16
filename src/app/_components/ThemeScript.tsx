// Intentionally a synchronous head script: next/script scheduling would leave
// the initial paint dependent on loading the Next.js runtime.
const themeScript = (previewDeployment: boolean) => `(function () {
  var preview = ${previewDeployment} && window.location.pathname === "/profile" && new URLSearchParams(window.location.search).get("preview") === "concept";
  var key = preview ? "musicnerd-profile-preview-theme" : "musicnerd-theme";
  document.documentElement.dataset.profilePreviewTheme = preview ? "true" : "false";
  var theme;
  try { theme = localStorage.getItem(key); } catch (_) {}
  if (theme !== "light" && theme !== "dark") {
    theme = preview ? "light" : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  var root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
})();`;

export default function ThemeScript({ previewDeployment = process.env.VERCEL_ENV === 'preview' }: { previewDeployment?: boolean } = {}) {
  return <script id="musicnerd-theme-init" dangerouslySetInnerHTML={{ __html: themeScript(previewDeployment) }} />;
}
