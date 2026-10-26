# N4 Pilot

**Dari nol ke JLPT N4 — dengan rencana yang jujur dan latihan yang terbukti.**

N4 Pilot adalah PWA mobile-first (Bahasa Indonesia) yang mengubah tanggal ujian menjadi rencana harian, menjadwalkan
review dengan FSRS, dan menunjukkan kesiapan sebagai **rentang + gate + bukti** — bukan skor palsu atau streak.

> **Status: 0.1.0-beta (vertical slice).** Loop inti berjalan end-to-end. Konten masih seed (±5% target beta),
> audio memakai TTS perangkat, belum ada backend. Semua skor adalah estimasi, bukan skor resmi JLPT.

---

## Status terverifikasi

Angka di bawah dihasilkan oleh `npm run report` dan dijaga oleh `npm run docs:check`. Jangan edit manual — jalankan
`npm run docs:sync` setelah build + smoke + report.

<!-- metrics:start -->
| Metrik | Nilai |
|---|---:|
| Test | 72/72 lulus |
| Konten | 208 kana · 60 kata · 24 kanji · 14 grammar · 5 bacaan · 10 listening |
| Mock | 2 form × 65 soal |
| JS awal | 144,4 KB gzip · PASS |
| CSS | 10,2 KB gzip |
| Smoke | 23 langkah |
| Routes | 20/20 route |
| A11y | 0 critical · 0 warning · 0 kontras gagal |
| Copy | 0 temuan |
| Integritas konten | lolos |
<!-- metrics:end -->

---

## Apa yang bisa dilakukan sekarang

- **Onboarding jujur** — titik awal, tanggal ujian (2027 berlabel “perkiraan”), jam/hari, reality check 575–700–1.000
  jam dengan tiga opsi, preview 7 fase, lalu sesi pertama <10 menit.
- **Hari Ini** — satu CTA, sesi adaptif (Quick 10 / 45 / 90 / 150), fokus mingguan, bukti terbaru, 7 hari ke depan.
- **Sesi** — recall → review → belajar → latihan → menyimak → timed → rangkuman, dengan feedback penyebab + remediasi.
- **FSRS** — exam-aware: interval tidak melewati ujian, item high-weight di-review 5–10 hari sebelum ujian, leech
  ditangani.
- **Readiness** — estimasi per seksi dengan rentang, gate K+R 38, Listening 19, total 90; “Aman” hanya dengan 2 mock
  dan batas bawah ≥95.
- **Mock penuh** — 2 form beta, timer 25/55/35, break, auto-submit, crash recovery, laporan 3 wins/3 leaks.
- **Buku kesalahan** — 12 penyebab, grup per penyebab, fix-it 10 menit, selesai setelah 2 benar di konteks berbeda.
- **Perpustakaan** — 208 kana, 60 kata, 24 kanji, 14 grammar, 5 bacaan, 10 listening; cari, baca, tambah ke review.
- **Offline & lokal** — shell di-precache; data di perangkat; ekspor/impor JSON.

---

## Menjalankan

Prasyarat: **Node ≥22.6** (memakai type stripping bawaan). Tidak perlu database.

```bash
npm install        # di sandbox ini: npm install --ignore-scripts
npm run dev        # http://127.0.0.1:5173
```

Produksi:

```bash
npm run build      # typecheck → bundle → CSS → service worker → budget
npm run preview    # http://127.0.0.1:4173
```

