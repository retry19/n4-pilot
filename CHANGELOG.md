# Changelog — N4 Pilot

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/) dan [SemVer](https://semver.org/lang/id/).
Semua tanggal memakai zona Asia/Jakarta.

---

## [Unreleased] — tooling & agent index

Batch 1 dari retrospeksi “apa yang berulang”: mengumpulkan bukti dan menjaga angka dokumen tetap benar.

### Added

- **`npm run inspect`** — evaluasi ekspresi terhadap `core`, `content`, `derive`, dan state JSON tanpa membuat
  `scripts/tmp-*.mjs`; mendukung `--state` dan `--file`, output JSON.
- **`npm run content:report`** — laporan coverage vs target beta (PRD §9.1), integritas struktur, distribusi
  kartu/kurikulum, dan overlap mock; `--json` dan `--write`.
- **`npm run report`** — satu sumber metrik terverifikasi: test, konten, build, smoke → `.metrics/latest.json`.
- **`npm run docs:check` / `npm run docs:sync`** — blok metrik di `README.md` dan `PROGRESS.md` di antara marker
  `<!-- metrics:start -->` / `<!-- metrics:end -->`; `check` gagal jika dokumen kedaluwarsa.
- **`AGENTS.md`** — index untuk agent: urutan baca, peta repo, CLI index, skills index, non-negotiables, workflow,
  definition of done, dan batasan sandbox.
- **Metadata build/smoke** — `build` menulis `.metrics/build.json`; `smoke` menulis `.metrics/smoke.json`.
- **`scripts/lib/`** — `content-audit`, `test-runner`, `metrics-block` agar CLI berbagi logika yang sama.

### Added (batch 2–3)

- **`npm run scenario`** — 6 fixture AppState deterministik (`new`, `recovery`, `listening-gate`, `two-mocks`,
  `leech`, `exam-week`) untuk QA/readiness tanpa menyentuh data pengguna; `--today`, `--out`, `--all`.
- **`npm run smoke:routes`** — render 20 route dari bundle produksi di jsdom dengan state skenario; gagal pada
  console error, duplicate id, kontrol tanpa nama, atau `main#main` hilang.
- **`npm run audit:a11y`** — audit per route (label, id, heading, `aria-labelledby`, form label, tabindex) +
  kontras token light/dark WCAG 4.5:1.
- **`npm run lint:copy`** — aturan voice DESIGN §8 ditegakkan pada string literal/JSX: “gagal”, “Salah!”,
  “Anda”, streak, shaming, guarantee, “klik di sini”.
- **`skills/`** — 5 skill portabel: `n4-content-authoring`, `n4-release-notes`, `sandbox-webapp-toolchain`,
  `ux-copy-guardrails`, `n4-scenario-fixtures` + index.
- **Metrik `Routes` / `A11y` / `Copy`** — `.metrics/{routes,a11y,copy}.json` dibaca `report` dan masuk blok docs;
  `docs:sync` menolak blok yang tidak lengkap.

### Changed

- **`npm test` / `testkit`** — `executeTests()` mengembalikan hasil terstruktur; printer tetap sama, `report` memakai
  hasil yang sama tanpa menjalankan test dua kali secara terpisah.
- **`npm run verify`** — sekarang copy → test → typecheck → build → smoke → routes → a11y → report → docs:check.
- **Readiness probability** — di-cap 98–99% agar model yang belum dikalibrasi tidak mengklaim kepastian.
- **README** — script table, tooling index, status terverifikasi otomatis, dan skill index.
- **PROGRESS** — “Angka kunci” memakai blok metrik otomatis; tooling batch 1–3 dan AX diperbarui.

### Fixed

- **Angka dokumen basi** — sebelumnya 22→23 langkah dan 144,0→144,3 KB harus ditambal manual; sekarang
  `docs:check` menolak dokumen yang tidak cocok dengan `.metrics/latest.json`.
- **`aria-labelledby="today-heading"` tanpa target** — ditemukan `smoke:routes`; heading sesi hari ini diberi id.
- **File input Profil tanpa nama aksesibel** — ditemukan `smoke:routes`; ditambah `aria-label`.
- **H1 hilang** di Today, detail perpustakaan, Session, dan Mock runner/report — ditemukan `audit:a11y`;
  heading ditambahkan (sr-only bila perlu), recap diturunkan ke h2.
- **Parser kontras light-mode** tidak me-resolve `var(--…)` (semua rasio `?`) — diperbaiki; 17 pasangan lulus.
- **Copy Practice** memakai “gagal” dan “streak” — ditemukan `lint:copy`; ditulis ulang.
- **Fixture accuracy** menghitung benar/salah per 100 item sehingga set kecil selalu 100% — diperbaiki agar
  terdistribusi pada ukuran set aktual.

Catatan: batch 2–3 mengubah bundle kecil (h1/aria/copy/probability cap). Angka aktual selalu di blok metrik
README/PROGRESS (`npm run report`).

---

## [0.1.0-beta] — 2026-10-26

**Vertical slice MVP.** Satu loop utuh yang bisa dijalankan dari nol sampai laporan mock: onboarding → reality
check → rencana → sesi harian → FSRS → readiness → mock → laporan → buku kesalahan.

> Ini **bukan** klaim “siap N4”. Cakupan konten masih seed (±5% dari target beta), audio memakai mesin suara
> perangkat, dan belum ada backend. Semua skor adalah estimasi dengan rentang, bukan skor resmi JLPT.

### Ringkasan angka

| Metrik | Nilai |
|---|---:|
| Bundle awal (gzip) | **144,3 KB** (budget <200 KB) |
| CSS (gzip) | 10,2 KB |
| Unit/integration test | **71 lulus**, 8 file, ~0,1 dtk |
| Smoke journey (jsdom, bundle produksi) | **23 langkah lulus**, 0 console error |
| Item konten | 208 kana · 60 kata · 24 kanji · 14 grammar (30 drill) · 5 bacaan (11 soal) · 10 listening |
| Kartu yang dihasilkan | 755 kartu · 406 unit kurikulum |
| Mock | 2 form × 65 soal (30 / 25 / 10) |
| Precache PWA | 16 file |

---

## Added

### Fondasi & toolchain

- **PWA shell mobile-first**: `index.html` dengan boot shell (anti-flash), manifest, ikon 192/512/maskable,
  `apple-touch-icon`, service worker dengan precache + fallback navigasi offline.
- **Design system** dari DESIGN §7: token warna light/dark, skala tipografi, spacing 4pt, radius, elevasi,
  komponen tombol/kartu/chip/banner/range bar/option/sheet/tabs/switch, plus reduced-motion dan text scale.
- **Toolchain in-process** (lihat “Changed”): `tsc` untuk typecheck, Rollup + transform TypeScript sendiri
  (`ts.transpileModule`), Terser untuk minifikasi, CSS bundler kecil, dev server dengan SSE live reload.
- **Test harness sendiri** (`src/testkit.ts`) + `scripts/test.mjs`: 71 test, tanpa Vitest.
- **Smoke test produksi** (`scripts/smoke.mjs`): memuat bundle hasil build ke jsdom, menjalankan seluruh journey
  pertama, mock 3 seksi, laporan, buku kesalahan, drill, dan memeriksa dokumen persistensi.
- **Script** `dev`, `build`, `preview`, `typecheck`, `test`, `test:watch`, `smoke`, `verify`, `icons`.
- **`.npmrc`** dengan cache di dalam workspace (sandbox hanya mengizinkan tulis di workspace).

### Domain engine (pure TypeScript, tanpa React)

- **FSRS-4.5** (`src/core/fsrs.ts`): 17 parameter default, desired retention 0.90, same-day relearning 10 menit,
  `retrievability`, preview interval, auto-grade pilihan ganda, deteksi leech, dan **exam-aware clamp**:
  - interval tidak pernah melewati tanggal ujian;
  - item high-weight ditarik ke jendela 5–10 hari sebelum ujian;
  - tidak ada review setelah ujian.
- **Planner** (`src/core/planner.ts`): matematika 575–700–1.000 jam, tiga opsi reality check, alokasi 700 jam ke 7
  fase (dinormalisasi dari DESIGN §7.3), offset untuk starting point, **gate pinning** (kalender tidak boleh lebih
  cepat dari bukti), recovery mode ≥3 hari, jadwal mock, rekomendasi mode sesi.
- **Session composer** (`src/core/session.ts`): urutan recall → review → learn → apply → listening → prove → recap,
  rasio per fase, cap item baru/review, minimum listening 20% (dari 15 menit), fill/trim agar durasi tidak berbohong,
  fix-it mode.
- **Readiness v0.1** (`src/core/readiness.ts`): mastery per domain + retensi pada hari ujian + coverage + anchor mock;
  SEM dan rentang 80%; Monte Carlo untuk peluang lulus dengan korelasi antar-seksi; **display rules** DESIGN §9.6
  (tidak ada probabilitas tanpa 1 mock + coverage 60%; tidak ada “Aman” bila gate di bawah; “Aman” butuh 2 mock dan
  batas bawah total ≥95); tiga faktor penjelas.
- **Mock scoring** (`src/core/mock.ts`): estimasi linear transparan + rentang binomial, gate per seksi, 3 wins/3 leaks
  berbasis data, statistik per item type, status bukti belum lengkap.
- **Error taxonomy** (`src/core/errors.ts`): 12 penyebab, klasifikasi deterministik, group by cause, resolusi setelah
  2 benar di konteks berbeda, label Indonesia tanpa menyalahkan.
- **Ruby parser + blanker** (`src/core/ruby.ts`) dengan validasi untuk QA konten.
- **Date utilities** berbasis hari kalender lokal + format Indonesia.

### Konten seed

- **Kana 208**: 46 hiragana + 46 katakana dasar, 25 dakuten/handakuten masing-masing, 33 yōon masing-masing;
  romaji, baris, grup, mnemonic hiragana, confusables, audio TTS.
- **Kosakata 60** (40 N5 + 20 N4): reading, arti Indonesia, POS, contoh kalimat ber-ruby + terjemahan, tag, level,
  audio.
- **Kanji 24**: arti, on/kun, radikal, jumlah goresan, 2–3 kata contoh, mnemonic, kesalahan umum, tautan kosakata.
- **Grammar 14** (30 drill): pola, arti, formasi, nuansa, 3 contoh, contrast pair, common error Indonesia, drill
  pilihan ganda dengan penjelasan.
- **Reading 5** (11 soal): 2 short, 2 mid, 1 information retrieval (tidak ada long passage); bukti jawaban + kana
  reading penuh.
- **Listening 10**: 4 tipe N4 saja (task-based, key points, verbal expressions, quick response), transkrip kana,
  penjelasan distraktor.
- **Dua mock form** (A/B) × 65 soal: 30 kosakata, 25 grammar+reading, 10 listening; timer 25/55/35 menit.
- **406 unit kurikulum** berurutan fase 0→3 dengan pembagian: Fondasi 92, N5 Bridge 104, N4 Core A 60, N4 Core B 150.
- **Validasi konten otomatis**: id unik, reading hanya kana, ruby valid, opsi unik + kunci valid, bukti bacaan ada di
  teks, setiap kanji punya kata, setiap grammar punya contrast + drill, mock tidak punya kartu ganda.

### User experience

- **Onboarding 6 layar** (welcome → titik awal → tanggal → waktu → reality check → preview) dengan progress dots,
  satu keputusan per layar, slider jam + hari, target skor, disclaimer 2027 “perkiraan”, reality check live,
  tiga opsi, preview fase + mock, dan CTA sesi pertama. Tanpa kata “gagal”; tanpa paywall.
- **Hari Ini**: konteks ujian, kartu kesiapan (range + gate + “Kenapa?”), sesi hari ini (mulai/lanjut), Quick 10,
  fokus mingguan, bukti terbaru + sparkline, 7 hari ke depan, pintasan review/buku kesalahan/perpustakaan, banner
  recovery/mock/offline.
- **Session player**: full-screen, progress blok + timer, concept card, review card, reading, listening, timed prove,
  recap; feedback dengan cause + remediation + contrast + bukti; “Kenapa?” sheet; pause/exit sheet dengan simpan
  progres; shortcut 1–4/Enter.
- **Review queue**: tab Due/Terlambat/Leech, progress, card player yang sama, empty state “tidak ada tumpukan”.
- **Rencana**: beban saat ini, verdict, fase + gate, minggu ini, mock, “kenapa rencana ini”, edit ketersediaan dengan
  preview dampak + hari istirahat.
- **Latihan**: sesi hari ini, Quick 10, buku kesalahan, review, drill seksi (3 domain, countdown 10 menit +
  auto-finish), mock A/B, 6 micro-lesson strategi ujian.
- **Mock**: overview aturan + checkbox siap, runner full-screen dengan timer, answer sheet, flag, break 10 menit,
  auto-submit, crash recovery (state persisted), laporan.
- **Laporan mock**: estimasi + rentang, gate, per seksi, 3 wins/3 leaks, per tipe soal, pembahasan item (benar/salah),
  rencana 7 hari, disclaimer.
- **Progres**: status, rentang, peluang (bila bukti cukup), gate, tiga faktor, coverage per domain, tren, riwayat
  mock, penjelasan model, disclaimer.
- **Buku kesalahan**: filter status/penyebab, grup per penyebab, detail soal/jawaban, fix-it 10 menit, aturan
  resolusi.
- **Perpustakaan**: pencarian lintas domain, 6 tab, detail kana/kata/kanji/grammar/reading interaktif/listening
  interaktif, “tambah ke review”.
- **Profil**: target (ubah tanggal/jam/hari/skor dengan versi rencana baru), preferensi furigana/romaji/autoplay,
  aksesibilitas (ukuran teks, reduced motion, tema, haptics), ekspor/impor JSON, hapus progres 2 langkah, tentang +
  tautan resmi.

### Aksesibilitas

- Skip link + landmark `main`, `tabIndex=-1` pada target skip.
- Semua target sentuh utama ≥44 px; opsi jawaban ≥56 px.
- Fokus terlihat 3 px; dialog native (focus trap + Escape), `aria-labelledby` unik per sheet.
- Status tidak hanya warna: ikon + label; feedback `aria-live`; timer `tabular`.
- Reduced motion (sistem + pengaturan), text scale 100/115/130% (≈200% browser), tema terang/gelap/kontras token.
- Label bahasa Jepang (`lang="ja"`), ruby dengan pembaca reading, transkrip untuk semua audio, fallback audio.

### Developer & agent experience

- **Satu perintah verifikasi**: `npm run verify` = test → typecheck → build → smoke.
- **Pemisahan tegas** `core` (pure, testable) / `content` (data + factory) / `state` (store + derive) / `ui` / `screens`.
- **Test cepat** (~0,1 dtk) karena tanpa bundler/transform.
- **Smoke deterministik** yang menguji bundle produksi, bukan source.
- **Konten deterministik**: opsi diacak dengan seed item, mock form dengan seed, tidak ada random saat runtime.
- **Komentar desain** di modul menjelaskan aturan produk (gate, display rules, recovery), bukan hanya kode.

---

## Changed (keputusan yang perlu diketahui)

1. **Toolchain diganti dari Vite/Vitest.** Sandbox menolak child process dengan piped stdio (`spawn EPERM`), sehingga
   esbuild — dan karenanya Vite/Vitest — tidak bisa jalan. Solusi: `tsc` (typecheck), Rollup in-process (transpile
   TypeScript via `ts.transpileModule` + node-resolve + commonjs + terser), dev server sendiri dengan SSE reload,
   test harness sendiri, dan jsdom untuk smoke. **Di mesin normal, Vite bisa dipakai lagi**; kontrak `src/core` tidak
   bergantung pada toolchain.
2. **Local-first, bukan Supabase, untuk beta.** Satu dokumen JSON berversi di `localStorage` lewat adapter tunggal
   (`src/state/persistence.ts`). Alasan: offline review adalah fitur kepercayaan, belum ada auth, dan sandbox tidak
   punya backend. Jalur migrasi ke IndexedDB/Dexie + Supabase didokumentasikan di file itu.
3. **Audio = TTS perangkat + transkrip.** Tidak ada aset audio native di seed. Jika perangkat tidak punya suara Jepang,
   UI mengatakan itu dan menampilkan transkrip; sesi tidak pernah terblokir. Kualitas audio native tetap **gap** yang
   harus ditutup sebelum V1.
4. **Quick 10 = 3 review + 3 konsep + 2 listening**, bukan 4/3/3 dari DESIGN, karena 4/3/3 melewati 10 menit setelah
   feedback dan transisi. Durasi tetap ditampilkan apa adanya.
5. **Detail mock menampilkan 65 soal**, bukan jumlah item resmi. Timer dan struktur seksi tetap format 2026. Label
   “form beta” muncul di overview dan laporan.
6. **Drill seksi = 10 soal timed**, bukan 25/55/35 penuh. Timer resmi dipakai di full mock. Ini penurunan scope yang
   disengaja dan terlihat di UI, bukan klaim palsu.
7. **Peluang lulus disembunyikan** sampai ada 1 full mock + coverage ≥60% + ≥60 jawaban latihan. Jika belum, UI
   menjelaskan alasannya.
8. **Rencana memakai 700 jam**, bukan 575, dan fase dapat “ditahan” oleh gate. Konsekuensinya rencana bisa lebih
   panjang dari kalender — dan itu ditampilkan sebagai risiko, bukan disembunyikan.

---

## Fixed

Semua bug berikut ditemukan oleh smoke test/jsdom, bukan oleh review manual:

- **Feedback jawaban hilang seketika**: `answerStep` menaikkan cursor, sehingga kartu berikutnya mengganti kartu yang
  baru dijawab sebelum pengguna membaca penjelasan. Cursor sekarang hanya bergerak lewat “Lanjut”.
- **Langkah listening/reading tidak dirender**: Session hanya mengenali `kind: 'card'`; langkah `listening`/`reading`
  menghasilkan layar kosong. Semua kind kartu sekarang dirender.
- **`dialog.close is not a function`** di lingkungan tanpa dukungan penuh: ditambahkan fallback hapus atribut `open`.
- **ID sheet duplikat** (`sheet-title`) ketika beberapa sheet hidup di satu layar: diganti `useId()`.
- **Bundle awal 218 KB gzip** karena belum diminifikasi: Terser in-process → **144 KB**.
- **Kata “gagal” muncul di onboarding** pada catatan reality check (ironisnya di kalimat yang menyangkal kata itu):
  diganti “vonis”.
- **Dev watcher berpotensi loop** karena mengawasi root workspace (termasuk output `.dev`): sekarang hanya `src/` +
  `index.html`.
- **`history` global** tidak aman di lingkungan non-browser: router memakai `window.history` eksplisit.
- **Tombol submit tidak ada sebelum memilih** pada smoke: bukan bug produk, tetapi test harness diperbaiki agar
  memilih opsi dulu lalu menekan “Jawab”.
- **Teks dialog tertutup terbaca** oleh `textContent` dan mengacaukan smoke: helper sekarang mengabaikan
  `dialog:not([open])`.

---

## Known gaps (jangan dianggap selesai)

| Area | Status | Catatan |
|---|---|---|
| Cakupan konten | **Seed** | 60 kata vs target beta 1.200; 24 kanji vs 240; 14 grammar vs 100; 5 bacaan vs 40; 10 listening vs 100. |
| Audio | **TTS** | Belum ada rekaman native, CDN, atau pack audio offline. |
| Backend/auth/sync | **Tidak ada** | Hanya perangkat ini; ekspor/impor JSON manual. Tidak ada multi-device. |
| CMS & QA 2 reviewer | **Tidak ada** | Validasi schema otomatis ada; alur review manusia belum. |
| Diagnostic adaptif | **Parsial** | Titik awal menggeser fase; belum ada tes adaptif 10–15 menit. |
| Sentence ordering | **Belum** | Drill grammar masih pilihan ganda; tipe `sentence_ordering` ada di model tetapi belum ada interaksi susun kalimat. |
| Reading lookup/timer exam | **Belum** | Furigana + bukti ada; tap-to-lookup dan timer exam mode belum. |
| Dictation/shadowing | **Belum** | Listening lab baru 4 tipe + transkrip. |
| Section drill resmi | **Mini** | 10 soal timed, bukan 25/55/35. |
| Load balancing FSRS | **Parsial** | Cap per hari + exam clamp; redistribusi penuh belum. |
| Undo review | **Belum** | Tidak ada undo 1 langkah. |
| Kalibrasi readiness | **Belum** | Model heuristik v0.1; butuh data mock nyata + isotonic regression. |
| What-if, notifikasi, streak, logistik ujian, AI, payment, B2B | **Belum (V1)** | Sesuai FEATURE §4.2. |
| Audit aksesibilitas | **Baseline** | Manual checklist; belum axe/Lighthouse/screen reader device test. |
| Offline penuh | **Shell + data** | Audio TTS tidak bisa di-cache; konten sudah ada di bundle. |

---

## Verification (2026-10-26)

```text
$ npm test
✓ 71/71 passed · 0.08s

$ npx tsc -p tsconfig.json --noEmit
(no output)

$ npm run build
[build] typecheck ok (235 files)
[build] js   main-*.js · 475.7 KB raw · 144.3 KB gzip
[build] css  app-*.css · 62.3 KB raw · 10.2 KB gzip
[build] pwa  sw *.js · precache 16 files
[build] budget initial JS <200KB gzip: 144.3 KB — PASS

$ npm run smoke
✓ smoke journey passed (0 harmless warnings)
```

Smoke mencakup: render onboarding → 5 langkah keputusan → sesi pertama (concept + kartu + listening + recap) →
Hari Ini → Rencana → Progres → Latihan → pencarian perpustakaan → buku kesalahan → Profil → persistensi → Mock A
(3 seksi + istirahat + auto-flow + laporan) → error notebook dari mock → drill seksi.

---

## Next (0.2.0, urutan UX → DX → AX)

1. **UX**: undo review, timer reading exam mode, tap-to-lookup, sentence ordering (★), dictation 1 kalimat, empty/error
   states yang lebih kaya, dan uji 5 pengguna pada alur reality check.
2. **Konten**: perluas ke 300 kata + 60 grammar + 20 bacaan + 30 listening; tambah audio native untuk 100 item inti.
3. **Readiness**: kumpulkan data mock beta, kalibrasi isotonic, laporkan MAE + false-safe.
4. **DX**: `npm run dev` prebundle konten agar cold start <2 dtk; tambah test komponen ringan; kontrak schema konten.
5. **AX**: `AGENTS.md` berisi peta modul + aturan konten + checklist verifikasi; fixture konten untuk agent.
