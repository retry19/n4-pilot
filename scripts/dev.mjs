#!/usr/bin/env node
// Dev server: in-process Rollup watch + static file server with live reload.
// No esbuild/Vite (blocked by sandbox: child processes with piped stdio fail).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import ts from 'typescript';
import { tsTransform, defineEnv, defineValue, bundleCss, ROOT } from './lib/build-utils.mjs';

const PORT = Number(process.env.PORT || 5173);
const OUT = path.join(ROOT, '.dev');
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });

const clients = new Set();
const reload = () => {
  for (const res of clients) res.write('data: reload\n\n');
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
};

let lastBuildError = null;

async function build() {
  const watcher = await rollup({
    input: path.join(ROOT, 'src/main.tsx'),
    plugins: [
      tsTransform(),
      nodeResolve({
        browser: true,
        extensions: ['.ts', '.tsx', '.mjs', '.js', '.json'],
        dedupe: ['react', 'react-dom'],
      }),
      commonjs({ transformMixedEsModules: true }),
      defineEnv('development'),
      defineValue({ __DEV__: 'true' }),
    ],
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') return;
      warn(warning);
    },
  });
  await watcher.write({
    file: path.join(OUT, 'assets/app.js'),
    format: 'es',
    sourcemap: true,
  });
  await watcher.close();
  lastBuildError = null;
  console.log(`[dev] bundle ok · ${new Date().toLocaleTimeString('id-ID')}`);
  reload();
}

function startWatch() {
  let timer = null;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      build().catch((err) => {
        lastBuildError = err;
        console.error('\n[dev] build failed:\n' + (err?.message || err) + '\n');
        reload();
      });
    }, 60);
  };
  // Watch only source files: watching the workspace root would rebuild on our
  // own .dev output (and on npm cache writes).
  fs.watch(path.join(ROOT, 'src'), { recursive: true }, trigger);
  fs.watchFile(path.join(ROOT, 'index.html'), trigger);
  return trigger;
}

function startTypewatch() {
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) return;
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  const config = ts.parseJsonConfigFileContent(read.config, ts.sys, ROOT);
  const host = ts.createWatchCompilerHost(
    configPath,
    { ...config.options, noEmit: true },
    ts.sys,
    ts.createEmitAndSemanticDiagnosticsBuilderProgram,
    (diagnostic) => report(diagnostic, ts.DiagnosticCategory.Error),
    (diagnostic) => report(diagnostic, ts.DiagnosticCategory.Warning),
    () => {},
  );
  ts.createWatchProgram(host);
}

let lastDiag = '';
function report(diagnostic, category) {
  const text = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
  const prefix = category === ts.DiagnosticCategory.Error ? 'error TS' : 'warning TS';
  let where = '';
  if (diagnostic.file) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start || 0);
    where = `${path.relative(ROOT, diagnostic.file.fileName)}:${line + 1}:${character + 1} · `;
  }
  const message = `${where}${prefix}${diagnostic.code}: ${text}`;
  if (message === lastDiag) return;
  lastDiag = message;
  console.log(category === ts.DiagnosticCategory.Error ? `[typecheck] ${message}` : `[typecheck] ${message}`);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 500\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (url.pathname === '/assets/app.css') {
    try {
      const css = bundleCss(path.join(ROOT, 'src/styles/index.css'));
      res.writeHead(200, { 'Content-Type': MIME['.css'], 'Cache-Control': 'no-store' });
      res.end(css);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(String(err));
    }
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    html = html
      .replace('<!--app-css-->', '<link rel="stylesheet" href="/assets/app.css" />')
      .replace(
        '<!--app-js-->',
        `<script>
          addEventListener('beforeunload', () => {});
          const es = new EventSource('/__reload');
          es.onmessage = () => location.reload();
        </script>
        <script type="module" src="/assets/app.js"></script>`,
      );
    if (lastBuildError) {
      html = html.replace(
        '<div id="root"></div>',
        `<div id="root"></div><pre style="position:fixed;left:0;right:0;bottom:0;max-height:40vh;overflow:auto;background:#B83A32;color:#fff;padding:16px;font:12px/1.5 monospace;z-index:9999">${escapeHtml(
          String(lastBuildError?.message || lastBuildError),
        )}</pre>`,
      );
    }
    res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
    res.end(html);
    return;
  }

  const asset = url.pathname.startsWith('/assets/') ? path.join(OUT, url.pathname) : path.join(ROOT, 'public', url.pathname);
  if (fs.existsSync(asset) && fs.statSync(asset).isFile()) {
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(asset)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(asset).pipe(res);
    return;
  }

  if (url.pathname.startsWith('/src/')) {
    const srcFile = path.join(ROOT, url.pathname);
    if (fs.existsSync(srcFile) && fs.statSync(srcFile).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME['.css'], 'Cache-Control': 'no-store' });
      fs.createReadStream(srcFile).pipe(res);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

startWatch();
startTypewatch();
build()
  .then(() => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`\n  N4 Pilot dev\n  → http://127.0.0.1:${PORT}\n`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