### Script

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Rollup watch + static server + SSE reload + `tsc` watch |
| `npm run build` | Typecheck, bundle minified, CSS, manifest copy, generate `sw.js`, cek budget, tulis `.metrics/build.json` |
| `npm run preview` | Serve `dist/` dengan SPA fallback |
| `npm test` | Test domain + konten (satu proses, ~0,1 dtk) |
| `npm run test:watch` | Test watch |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run smoke` | Jalankan **bundle produksi** di jsdom (journey penuh), tulis `.metrics/smoke.json` |
| `npm run smoke:routes` | Render 20 route dengan state skenario; gagal pada console error/DOM rusak |
| `npm run audit:a11y` | Cek route (label, id, heading) + kontras token light/dark |
| `npm run lint:copy` | Larangan copy: gagal/Salah!/Anda/streak/guarantee |
| `npm run scenario -- <id>` | Fixture state (`new`, `recovery`, `listening-gate`, `two-mocks`, `leech`, `exam-week`) → `fixtures/` (gitignored) |
| `npm run inspect -- "<expr>"` | Evaluasi ekspresi terhadap `core`/`content` tanpa script sementara |
| `npm run content:report` | Coverage vs target beta + integritas + balance mock (`--json`, `--write`) |
| `npm run report` | Satu sumber metrik terverifikasi: test, konten, build, smoke, route, a11y, copy |
| `npm run docs:check` | Gagal jika blok metrik di README/PROGRESS kedaluwarsa |
| `npm run docs:sync` | Tulis ulang blok metrik dari `.metrics/latest.json` |
| `npm run verify` | copy → test → typecheck → build → smoke → routes → a11y → report → docs:check |
| `npm run icons` | Regenerasi ikon PWA (butuh Pillow) |

### Tooling & index

Alat bantu ini dibuat karena pekerjaan yang sama berulang: mencari angka, membuat state, dan menjaga docs tidak
bohong. Index lengkap untuk agent ada di [`AGENTS.md`](./AGENTS.md).

| Alat | Kapan dipakai | Contoh |
|---|---|---|
| `inspect` | Saat butuh jawaban cepat dari data/engine | `npm run inspect -- "content.CURRICULUM.filter(u => u.phase === 'foundations').length"` |
| `scenario` | Butuh state gate gagal / recovery / exam week | `npm run scenario -- listening-gate --today 2026-10-26` |
| `content:report` | Sebelum menambah konten / setelah mengubahnya | `npm run content:report -- --json` |
| `smoke:routes` | Setelah mengubah layar/route | `npm run smoke:routes -- --scenario listening-gate` |
| `audit:a11y` | Setelah mengubah komponen/copy/token | `npm run audit:a11y` |
| `lint:copy` | Setelah mengubah copy | `npm run lint:copy` |
| `report` | Setelah build + smoke + routes + a11y + copy | `npm run report` |
| `docs:check` / `docs:sync` | Di CI / setelah metrik berubah | `npm run docs:check` |

**Agent skills (sudah dibangun).** Format portabel Agent Skills di [`skills/`](./skills/), index di
[`skills/README.md`](./skills/README.md). Skill dipakai untuk pekerjaan yang butuh penilaian; CLI untuk yang
deterministik. Skill memanggil CLI, bukan menduplikasi logikanya.

| Skill | Trigger | Wajib menjalankan |
|---|---|---|
| [`sandbox-webapp-toolchain`](./skills/sandbox-webapp-toolchain/SKILL.md) | Memulai web app di sandbox ini | probe spawn/registry/Chrome → pilih Vite atau tsc+Rollup+jsdom |
| [`n4-content-authoring`](./skills/n4-content-authoring/SKILL.md) | Menambah kana/kata/kanji/grammar/bacaan/listening | `npm run content:report`, `npm test` |
| [`n4-release-notes`](./skills/n4-release-notes/SKILL.md) | Menutup milestone / menulis CHANGELOG | `npm run verify`, `npm run report`, `npm run docs:check` |
| [`ux-copy-guardrails`](./skills/ux-copy-guardrails/SKILL.md) | Menulis copy UI | `npm run lint:copy`, `npm run smoke:routes` |
| [`n4-scenario-fixtures`](./skills/n4-scenario-fixtures/SKILL.md) | Bug/QA bergantung pada state learner | `npm run scenario`, `npm run smoke:routes` |

Detail lengkap: [`PROGRESS.md`](./PROGRESS.md) · perubahan: [`CHANGELOG.md`](./CHANGELOG.md) ·
panduan agent: [`AGENTS.md`](./AGENTS.md).

---

## Stack & arsitektur

React 19 · TypeScript · zustand · lucide-react · Rollup · Terser · jsdom · Vitest **tidak** dipakai.

```text
src/core      aturan murni: FSRS, planner, readiness, mock scoring, session, error taxonomy, ruby
src/content   konten kanonik + factory StudyCard/Concept/curriculum/mock forms + validasi
src/state     store zustand, derive (plan/readiness/pools), persistence adapter
src/ui        komponen: Sheet (dialog native), OptionList, CardView, AudioButton, RangeBar, nav
src/screens   12 layar: onboarding, today, session, review, plan, practice, progress, errors, library, profile, mock
src/lib       hash router, TTS audio service, hooks
src/styles    token → base → components → screens
scripts       dev/build/test/smoke/smoke:routes/audit:a11y/lint:copy/scenario/inspect/report/docs
skills        SKILL.md portabel (content, release, toolchain, copy, fixtures)
```

Aturan penting:

- `src/core` **tidak boleh** mengimpor React atau DOM.
- Semua jawaban melewati `applyAnswer` di store → attempt, FSRS, error, coverage selalu konsisten.
- Konten deterministik: opsi dan mock diacak dengan seed string, bukan `Math.random`.
- Persistence ada di satu adapter (`src/state/persistence.ts`); migrasi ke IndexedDB/Supabase tidak menyentuh layar.

Detail lengkap: [`PROGRESS.md`](./PROGRESS.md) · perubahan: [`CHANGELOG.md`](./CHANGELOG.md).

---

## Menambah konten

Semua konten adalah TypeScript bertipe di `src/content/`. Furigana memakai sintaks ruby:

```ts
{ ja: '{会社|かいしゃ}まで{電車|でんしゃ}で行きます。', reading: 'かいしゃまででんしゃでいきます。' }
```

Langkah:

1. Tambah item ke `kana.ts` / `vocab.ts` / `kanji.ts` / `grammar.ts` / `reading.ts` / `listening.ts` dengan id stabil.
2. Kartu, konsep, urutan kurikulum, dan mock form dibuat otomatis oleh `cards.ts`.
3. Jalankan `npm run content:report` (integritas harus OK) lalu `npm test` — test konten menolak ruby rusak, opsi
   duplikat, kunci hilang, bukti bacaan yang tidak ada di teks, kanji tanpa kata, grammar tanpa contrast, dan mock
   dengan kartu ganda.

Catatan kualitas: seed ini **belum** direview guru Jepang/Indonesia kedua. Itu gap yang harus ditutup sebelum klaim
“siap N4”.

---

## Testing

| Lapis | Alat | Cakupan |
|---|---|---|
| Domain | `src/testkit.ts` + `*.test.ts` | FSRS (exam clamp, lapse, auto-grade), planner (verdict, gate pinning, recovery), readiness (display rules, no false-safe), session (durasi, listening ≥20%, no duplicates), mock scoring, error taxonomy/resolusi, ruby, validasi konten |
| Konten | `npm run content:report` | Coverage vs target beta, integritas struktur, distribusi kartu/kurikulum, overlap mock |
| Runtime | `scripts/smoke.mjs` (jsdom + bundle produksi) | Onboarding 6 langkah → sesi (konsep, kartu, listening, recap) → Hari Ini → Rencana → Progres → Latihan → pencarian → error → Profil → persistensi → Mock A 3 seksi + break + laporan → error notebook → drill → cek id/label a11y |
| Route | `npm run smoke:routes` | 20 route dengan state skenario; gagal pada console error, duplicate id, kontrol tanpa nama, main landmark hilang |
| A11y | `npm run audit:a11y` | Label/id/heading per route + kontras token light/dark (WCAG 4.5:1) |
| Copy | `npm run lint:copy` | Larangan “gagal”, “Salah!”, “Anda”, streak, guarantee |
| Type | `tsc` | strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` |
| Build | build script | JS awal <200 KB gzip; angka aktual ada di “Status terverifikasi” |
| Metrik/docs | `report` + `docs:check` | Angka test/build/smoke/route/a11y/copy tidak boleh basi di README/PROGRESS |

