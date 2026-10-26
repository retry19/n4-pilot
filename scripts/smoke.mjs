#!/usr/bin/env node
/**
 * Runtime smoke test: loads the **production bundle** into jsdom and walks the
 * first-run journey (onboarding → session → answer → recap → today).
 *
 * Why jsdom: this sandbox denies the named pipes Chrome needs, so a headless
 * browser cannot launch. jsdom runs the same bundle in-process, which still
 * catches render crashes, broken routing and state bugs.
 *
 * Usage: npm run build && npm run smoke
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const assetDir = path.join(DIST, 'assets');
if (!fs.existsSync(assetDir)) {
  console.error('dist/assets not found — run `npm run build` first.');
  process.exit(1);
}
const bundle = fs
  .readdirSync(assetDir)
  .filter((file) => file.endsWith('.js'))
  .map((file) => path.join(assetDir, file))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
if (!bundle) {
  console.error('no JS bundle in dist/assets');
  process.exit(1);
}

const errors = [];
const warnings = [];

const dom = new JSDOM(
  `<!doctype html><html lang="id"><head><title>N4 Pilot</title></head><body><a class="skip-link" href="#main">Lewati</a><div id="root"></div><div id="boot"></div></body></html>`,
  { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' },
);

const { window } = dom;
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

const { document } = window;
const defineGlobal = (name, value) => {
  try {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  } catch {
    globalThis[name] = value;
  }
};
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

const originalError = console.error;
console.error = (...args) => {
  errors.push(args.map(String).join(' '));
  originalError(...args);
};
console.warn = (...args) => {
  warnings.push(args.map(String).join(' '));
};

const wait = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));
const text = () => {
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll('dialog:not([open])').forEach((dialog) => dialog.remove());
  return clone.textContent ?? '';
};
const buttons = () =>
  [...document.querySelectorAll('button')].filter((button) => !button.closest('dialog:not([open])'));
const buttonWith = (label) => buttons().find((button) => (button.textContent ?? '').trim().includes(label));
const click = async (label) => {
  const button = buttonWith(label);
  if (!button) throw new Error(`button not found: "${label}"\n--- visible text ---\n${text().slice(0, 800)}`);
  button.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await wait();
  return button;
};
let stepCount = 0;
let stepPassed = 0;
const startedAt = Date.now();
const METRICS_DIR = path.join(ROOT, '.metrics');

const step = async (name, fn) => {
  stepCount += 1;
  process.stdout.write(`  • ${name} … `);
  await fn();
  stepPassed += 1;
  process.stdout.write('ok\n');
};

function writeSmokeMeta(payload) {
  try {
    fs.mkdirSync(METRICS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(METRICS_DIR, 'smoke.json'),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          bundle: path.basename(bundle),
          steps: stepCount,
          passed: payload.passed,
          durationMs: Date.now() - startedAt,
          ...(payload.failure ? { failure: payload.failure } : {}),
          ...(payload.warnings !== undefined ? { warnings: payload.warnings } : {}),
        },
        null,
        2,
      ),
    );
  } catch {
    // metrics are optional; never fail a smoke run because of them
  }
}

async function main() {
  console.log(`\nSmoke testing ${path.basename(bundle)} in jsdom\n`);
  await import(`file://${bundle}?smoke=${Date.now()}`);
  await wait(120);

  await step('onboarding renders', async () => {
    if (!text().includes('Dari nol ke N4')) throw new Error('welcome headline missing');
    if (document.getElementById('boot')) throw new Error('boot shell not removed');
  });

  await step('welcome → starting point', async () => {
    await click('Mulai');
    if (!text().includes('Kamu mulai dari mana')) throw new Error('start step missing');
  });
  await step('starting point → exam date', async () => {
    await click('Lanjut');
    if (!text().includes('Kapan kamu ingin ujian')) throw new Error('date step missing');
  });
  await step('exam date → time budget', async () => {
    await click('Lanjut');
    if (!text().includes('Berapa waktu')) throw new Error('budget step missing');
  });
  await step('time budget → reality check', async () => {
    await click('Lihat rencanaku');
    if (!text().includes('Ini matematikanya')) throw new Error('reality step missing');
    if (!text().includes('700 jam')) throw new Error('planning target missing');
    if (text().toLowerCase().includes('gagal')) throw new Error('onboarding uses the word "gagal"');
  });
  await step('reality check → plan preview', async () => {
    await click('Lihat rencana yang cocok');
    if (!text().includes('Rencanamu menuju')) throw new Error('preview step missing');
    if (!text().includes('Ini versi beta')) throw new Error('beta disclaimer missing');
  });
  await step('preview → first session', async () => {
    await click('Mulai 10 menit pertama');
    await wait(180);
    if (!document.querySelector('.session')) {
      throw new Error(`session did not mount\n--- text ---\n${text().slice(0, 1200)}`);
    }
  });

  let answered = 0;
  await step('walks the whole session and answers cards', async () => {
    let guard = 0;
    while (guard < 60) {
      guard += 1;
      if (buttonWith('Kembali ke Hari Ini')) break;
      if (buttonWith('Coba 1 soal')) {
        await click('Coba 1 soal');
        continue;
      }
      const options = buttons().filter((button) => button.getAttribute('role') === 'radio');
      if (options.length > 0) {
        options[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
        await wait(80);
        const submit = buttons().find((button) => (button.textContent ?? '').trim() === 'Jawab');
        if (!submit) {
          throw new Error(
            `submit button missing after selecting an option\nbuttons: ${buttons()
              .map((button) => (button.textContent ?? '').trim().slice(0, 30))
              .join(' | ')}`,
          );
        }
        submit.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
        await wait(100);
        answered += 1;
        if (!text().includes('Benar') && !text().includes('Belum tepat')) {
          throw new Error('feedback did not render after answering');
        }
        if (buttonWith('Lanjut')) await click('Lanjut');
        else if (buttonWith('Lihat rangkuman')) await click('Lihat rangkuman');
        else if (buttonWith('Kartu berikutnya')) await click('Kartu berikutnya');
        continue;
      }
      if (buttonWith('Lanjut')) {
        await click('Lanjut');
        continue;
      }
      if (buttonWith('Lihat rangkuman')) {
        await click('Lihat rangkuman');
        continue;
      }
      break;
    }
    if (answered < 3) throw new Error(`expected at least 3 answered cards, got ${answered}`);
  });

  await step('session reaches recap and saves', async () => {
    if (!buttonWith('Kembali ke Hari Ini')) {
      throw new Error(`recap finish button missing\n--- text ---\n${text().slice(0, 900)}`);
    }
    await click('Kembali ke Hari Ini');
    await wait(150);
  });

  await step('today shows evidence and readiness', async () => {
    await wait(150);
    if (!text().includes('Kesiapan')) throw new Error('readiness card missing');
    if (!text().includes('Bukti terbaru')) throw new Error('evidence section missing');
    if (text().includes('Tidak ada sesi aktif')) throw new Error('still stuck in session');
  });

  await step('plan screen renders phases', async () => {
    window.location.hash = '#/plan';
    await wait(120);
    if (!text().includes('Menuju')) throw new Error('plan title missing');
    if (!text().includes('Fondasi')) throw new Error('phase timeline missing');
  });

  await step('progress screen explains insufficient evidence', async () => {
    window.location.hash = '#/progress';
    await wait(120);
    if (!text().includes('Kesiapan N4')) throw new Error('progress title missing');
    if (!text().includes('Belum cukup data') && !text().includes('Di jalur')) {
      throw new Error('progress state copy missing');
    }
  });

  await step('practice hub lists mock and drills', async () => {
    window.location.hash = '#/practice';
    await wait(120);
    if (!text().includes('Latihan yang mirip ujian')) throw new Error('practice title missing');
    if (!text().includes('Mock A')) throw new Error('mock form missing');
    if (!text().includes('Drill seksi')) throw new Error('drills missing');
  });

  await step('library search finds a word', async () => {
    window.location.hash = '#/library';
    await wait(120);
    const input = document.querySelector('input[type="search"]');
    if (!input) throw new Error('search input missing');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'たべる');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    await wait(120);
    if (!text().includes('makan')) throw new Error('search result for taberu missing');
  });

  await step('error notebook renders empty state', async () => {
    window.location.hash = '#/errors';
    await wait(120);
    if (!text().includes('Kesalahan')) throw new Error('errors title missing');
  });

  await step('profile exposes accessibility settings', async () => {
    window.location.hash = '#/profile';
    await wait(160);
    if (!text().includes('Profil & pengaturan')) throw new Error('profile title missing');
    if (!text().includes('Ukuran teks')) throw new Error('accessibility settings missing');
    if (!text().includes('Ekspor data')) throw new Error('data export missing');
  });

  await step('persistence wrote a versioned document', async () => {
    const raw = window.localStorage.getItem('n4pilot.state');
    if (!raw) throw new Error('state was not persisted');
    const parsed = JSON.parse(raw);
    if (parsed.schemaVersion !== 1) throw new Error('schema version missing');
    if (!parsed.profile?.onboardingComplete) throw new Error('onboarding not persisted');
    if (!parsed.goal?.examDate) throw new Error('goal not persisted');
    if (Object.keys(parsed.cards ?? {}).length === 0) throw new Error('no FSRS cards created');
    if ((parsed.attempts ?? []).length === 0) throw new Error('no attempts recorded');
  });

  await step('starts Mock A from the overview', async () => {
    window.location.hash = '#/mock/form-a';
    await wait(150);
    if (!text().includes('Aturan')) throw new Error('mock overview missing');
    const checkbox = document.querySelector('input[type="checkbox"]');
    if (!checkbox) throw new Error('readiness checkbox missing');
    checkbox.click();
    await wait(80);
    await click('Mulai Mock A');
    await wait(200);
    if (!document.querySelector('.mock-shell')) throw new Error('mock runner did not mount');
    if (!text().includes('Bahasa & Kosakata')) throw new Error('first section missing');
  });

  await step('answers, jumps to the end and finishes all three sections', async () => {
    for (let section = 0; section < 3; section += 1) {
      const options = buttons().filter((button) => button.getAttribute('role') === 'radio');
      if (options.length === 0) throw new Error(`no options in section ${section + 1}`);
      options[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await wait(80);
      await click('Lembar jawaban');
      await wait(80);
      const cells = [...document.querySelectorAll('.answer-cell')];
      if (cells.length === 0) throw new Error('answer sheet is empty');
      cells[cells.length - 1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await wait(80);
      await click('Selesai');
      await wait(120);
      if (section < 2) {
        await click('Selesai seksi & istirahat');
        await wait(150);
        if (!text().includes('Istirahat')) throw new Error('break screen missing');
        await click('Lanjut sekarang');
        await wait(200);
      } else {
        await click('Kirim & lihat laporan');
        await wait(400);
      }
    }
    if (!document.querySelector('.report-hero')) {
      throw new Error(`mock report did not render\n${text().slice(0, 800)}`);
    }
    if (!text().includes('3 wins') || !text().includes('3 leaks')) throw new Error('wins/leaks missing');
    if (!text().includes('estimasi, bukan skor resmi')) throw new Error('official-score disclaimer missing');
  });

  await step('score report exposes gates and item review', async () => {
    if (!text().includes('Gate')) throw new Error('gates missing');
    if (!text().includes('Pembahasan item')) throw new Error('item review missing');
    if (!text().includes('Rencana 7 hari')) throw new Error('next 7 days missing');
  });

  await step('mock answers feed the error notebook and readiness', async () => {
    window.location.hash = '#/errors';
    await wait(200);
    const raw = JSON.parse(window.localStorage.getItem('n4pilot.state'));
    if ((raw.errors ?? []).length === 0) throw new Error('no error events captured from the mock');
    if (!text().includes('Yang dilakukan')) throw new Error('remediation copy missing');
    if ((raw.mocks ?? []).length !== 1) throw new Error('mock attempt not persisted');
    if (!raw.readinessHistory?.length) throw new Error('readiness snapshot not recorded');
  });

  await step('section drill starts from practice', async () => {
    window.location.hash = '#/practice';
    await wait(200);
    await click('Kosakata');
    await wait(250);
    const options = buttons().filter((button) => button.getAttribute('role') === 'radio');
    if (options.length === 0) throw new Error('drill did not render a question');
    options[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(80);
    await click('Jawab');
    await wait(100);
    if (!text().includes('Benar') && !text().includes('Belum tepat')) throw new Error('drill feedback missing');
  });

  await step('no duplicate ids and every button has a name', async () => {
    window.location.hash = '#/today';
    await wait(200);
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) throw new Error(`duplicate ids: ${[...new Set(duplicates)].join(', ')}`);
    const unnamed = buttons().filter(
      (button) =>
        !(button.textContent ?? '').trim() &&
        !button.getAttribute('aria-label') &&
        !button.getAttribute('title'),
    );
    if (unnamed.length > 0) throw new Error(`${unnamed.length} button(s) tanpa nama aksesibel`);
    if (!document.querySelector('main#main')) throw new Error('main landmark with id=main missing');
  });

  if (errors.length > 0) {
    console.log(`\n✗ ${errors.length} console error(s):`);
    for (const error of errors.slice(0, 8)) console.log('  ' + error.slice(0, 400));
    process.exit(1);
  }

  const ignored = warnings.filter((w) => !w.includes('not implemented') && !w.includes('act('));
  if (ignored.length > 0) {
    console.log(`\n! ${ignored.length} warning(s):`);
    for (const warning of ignored.slice(0, 5)) console.log('  ' + warning.slice(0, 300));
  }

  console.log(`\n✓ smoke journey passed (${new Set(warnings).size} harmless warnings)\n`);
  writeSmokeMeta({ passed: true, warnings: new Set(warnings).size });
  process.exit(0);
}

main().catch((error) => {
  console.error('\n✗ smoke failed:', error?.message ?? error);
  if (errors.length) {
    console.error('\nconsole errors:');
    for (const item of errors.slice(0, 6)) console.error('  ' + item.slice(0, 400));
  }
  writeSmokeMeta({ passed: false, failure: String(error?.message ?? error).slice(0, 500) });
  process.exit(1);
});
