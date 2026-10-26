// Shared build helpers: TypeScript transform for Rollup + CSS bundling.
// Deliberately in-process only: this sandbox denies child processes with piped
// stdio, which rules out esbuild/Vite. tsc + Rollup run in-process.
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

export const TS_OPTIONS = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true,
  allowImportingTsExtensions: true,
  isolatedModules: true,
  sourceMap: true,
  inlineSources: false,
  useDefineForClassFields: true,
  importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
};

/** Rollup plugin: TS/TSX -> ESM using TypeScript's transpileModule. */
export function tsTransform() {
  return {
    name: 'n4-ts',
    transform(code, id) {
      const clean = id.split('?')[0];
      if (!/\.tsx?$/.test(clean) || clean.includes('node_modules')) return null;
      const result = ts.transpileModule(code, {
        fileName: clean,
        compilerOptions: { ...TS_OPTIONS, sourceMap: true },
        reportDiagnostics: false,
      });
      return { code: result.outputText, map: result.sourceMapText ?? null };
    },
  };
}

/** Rollup plugin: textual NODE_ENV replacement so dead code is dropped. */
export function defineEnv(mode) {
  const value = JSON.stringify(mode);
  return {
    name: 'n4-define-env',
    transform(code) {
      if (!code.includes('process.env.NODE_ENV')) return null;
      return { code: code.split('process.env.NODE_ENV').join(value), map: null };
    },
  };
}

/** Rollup plugin: replace build-time flags like `__DEV__`. */
export function defineValue(entries) {
  const pairs = Object.entries(entries);
  return {
    name: 'n4-define-value',
    transform(code) {
      if (!pairs.some(([key]) => code.includes(key))) return null;
      let out = code;
      for (const [key, value] of pairs) out = out.split(key).join(value);
      return { code: out, map: null };
    },
  };
}

/**
 * Resolve `@import` statements into a single CSS file.
 * Nested imports are resolved relative to the importing file; remote/data URLs
 * are left untouched. Keeps dev (native @import) and prod (one file) identical.
 */
export function bundleCss(entryPath) {
  const seen = new Set();

  const read = (file) => {
    const abs = path.resolve(file);
    if (seen.has(abs)) return '';
    seen.add(abs);
    let css = fs.readFileSync(abs, 'utf8');
    css = css.replace(/@import\s+(?:url\()?["']([^"')]+)["']\)?\s*;/g, (match, spec) => {
      if (/^(https?:)?\/\//.test(spec) || spec.startsWith('data:')) return match;
      return read(path.resolve(path.dirname(abs), spec));
    });
    return css;
  };

  return read(entryPath).trim() + '\n';
}

/** Minimal deterministic hash for cache-busted asset names. */
export function shortHash(input, length = 8) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
  }
  return (h1.toString(36) + h2.toString(36)).slice(0, length);
}

export function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(abs, base));
    else out.push('/' + path.relative(base, abs).split(path.sep).join('/'));
  }
  return out;
}

export { ROOT };
