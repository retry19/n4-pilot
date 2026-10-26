# AGENTS.md — N4 Pilot

Panduan untuk agent (dan manusia) yang melanjutkan repo ini. Ini **index**, bukan duplikasi spec.
Baca dokumen sumber sebelum mengubah perilaku.

**Status:** `0.1.0-beta`, vertical slice. **Stack:** React 19 + TypeScript + zustand + Rollup + jsdom.
**Bahasa produk:** Indonesia. **Status verifikasi:** jalankan `npm run verify`, bukan mempercayai angka di dokumen.

---

## 0. Urutan membaca

| # | Dokumen | Untuk apa |
|---|---|---|
| 1 | [`PRD.md`](./PRD.md) | Kenapa produk ini ada, aturan gate, matematika jam, metrik. |
| 2 | [`DESIGN.md`](./DESIGN.md) | UX, layar, design token, learning engine, display rules. |
| 3 | [`FEATURE.md`](./FEATURE.md) | Status fitur F-01–F-36, urutan build, cut line. |
| 4 | [`PROGRESS.md`](./PROGRESS.md) | Apa yang sudah jadi, gap, keputusan, risiko. |
| 5 | [`CHANGELOG.md`](./CHANGELOG.md) | Riwayat perubahan + verification log. |
| 6 | [`README.md`](./README.md) | Menjalankan, script, arsitektur singkat. |

Kalau dokumen bertentangan: **PRD/DESIGN menang untuk aturan produk**, `PROGRESS` menang untuk status aktual.
Jangan menulis klaim yang tidak bisa diverifikasi dengan command di repo.

---

## 1. Peta repo

```text
src/core/        aturan murni (tanpa React/DOM)
  types.ts       domain model + konten + AppState
  fsrs.ts        FSRS-4.5 exam-aware
  planner.ts     reality check, fase 700 jam, gate pinning, recovery
  readiness.ts   model v0.1 + display rules + Monte Carlo
  mock.ts        scoring + wins/leaks
  session.ts     komposisi sesi + durasi
  errors.ts      12 cause + grouping + resolusi
  ruby.ts        parser furigana + validator
  date.ts util.ts
  *.test.ts      test domain + konten (jumlah aktual: `npm run report`)
src/content/     kanonik: kana, vocab, kanji, grammar, reading, listening
  cards.ts       StudyCard/Concept/curriculum/mock forms
  content.test.ts
src/state/       store.ts (satu jalur jawaban), derive.ts (read model), persistence.ts
src/ui/          Sheet, OptionList, CardView, AudioButton, JapaneseText, common, Navigation
src/screens/     12 layar (onboarding → mock → progress → errors → library → profile)
src/lib/         router.ts (hash), audio.ts (TTS), hooks.ts
src/styles/      tokens → base → components → screens
scripts/         dev, build, serve, test, smoke, smoke:routes, audit:a11y, lint:copy, scenario, inspect, content-report, report, docs
scripts/lib/     app-harness, contrast, scenarios, routes, content-audit, test-runner, metrics-block, build-utils
skills/          SKILL.md portabel (content, release, toolchain, copy, fixtures)
public/          manifest, ikon, font (OFL)
```

Aturan dependensi:

- `src/core` **tidak boleh** mengimpor React, DOM, `src/state`, atau `src/content`.
- `src/content` boleh mengimpor `core`; tidak boleh mengimpor React/state.
- `src/state` mengimpor `core` + `content`; tidak boleh mengimpor layar/UI.
- Semua jawaban user melewati `applyAnswer` di `src/state/store.ts`.

---

## 2. CLI index

Jalankan dari root repo. Semua script memakai Node ≥22.6 (type stripping).

| Command | Fungsi | Kapan |
|---|---|---|
| `npm run dev` | Dev server + live reload (`:5173`) | Saat mengembangkan UI |
| `npm run build` | Typecheck → bundle → CSS → SW → budget → `.metrics/build.json` | Sebelum preview/verify |
| `npm run preview` | Serve `dist/` (`:4173`) | Uji PWA/offline |
| `npm test` | Test domain + konten | Setiap perubahan `core`/`content` |
| `npm run typecheck` | `tsc --noEmit` | Sebelum commit |
| `npm run smoke` | Bundle produksi di jsdom → `.metrics/smoke.json` | Setelah build |
| `npm run smoke:routes` | Render semua route dengan scenario → `.metrics/routes.json` | Setelah mengubah layar/route |
| `npm run audit:a11y` | Cek label/id/heading per route + kontras token → `.metrics/a11y.json` | Setelah komponen/copy/token |
| `npm run lint:copy` | Larangan copy (gagal/Anda/Salah!/streak/guarantee) | Setelah mengubah copy |
| `npm run scenario -- <id>` | Fixture AppState (`new`, `recovery`, `listening-gate`, `two-mocks`, `leech`, `exam-week`) | Saat bug bergantung pada state |
| `npm run inspect -- "<expr>"` | Eval terhadap `core`/`content`/`derive` | Investigasi cepat |
| `npm run content:report` | Coverage vs target + integritas + mock balance | Sebelum/sesudah ubah konten |
| `npm run report` | Metrik tunggal (test, konten, build, smoke, route, a11y, copy) | Sebelum menutup milestone |
| `npm run docs:check` | Gagal jika blok metrik docs kedaluwarsa | CI / sebelum selesai |
| `npm run docs:sync` | Perbarui blok metrik README + PROGRESS | Setelah `report` |
| `npm run verify` | copy → test → typecheck → build → smoke → routes → a11y → report → docs:check | **Gerbang akhir** |
| `npm run icons` | Regenerasi ikon PWA | Saat brand berubah |

