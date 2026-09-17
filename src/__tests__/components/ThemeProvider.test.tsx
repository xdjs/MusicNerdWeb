import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import { runInNewContext } from 'node:vm';
import ThemeScript from '@/app/_components/ThemeScript';
import { ThemeProvider, useTheme } from '@/app/_components/ThemeProvider';

jest.mock('next/navigation', () => ({
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

function ThemeControl() {
  const { theme, setTheme } = useTheme();
  return <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme}</button>;
}

function runHeadScript(previewDeployment = false) {
  const html = renderToString(<ThemeScript previewDeployment={previewDeployment} />);
  const script = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'));
  runInNewContext(script, { document, localStorage, window, URLSearchParams });
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  delete document.documentElement.dataset.profilePreviewTheme;
  delete document.documentElement.dataset.profilePreviewDeployment;
  document.documentElement.className = 'unrelated';
  document.documentElement.style.colorScheme = '';
  jest.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
});

afterEach(() => jest.restoreAllMocks());

it.each(['light', 'dark'])('applies saved %s before React starts', (theme) => {
  localStorage.setItem('musicnerd-theme', theme);
  runHeadScript();
  expect(document.documentElement).toHaveClass(theme, 'unrelated');
  expect(document.documentElement.style.colorScheme).toBe(theme);
});

it.each([null, 'invalid'])('uses the system theme when preference is %s', (stored) => {
  if (stored) localStorage.setItem('musicnerd-theme', stored);
  runHeadScript();
  expect(document.documentElement).toHaveClass('dark');
});

it('falls back to the system when storage is blocked and still allows toggling', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
  expect(runHeadScript).not.toThrow();
  render(<ThemeProvider><ThemeControl /></ThemeProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'dark' }));
  expect(document.documentElement).toHaveClass('light');
  expect(document.documentElement.style.colorScheme).toBe('light');
});

it('persists explicit choices for the next full page reload', () => {
  render(<ThemeProvider><ThemeControl /></ThemeProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'dark' }));
  expect(localStorage.getItem('musicnerd-theme')).toBe('light');
  document.documentElement.className = '';
  runHeadScript();
  expect(document.documentElement).toHaveClass('light');
});

it('hydrates without mismatched theme markup or resetting the prepaint dark class', async () => {
  const app = <ThemeProvider><ThemeControl /></ThemeProvider>;
  const html = renderToString(app);
  localStorage.setItem('musicnerd-theme', 'dark');
  runHeadScript();
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  const recoverableError = jest.fn();
  const mutations: string[] = [];
  const add = document.documentElement.classList.add.bind(document.documentElement.classList);
  jest.spyOn(document.documentElement.classList, 'add').mockImplementation((...tokens) => {
    mutations.push(...tokens);
    add(...tokens);
  });
  let root: Root;
  await act(async () => {
    root = hydrateRoot(container, app, { onRecoverableError: recoverableError });
  });
  expect(recoverableError).not.toHaveBeenCalled();
  expect(mutations).not.toContain('light');
  expect(container.textContent).toBe('dark');
  expect(document.documentElement).toHaveClass('dark');
  await act(async () => root.unmount());
  container.remove();
});

it('defaults the shared concept to light before paint without replacing the normal saved preference', () => {
  window.history.replaceState({}, '', '/profile?preview=concept');
  localStorage.setItem('musicnerd-theme', 'dark');
  runHeadScript(true);
  expect(document.documentElement).toHaveClass('light');
  render(<ThemeProvider><ThemeControl /></ThemeProvider>);
  fireEvent.click(screen.getByRole('button', {name: 'light'}));
  expect(document.documentElement).toHaveClass('dark');
  expect(localStorage.getItem('musicnerd-profile-preview-theme')).toBe('dark');
  expect(localStorage.getItem('musicnerd-theme')).toBe('dark');
  runHeadScript(true);
  expect(document.documentElement).toHaveClass('dark');
});

it('keeps the ordinary theme behavior outside Vercel previews', () => {
  window.history.replaceState({}, '', '/profile?preview=concept');
  runHeadScript(false);
  expect(document.documentElement).toHaveClass('dark');
});

it('switches theme storage on client navigation into and out of the concept preview', () => {
  localStorage.setItem('musicnerd-theme', 'dark');
  localStorage.setItem('musicnerd-profile-preview-theme', 'light');
  runHeadScript(true);
  const app = () => <ThemeProvider><ThemeControl /></ThemeProvider>;
  const view = render(app());
  expect(document.documentElement).toHaveClass('dark');
  window.history.replaceState({}, '', '/profile?preview=concept');
  view.rerender(app());
  expect(document.documentElement).toHaveClass('light');
  fireEvent.click(screen.getByRole('button', {name:'light'}));
  expect(localStorage.getItem('musicnerd-profile-preview-theme')).toBe('dark');
  fireEvent.click(screen.getByRole('button', {name:'dark'}));
  expect(localStorage.getItem('musicnerd-theme')).toBe('dark');
  window.history.replaceState({}, '', '/profile');
  view.rerender(app());
  expect(document.documentElement).toHaveClass('dark');
  expect(document.documentElement.dataset.profilePreviewTheme).toBe('false');
  fireEvent.click(screen.getByRole('button', {name:'dark'}));
  expect(localStorage.getItem('musicnerd-theme')).toBe('light');
});
