#!/usr/bin/env node
// Production build: typecheck (tsc API) -> Rollup -> CSS -> public copy -> PWA.
// Everything runs in-process; see scripts/lib/build-utils.mjs for why.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import ts from 'typescript';
import {
  tsTransform,
  defineEnv,
  defineValue,
  bundleCss,
  shortHash,
  listFiles,
  ROOT,
} from './lib/build-utils.mjs';

const DIST = path.join(ROOT, 'dist');
const started = Date.now();

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function typecheck() {
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) throw new Error('tsconfig.json not found');
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, ROOT);
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
  const diagnostics = [
    ...program.getSyntacticDiagnostics(),
    ...program.getSemanticDiagnostics(),
    ...program.getGlobalDiagnostics(),
  ];
  if (diagnostics.length) {
    const host = {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: () => ROOT,
      getNewLine: () => '\n',
    };
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
    throw new Error(`${diagnostics.length} TypeScript error(s)`);
  }
  console.log(`[build] typecheck ok (${program.getSourceFiles().length} files)`);
}

async function bundle() {
  const build = await rollup({
    input: path.join(ROOT, 'src/main.tsx'),
    plugins: [
      tsTransform(),
      nodeResolve({
        browser: true,
        extensions: ['.ts', '.tsx', '.mjs', '.js', '.json'],
        dedupe: ['react', 'react-dom'],
      }),
      commonjs({ transformMixedEsModules: true }),
      defineEnv('production'),
      defineValue({ __DEV__: 'false' }),
      terser({
        compress: { passes: 1, drop_debugger: true },
        mangle: true,
        format: { comments: false },
      }),
    ],
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY' || warning.code === 'THIS_IS_UNDEFINED') return;
      warn(warning);
    },
  });
  const { output } = await build.generate({
    format: 'es',
    sourcemap: false,
    entryFileNames: '[name]-[hash].js',
    inlineDynamicImports: true,
  });
  await build.close();
  const chunk = output.find((o) => o.type === 'chunk');
  if (!chunk) throw new Error('no JS chunk produced');
  return chunk;
}

function writeServiceWorker(precache) {
  const version = shortHash(precache.join('|'), 10);
  const sw = `/* N4 Pilot service worker — generated at build time. */
const VERSION = '${version}';
const CACHE = 'n4pilot-' + VERSION;
const PRECACHE = ${JSON.stringify(precache, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || Response.error()))
    );
    return;
  }

  const cached = caches.match(req);
  event.respondWith(
    cached.then((hit) => {
      if (hit) {
        // Refresh in the background for app-owned assets.
        if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/fonts/')) return hit;
        fetch(req).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
`;
  fs.writeFileSync(path.join(DIST, 'sw.js'), sw, 'utf8');
  return version;
}

async function main() {
  rmrf(DIST);
  fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });

  // Invalidate verified metrics: a build without smoke/report must never look current.
  for (const stale of ['build.json', 'smoke.json', 'latest.json']) {
    fs.rmSync(path.join(ROOT, '.metrics', stale), { force: true });
  }

  typecheck();

  const chunk = await bundle();
  const jsName = path.basename(chunk.fileName);
  const jsCode = chunk.code;
  const jsGzip = zlib.gzipSync(jsCode).length;
  fs.writeFileSync(path.join(DIST, 'assets', jsName), jsCode, 'utf8');
  console.log(`[build] js   ${jsName} · ${(jsCode.length / 1024).toFixed(1)} KB raw · ${(jsGzip / 1024).toFixed(1)} KB gzip`);

  const css = bundleCss(path.join(ROOT, 'src/styles/index.css'));
  const cssName = `app-${shortHash(css)}.css`;
  const cssGzip = zlib.gzipSync(css).length;
  fs.writeFileSync(path.join(DIST, 'assets', cssName), css, 'utf8');
  console.log(`[build] css  ${cssName} · ${(css.length / 1024).toFixed(1)} KB raw · ${(cssGzip / 1024).toFixed(1)} KB gzip`);

  // Copy public assets (fonts, icons, manifest).
  const publicDir = path.join(ROOT, 'public');
  if (fs.existsSync(publicDir)) {
    fs.cpSync(publicDir, DIST, { recursive: true });
  }

  // index.html with content-hashed references.
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  html = html
    .replace('<!--app-css-->', `<link rel="stylesheet" href="/assets/${cssName}" />`)
    .replace(
      '<!--app-js-->',
      `<script type="module" src="/assets/${jsName}" crossorigin></script>`,
    );
  fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');

  // Precache list: shell + hashed assets + fonts + icons.
  const precache = ['/', '/index.html', `/assets/${jsName}`, `/assets/${cssName}`, '/manifest.webmanifest'];
  for (const file of listFiles(path.join(DIST, 'fonts'))) precache.push(file);
  for (const file of listFiles(path.join(DIST, 'icons'))) precache.push(file);
  const swVersion = writeServiceWorker(precache);

  const budget = jsGzip / 1024;
  const status = budget <= 200 ? 'PASS' : 'OVER BUDGET';

  // Machine-readable build metadata for `npm run report` / docs metrics.
  const metricsDir = path.join(ROOT, '.metrics');
  fs.mkdirSync(metricsDir, { recursive: true });
  fs.writeFileSync(
    path.join(metricsDir, 'build.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        js: { file: jsName, raw: jsCode.length, gzip: jsGzip },
        css: { file: cssName, raw: css.length, gzip: cssGzip },
        precache: precache.length,
        swVersion,
        budget: { limitKb: 200, gzipKb: Number(budget.toFixed(1)), ok: budget <= 200 },
      },
      null,
      2,
    ),
  );

  console.log(`[build] pwa  sw ${swVersion} · precache ${precache.length} files`);
  console.log(`[build] budget initial JS <200KB gzip: ${budget.toFixed(1)} KB — ${status}`);
  console.log(`[build] done in ${((Date.now() - started) / 1000).toFixed(1)}s → dist/`);
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});