### `inspect` — pengganti script sementara

```bash
npm run inspect -- "content.CONTENT_SUMMARY"
npm run inspect -- "content.VOCAB_ITEMS.filter(v => v.level === 'n4').length"
npm run inspect -- --state fixtures/listening-gate.json "helpers.readiness().status"
npm run inspect -- --file checks/readiness-audit.js
```

Tersedia: `content`, `core` (`fsrs`, `planner`, `readiness`, `mock`, `session`, `errors`, `date`, `util`, `ruby`),
`derive`, `helpers` (`plan`, `readiness`, `coverage`, `loadState`), `state` (null tanpa `--state`), `today`.
Output JSON; ekspresi boleh `await`. **Jangan** membuat `scripts/tmp-*.mjs` lagi.

### `report` + `docs:check`

- `build`, `smoke`, `smoke:routes`, `audit:a11y`, dan `lint:copy --write` menulis metrik ke `.metrics/`.
- `report` menjalankan test + audit konten lalu menulis `.metrics/latest.json`.
- Blok di README/PROGRESS di antara `<!-- metrics:start -->` dan `<!-- metrics:end -->` **hanya boleh** diubah oleh
  `docs:sync`. Jangan edit manual; `docs:check` akan gagal.
- `docs:sync` menolak blok yang tidak lengkap (build/smoke/routes/a11y/copy).
- Jangan menyalin angka build/test ke prosa baru tanpa memakai blok itu.

---

## 3. Skills index

Skill untuk pekerjaan yang butuh **penilaian**; CLI untuk yang deterministik. Skill memanggil CLI, bukan
menduplikasi logika. File portabel ada di `skills/` (index: [`skills/README.md`](./skills/README.md)).

| Skill | Trigger | Wajib | Definition of done |
|---|---|---|---|
| [`sandbox-webapp-toolchain`](./skills/sandbox-webapp-toolchain/SKILL.md) | Memulai web app di sandbox DSH | Probe spawn/registry/Chrome; pilih toolchain | Dev server jalan, build <200 KB, smoke jsdom ada |
| [`n4-content-authoring`](./skills/n4-content-authoring/SKILL.md) | Menambah/mengubah kana, kata, kanji, grammar, bacaan, listening | `npm run content:report`, `npm test` | Integritas lolos, ruby valid, tipe N4, tidak menyalin soal resmi |
| [`n4-release-notes`](./skills/n4-release-notes/SKILL.md) | Menutup milestone / menulis CHANGELOG | `npm run verify`, `npm run report`, `npm run docs:check` | Angka dari metrics, gap disebut, verification log nyata |
| [`ux-copy-guardrails`](./skills/ux-copy-guardrails/SKILL.md) | Menulis copy UI | `npm run lint:copy`, `npm run smoke:routes` | Tanpa “gagal/Salah!/Anda/streak shaming”, satu CTA |
| [`n4-scenario-fixtures`](./skills/n4-scenario-fixtures/SKILL.md) | Menguji gate gagal, recovery, leech, exam week | `npm run scenario`, `npm run smoke:routes`, `npm run audit:a11y` | State reproducible, tidak mengubah data user |

Aturan skill: pendek, punya trigger, punya perintah wajib, punya kriteria selesai. Jangan membuat skill untuk
pekerjaan yang baru terjadi sekali.

---

## 4. Non-negotiables produk

1. **Copy**: jangan memakai “gagal”, “Salah!”, “Anda”, “streak”, “mengecewakan”, “pasti lulus”, “dijamin”.
   Gunakan “belum tepat”, “berisiko”, “belum aman”, “rencana dirapikan”, “kamu”.
2. **Readiness**: selalu rentang; tidak ada satu angka tanpa range; tidak ada peluang lulus tanpa ≥1 mock + coverage
   60% + ≥60 jawaban; tidak ada “Aman” jika gate di bawah; “Aman” butuh 2 mock + batas bawah total ≥95.
3. **Section gate**: K+R ≥38, Listening ≥19, total ≥90. Total tinggi tidak menutup gate yang gagal.
4. **Tanggal**: 2027 selalu “perkiraan” sampai diumumkan resmi. Jangan menampilkan skor sebagai skor resmi JLPT.
5. **Konten**: hanya tipe soal N4 (tanpa long reading, tanpa general outline); kanji selalu dalam kata; setiap item
   punya reading kana + arti Indonesia + contoh; jangan menyalin soal/audio resmi.
