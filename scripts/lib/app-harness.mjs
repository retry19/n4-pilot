/**
 * jsdom harness for the **production bundle**.
 *
 * Chrome is blocked in this sandbox (named pipes), so route smoke and the
 * accessibility audit boot the real bundle here, inject a scenario state into
 * localStorage, and navigate the hash router.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

export const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

export function findBundle(root = ROOT) {
  const dir = path.join(root, 'dist', 'assets');
  if (!fs.existsSync(dir)) return null;
  return (
    fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.js'))
      .map((file) => path.join(dir, file))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] ?? null
  );
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function defineGlobal(name, value) {
  try {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  } catch {
    globalThis[name] = value;
  }
}

export async function bootApp({
  state,
  bundlePath = findBundle(),
  hash = '#/today',
  quiet = true,
} = {}) {
  if (!bundlePath || !fs.existsSync(bundlePath)) {
    throw new Error('Bundle produksi tidak ditemukan. Jalankan `npm run build` dulu.');
  }

  const dom = new JSDOM(
    `<!doctype html><html lang="id"><head><title>N4 Pilot</title></head><body><a class="skip-link" href="#main">Lewati</a><div id="root"></div><div id="boot"></div></body></html>`,
    {
      url: `http://localhost/${hash}`,
      pretendToBeVisual: true,
      runScripts: 'outside-only',
    },
  );
  const { window } = dom;
  const { document } = window;

  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  if (!window.speechSynthesis) {
    window.speechSynthesis = {
      speak: () => {},
      cancel: () => {},
      getVoices: () => [],
      addEventListener: () => {},
    };
  }
  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  if (!window.HTMLDialogElement) {
    window.HTMLDialogElement = class extends window.HTMLElement {};
  }

  defineGlobal('window', window);
  defineGlobal('document', document);
  defineGlobal('navigator', window.navigator);
  defineGlobal('localStorage', window.localStorage);
  defineGlobal('HTMLElement', window.HTMLElement);
  defineGlobal('HTMLDialogElement', window.HTMLDialogElement);
  defineGlobal('Event', window.Event);
  defineGlobal('HashChangeEvent', window.HashChangeEvent ?? window.Event);
  defineGlobal('MouseEvent', window.MouseEvent);
  defineGlobal('Node', window.Node);
  defineGlobal('history', window.history);
  defineGlobal('location', window.location);
  defineGlobal('getComputedStyle', window.getComputedStyle.bind(window));
  defineGlobal('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  defineGlobal('cancelAnimationFrame', window.cancelAnimationFrame.bind(window));
  defineGlobal('IS_REACT_ACT_ENVIRONMENT', false);

  if (state) window.localStorage.setItem('n4pilot.state', JSON.stringify(state));

  const errors = [];
  const warnings = [];
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...args) => {
    errors.push(args.map(String).join(' '));
    if (!quiet) originalError(...args);
  };
  console.warn = (...args) => {
    warnings.push(args.map(String).join(' '));
    if (!quiet) originalWarn(...args);
  };

  try {
    await import(`${pathToFileURL(bundlePath).href}?harness=${Date.now()}`);
  } catch (error) {
    console.error = originalError;
    console.warn = originalWarn;
    throw new Error(`Bundle gagal dimuat: ${error?.message ?? error}`);
  }
  await wait(220);

  return {
    dom,
    window,
    document,
    bundle: bundlePath,
    errors,
    warnings,
    async visit(route) {
      window.location.hash = `#${route}`;
      const before = errors.length;
      await wait(150);
      return errors.slice(before);
    },
    close() {
      console.error = originalError;
      console.warn = originalWarn;
      window.close();
    },
  };
}

const INTERACTIVE = 'button, a[href], [role="button"], [role="tab"], [role="radio"], summary';

function accessibleName(element) {
  const text = (element.textContent ?? '').trim();
  if (text) return text;
  const label = element.getAttribute('aria-label');
  if (label && label.trim()) return label.trim();
  const title = element.getAttribute('title');
  if (title && title.trim()) return title.trim();
  return '';
}

/** Structural checks that both route smoke and the a11y audit share. */
export function collectDomIssues(document) {
  const critical = [];
  const warnings = [];

  const main = document.querySelector('main#main, [role="main"]#main');
  if (!main) critical.push('main landmark #main tidak ada');

  if (!document.documentElement.getAttribute('lang')) critical.push('html lang kosong');

  const seen = new Map();
  for (const element of document.querySelectorAll('[id]')) {
    const id = element.id;
    if (!id) continue;
    seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  for (const [id, count] of seen) {
    if (count > 1) critical.push(`id duplikat: ${id} ×${count}`);
  }

  for (const element of document.querySelectorAll(INTERACTIVE)) {
    if (!accessibleName(element)) {
      critical.push(`kontrol tanpa nama: <${element.tagName.toLowerCase()}>`);
    }
  }

  for (const image of document.querySelectorAll('img:not([alt])')) {
    critical.push(`img tanpa alt: ${image.getAttribute('src') ?? '(tanpa src)'}`);
  }

  for (const element of document.querySelectorAll('[aria-labelledby], [aria-describedby]')) {
    for (const attr of ['aria-labelledby', 'aria-describedby']) {
      const value = element.getAttribute(attr);
      if (!value) continue;
      for (const id of value.split(/\s+/).filter(Boolean)) {
        if (!document.getElementById(id)) critical.push(`${attr} menunjuk id tidak ada: ${id}`);
      }
    }
  }

  for (const control of document.querySelectorAll('input:not([type="hidden"]), select, textarea')) {
    const id = control.id;
    const escaped = globalThis.CSS?.escape ? globalThis.CSS.escape(id) : String(id).replace(/["\\]/g, '\\$&');
    const labelled =
      control.getAttribute('aria-label') ||
      control.getAttribute('aria-labelledby') ||
      control.closest('label') ||
      (id ? document.querySelector(`label[for="${escaped}"]`) : null);
    if (!labelled) critical.push(`kontrol form tanpa label: <${control.tagName.toLowerCase()}>`);
  }

  for (const element of document.querySelectorAll('[tabindex]')) {
    const value = Number(element.getAttribute('tabindex'));
    if (Number.isFinite(value) && value > 0) warnings.push(`tabindex positif: ${value}`);
  }

  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  if (headings.length === 0) warnings.push('tidak ada heading');
  if (!document.querySelector('h1')) warnings.push('tidak ada h1');

  return { critical, warnings, headings: headings.length, hasH1: Boolean(document.querySelector('h1')) };
}

export { wait };