```bash
npm run verify   # copy → test → typecheck → build → smoke → routes → a11y → report → docs:check
```

---

## Batasan lingkungan pengembangan

Sandbox ini memblokir child process dengan piped stdio. Vite/Vitest/esbuild dan headless Chrome tidak bisa berjalan.
Karena itu:

- bundling memakai Rollup in-process + `ts.transpileModule`;
- test memakai harness sendiri + type stripping Node;
- smoke memakai jsdom terhadap bundle produksi;
- `npm install` butuh `--ignore-scripts` (lifecycle script memakai piped stdio);
- `.npmrc` menyimpan cache npm di dalam workspace.

Di mesin normal, semua perintah bisa dijalankan tanpa `--ignore-scripts`. Arsitektur `src/core` tidak terikat pada
pilihan toolchain.

---

## Privasi & data

- Tidak ada server, akun, atau pelacakan pihak ketiga.
- Data belajar (goal, kartu, attempt, error, mock) disimpan di `localStorage` perangkat.
- Audio diucapkan oleh mesin suara perangkat; tidak ada rekaman dikirim ke mana pun.
- Ekspor JSON kapan saja; hapus semua progres dari Profil (dua langkah).

---

## Lisensi & sumber

- Font **Plus Jakarta Sans** (Tokotype) — SIL Open Font License, disertakan di `public/fonts/OFL.txt`.
- Referensi fakta JLPT: [jlpt.jp](https://www.jlpt.jp/e/guideline/results.html), [jlptonline.or.id](https://jlptonline.or.id/).
- Tidak ada soal atau audio resmi JLPT yang disalin. Item mock ditulis untuk proyek ini dan berlabel **beta**.
- Ikon aplikasi dibuat untuk proyek ini (`scripts/make-icons.py`).
