---
name: sandbox-webapp-toolchain
description: Use when starting or debugging a web app inside the DSH Windows sandbox where child processes with piped stdio may be denied. Probes the environment and chooses a toolchain that actually runs (tsc + Rollup + jsdom instead of Vite/Playwright when needed).
---

# Sandbox web-app toolchain

## When to use

- Memulai web app di sandbox DSH/Windows.
- `vite`/`vitest`/`esbuild` gagal dengan `spawn EPERM` atau `EPERM: operation not permitted`.
- `npm install` gagal karena cache/lifecycle di luar workspace.
- Headless Chrome gagal dengan `mojo platform_channel Access is denied`.

## Probe (jangan menebak)

1. **Node/npm**: `node -v`, `npm -v` (butuh Node ≥22.6 untuk type stripping).
2. **Registry**: `node -e "fetch('https://registry.npmjs.org/react/latest').then(r=>r.json()).then(j=>console.log(j.version))"`.
3. **Spawn pipe vs inherit**: spawn `process.execPath -e "process.exit(0)"` dengan
   `stdio: 'pipe'` dan `stdio: 'inherit'`. Jika pipe EPERM tetapi inherit lolos, esbuild/Vite
   tidak bisa dipakai.
4. **Cache**: `npm config get cache`. Jika di luar workspace, set `.npmrc`:
   `cache=.npm-cache` + `fund=false` + `audit=false`.
5. **Browser**: coba Chrome `--headless=new --dump-dom "data:text/html,<h1>x</h1>"`.
   Jika gagal `mojo`, gunakan jsdom.

## Decision tree

| Hasil probe | Toolchain |
|---|---|
| spawn pipe OK, browser OK | Vite + Vitest + Playwright boleh. |
| spawn pipe EPERM, browser gagal | **tsc/Rollup in-process + Terser + jsdom** (seperti repo ini). |
| registry gagal | Vendor dependencies atau gunakan yang sudah terpasang; jangan menulis kode yang butuh install. |

## Resep yang terbukti di repo ini

- Bundle: Rollup + `ts.transpileModule` + `@rollup/plugin-node-resolve` + `commonjs` + Terser.
- Dev: `scripts/dev.mjs` (Rollup watch + static server + SSE reload + `tsc` watch).
- Test: harness sendiri (`src/testkit.ts`) + Node type stripping, satu proses.
- Build: `scripts/build.mjs` (typecheck → bundle → CSS → SW → budget → metrics).
- Runtime smoke: jsdom memuat **bundle produksi** (`scripts/smoke.mjs`, `app-harness.mjs`).
- Screenshot: tidak tersedia; verifikasi visual manual. Jangan mengklaim screenshot otomatis.

## Pitfalls

- Jangan mengawasi root workspace dengan `fs.watch`; output `.dev`/`.metrics` memicu loop.
  Awasi `src/` + `index.html`.
- `npm install` mungkin butuh `--ignore-scripts`; jangan hapus flag tanpa menguji.
- jsdom butuh polyfill `matchMedia`, `scrollTo`, `speechSynthesis`, `HTMLDialogElement`.
- Jangan memakai `CSS.escape` tanpa cek global; sediakan fallback.
- Set metrik stale: build harus menghapus `.metrics/{build,smoke,latest}.json` di awal.
- `process.exit` sebelum menutup jsdom bisa meninggalkan proses; tutup dulu.

## Definition of done

- [ ] `npm run dev` menyajikan HTML + JS + CSS.
- [ ] `npm run build` < budget dan menulis metrik.
- [ ] Test + runtime smoke lulus tanpa console error.
- [ ] Dokumentasikan toolchain yang dipakai dan alasannya di README/AGENTS.