6. **Audio**: TTS perangkat + transkrip; kegagalan audio tidak boleh memblokir sesi.
7. **Recovery**: ≥3 hari absen → item baru −50%, review cap −20%, copy menenangkan, tanpa tumpukan.
8. **AI**: tidak ada AI di loop MVP; feedback dari konten kanonik.
9. **Privasi**: data lokal; tidak ada unggahan/PII; ekspor/impor tersedia.
10. **Beta**: label beta dan disclaimer “estimasi” harus tetap terlihat.

---

## 5. Alur kerja

### Menambah konten

1. Edit file domain di `src/content/` dengan id stabil.
2. `npm run content:report` → integritas harus **OK**; cek coverage.
3. `npm test` → test konten.
4. `npm run report` + `npm run docs:sync` jika angka berubah.
5. Tambahkan catatan di CHANGELOG bila relevan.

### Menambah layar

1. Buat `src/screens/Nama.tsx`; gunakan `TopBar`/`BottomNav` atau layout full-screen, dan `<main id="main" tabIndex={-1}>`.
2. Daftarkan route di `src/App.tsx` (hash router).
3. Sediakan empty state + loading/error state; satu CTA utama.
4. Tambahkan langkah ke `scripts/smoke.mjs` dan daftarkan route di `scripts/lib/routes.mjs`
   supaya `smoke:routes` + `audit:a11y` ikut mengujinya.
5. Cek 44px target, label aria, tanpa duplicate id; `npm run verify`.

### Mengubah model/readiness

1. Ubah `src/core/readiness.ts` (atau modul core terkait) + test di file yang sama.
2. Jangan melonggarkan display rules tanpa memperbarui test + doc.
3. `npm run inspect -- "helpers.readiness()"` untuk melihat dampaknya pada state nyata.
4. `npm run verify`; pastikan metrics block disinkronkan.

### Memperbaiki bug

1. Reproduksi dengan `inspect` atau state fixture (batch 2).
2. Tambahkan test/smoke step yang gagal dulu.
3. Perbaiki; jalankan `npm run verify`.
4. Catat di CHANGELOG bagian `Fixed` (termasuk bagaimana ditemukan).

---

## 6. Verifikasi & definition of done

```bash
npm run verify
```

Itu menjalankan: copy lint → test → typecheck → build → smoke → route smoke → a11y audit → report → docs:check.
**Jangan** menyatakan selesai jika salah satu gagal. Untuk perubahan konten, tambahkan
`npm run content:report`.

Checklist:

- [ ] `npm run verify` hijau.
- [ ] `content:report` integritas OK (jika konten berubah).
- [ ] `docs:check` lulus; tidak ada angka manual yang basi.
- [ ] Test baru untuk aturan baru; smoke step untuk alur baru.
- [ ] Copy sesuai §4; tidak ada klaim resmi/AI.
- [ ] Aksesibilitas: main landmark, label tombol, dialog, focus, 44px.
- [ ] CHANGELOG diperbarui; gap disebut jujur.
- [ ] Tidak ada file sementara (`scripts/tmp-*`, `.cache/`, `.metrics/` di-ignore).

---

## 7. Batasan lingkungan

- Sandbox menolak child process dengan piped stdio → **Vite, Vitest, esbuild, headless Chrome tidak jalan**.
  Gunakan `tsc` + Rollup in-process + Terser + jsdom (lihat `scripts/`).
- `npm install` di sini butuh `--ignore-scripts`; `.npmrc` menyimpan cache di workspace.
- Chrome terpasang tetapi gagal start (mojo/named pipe). Verifikasi visual tetap manual.
- Semua perintah dijalankan dari root repo. Node ≥22.6 untuk type stripping.
- `dist/`, `.dev/`, `.cache/`, `.metrics/`, `fixtures/`, `node_modules/` tidak di-commit.

---

## 8. Status & gap (ringkas)

- Konten masih **seed** (60 kata / 24 kanji / 14 grammar / 5 bacaan / 10 listening), bukan beta 1.200 dst.
- Audio **TTS**, bukan audio native.
- Belum ada backend/auth/sync; data lokal.
- Readiness **heuristik v0.1**, belum dikalibrasi; peluang lulus low-confidence.
- Drill seksi 10 soal timed, bukan timer resmi 25/55/35 (itu ada di full mock).
- Audit a11y otomatis baru baseline (label, id, heading, kontras token); axe/screen reader device belum.
- Belum: sentence ordering, dictation/shadowing, diagnostic adaptif, what-if, notifikasi, payment, B2B.
- Detail + rencana: [`PROGRESS.md`](./PROGRESS.md).

---

## 9. Konvensi commit/PR (disarankan)

- Satu perubahan = satu tujuan; sebutkan F-ID dari FEATURE.md bila relevan.
- Sertakan hasil `npm run verify` di deskripsi.
- Jangan campur konten besar dengan perubahan engine; pisahkan agar `content:report` mudah dibaca.
- Untuk perubahan copy, sebutkan halaman dan alasan (aturan DESIGN §8).
