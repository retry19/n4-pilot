# PROGRESS — N4 Pilot

**Status:** vertical slice MVP (beta internal) · **Versi:** 0.1.0-beta · **Tanggal:** 26 Oktober 2026
**Dokumen acuan:** `PRD.md`, `DESIGN.md`, `FEATURE.md`
**Prinsip eksekusi:** user experience → developer experience → agent experience.

---

## 1. Ringkasan status

Satu loop belajar **utuh** sudah bisa dijalankan dari nol:

> onboarding → reality check → rencana 700 jam → sesi pertama → FSRS → Hari Ini → readiness range + gate →
> full mock → laporan → buku kesalahan → fix-it.

Yang **belum** ada: backend/auth/sync, audio native, CMS + QA 2 reviewer, diagnostic adaptif, sentence ordering,
dictation/shadowing, what-if, notifikasi, pembayaran, B2B, dan kalibrasi readiness dengan data nyata.

### Angka kunci

Angka berikut diverifikasi otomatis oleh `npm run report` dan dicek oleh `npm run docs:check`. Jika kamu mengubah
build, test, atau konten, jalankan `npm run verify` lalu `npm run docs:sync` — jangan menambal manual.

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

### Yang bisa dicoba sekarang

```bash
npm install --ignore-scripts   # lihat §3 soal sandbox
npm run dev                    # http://127.0.0.1:5173
# atau
npm run build && npm run preview
```

Alur demo 5 menit: onboarding (pilih “Dari nol”, Des 2027, 2,25 jam × 6) → reality check → “Mulai 10 menit pertama” →
jawab 3 kana + 2 listening → lihat Hari Ini berubah → buka Progres (“Belum cukup data”) → Latihan → Mock A → laporan.

---

## 2. Definisi “selesai” untuk slice ini

Slice ini dianggap selesai jika:

- [x] Pengguna baru bisa menyelesaikan onboarding **tanpa bantuan** dan langsung masuk sesi pertama.
- [x] Reality check menampilkan matematika + tiga opsi, tanpa kata “gagal”, dengan label 2027 “perkiraan”.
- [x] Setiap jawaban mengubah jadwal FSRS, attempt log, error taxonomy, coverage, dan readiness.
- [x] Review tidak menumpuk setelah bolos; recovery mode menurunkan item baru dan menampilkan copy yang menenangkan.
- [x] Readiness **tidak pernah** menampilkan satu angka tanpa rentang; gate terlihat sebelum total.
- [x] “Aman” tidak mungkin muncul jika gate di bawah, atau dengan <2 mock, atau batas bawah total <95.
- [x] Mock 3 seksi dengan timer, break, auto-submit, crash recovery, dan laporan berbasis bukti.
- [x] Kesalahan mock masuk buku kesalahan dengan penyebab + satu remediasi.
- [x] PWA installable; shell + data tetap tersedia offline.
- [x] Build lolos budget; test + typecheck + smoke hijau.
- [ ] **Belum:** axe/screen reader device test, uji pengguna, audio native, kalibrasi readiness.

---

## 3. Toolchain & batasan lingkungan (penting)

Sandbox pengembangan ini menolak **child process dengan piped stdio** (`spawn EPERM`). Itu mematikan esbuild —
dan karenanya Vite, Vitest, serta headless Chrome (butuh named pipes untuk mojo). Keputusan:

| Kebutuhan | Alat normal | Yang dipakai | Alasan |
|---|---|---|---|
| Typecheck | `tsc` | `tsc` | Sama. |
| Bundle | Vite | Rollup in-process + `ts.transpileModule` | Tidak butuh child process. |
| Minify | esbuild | Terser (`@rollup/plugin-terser`) | Pure JS. |
| Dev server | Vite | `scripts/dev.mjs` (Rollup watch + SSE reload) | In-process. |
| CSS | PostCSS/Vite | bundler `@import` kecil | 40 baris. |
| Test | Vitest | `src/testkit.ts` + Node type stripping | Satu proses, tanpa spawn. |
| E2E browser | Playwright | **jsdom** menjalankan bundle produksi | Chrome diblokir sandbox. |
| Ikon | desain | Pillow (`scripts/make-icons.py`) | Deterministik. |

**Kontrak:** `src/core` tidak boleh bergantung pada React, DOM, atau toolchain. Kalau nanti pindah lagi ke Vite,
hanya `scripts/*` dan `package.json` yang berubah.

`npm install` butuh `--ignore-scripts` **di sandbox ini** karena lifecycle script punya piped stdio. Di mesin normal,
`npm install` biasa bekerja. `.npmrc` mengarahkan cache npm ke dalam workspace.

---

## 4. Yang sudah berjalan end-to-end

### 4.1 Journey A — 10 menit pertama

| Langkah | Implementasi | Catatan UX |
|---|---|---|
| Welcome | `screens/Onboarding.tsx` | 3 janji: rencana dari tanggal, estimasi berentang, gate terlihat. |
| Titik awal | 4 kartu | “Dari nol” tidak memicu tes panjang. |
| Tanggal ujian | 3 preset + custom | 2027 selalu “perkiraan”; 2026 resmi tetapi sudah tutup. |
| Waktu | slider 0,5–5 jam, 3–7 hari | Total mingguan live; copy “jujur > ambisius”. |
| Reality check | `computeReality` | 700 vs waktumu, bulan, tiga opsi dengan dampak; recommended. |
| Preview | `buildPlan` | 7 fase + tanggal + gate + mock + first-week focus + beta disclaimer. |
| Sesi pertama | `startSession('quick10')` | 3 konsep kana + check + 2 listening; selesai <10 menit. |

**Keputusan:** reality check muncul **setelah** pengguna melihat angka dan sebelum plan preview penuh — sesuai
DESIGN §4.1 dan open question #4. Tidak ada blokir; opsi “lanjut dengan risiko” tetap tersedia dan ditandai.

### 4.2 Journey B — sesi harian

- Header: blok, langkah, timer count-up, pause.
- Blok: `recall` (2 kartu pertama), `review`, `learn` (concept + check), `apply` (grammar/bacaan), `listening`,
  `prove` (deep/sprint), `recap`.
- Feedback: hasil (bukan “Salah!”), why, contrast, bukti teks/transkrip, penyebab + remediasi, tombol “Kenapa?”.
- Pause/exit menyimpan state; resume instan karena state sudah di memori + localStorage.
- Recap: akurasi, benar/jawaban, waktu, review berikutnya, satu insight, CTA.

**Bug yang ditemukan smoke:** cursor sempat maju saat menjawab sehingga feedback hilang. Sekarang cursor hanya maju
lewat “Lanjut”; `answerStep` idempoten per step.

### 4.3 Journey C — bolos 3 hari

- `buildPlan` mendeteksi `lastActivityDate` ≥3 hari → `recovery: true`, new cap ×0,5, review cap ×0,8.
- Banner Hari Ini: “Kamu absen N hari. Rencana sudah dirapikan.” + CTA 10 menit + dismiss.
- Tidak ada mock dalam 2 hari (copy), tidak ada angka “kamu punya 487 review”.
- Review due tetap dibatasi `reviewCap`; tidak ada penumpukan.

### 4.4 Journey D — full mock

- Overview: aturan, seksi + jumlah soal + menit, checkbox siap, form beta disclaimer, percobaan terakhir.
- Runner: timer diturunkan dari `sectionStartedAt` (bukan decrement), answer sheet, flag, break 10 menit otomatis,
  auto-submit, persist per jawaban (crash recovery).
- Grader: `scoreMock` → estimasi KR/LS + rentang binomial, gate, status, wins/leaks, per item type.
- Report: gate, per seksi, 3 wins/3 leaks, pembahasan item (default salah saja, “lihat semua”), rencana 7 hari,
  disclaimer “bukan skor resmi”.
- Jawaban salah menjadi `ErrorEvent` dengan cause dari `classifyError`; attempt mock masuk coverage tetapi **tidak**
  mengubah jadwal FSRS (mock bukan review).

### 4.5 Journey E — error → perbaikan

- Buku kesalahan: grup berdasarkan cause + tag (mis. “Salah baca kanji · kanji”), bukan per nomor soal.
- Detail: soal, jawabanmu, benar, penyebab, tanggal; remediasi satu langkah.
- Fix-it: 6 kartu dari grup, mode `fixit`, 10 menit.
- Resolusi: benar 2× di kartu berbeda → `resolved`; benar di kartu yang sama tidak dihitung.

---

## 5. Status fitur terhadap FEATURE.md

Legenda: **✅ ada & berfungsi** · **◐ parsial / thin slice** · **— belum**.

### Foundation

| ID | Fitur | Status | Bukti / catatan |
|---|---|---|---|
| F-01 | Content schema & CMS | ◐ | Schema TypeScript + factory + validasi otomatis (`content.test.ts`). Tidak ada CMS UI, versioning, rollback. |
| F-02 | QA workflow | — | Belum ada alur 2 reviewer; konten seed ditulis & divalidasi otomatis, bukan direview manusia. |
| F-03 | Audio pipeline | ◐ | TTS perangkat + transkrip + fallback; belum ada aset native/CDN/offline pack. |
| F-04 | Auth & account | ◐ | Profil lokal guest-first, ekspor/impor, reset. Tidak ada magic link/Google/cloud. |
| F-05 | Offline sync | ◐ | Local-first + SW precache; tidak ada outbox/server sync. |
| F-06 | Analytics | — | Tidak ada event/PII tracking. |
| F-07 | Design system & a11y | ✅ | Token, komponen, focus, touch target, reduced motion, text scale; audit otomatis belum. |

### Planning

| ID | Fitur | Status | Catatan |
|---|---|---|---|
| F-08 | Onboarding & reality check | ✅ | 6 layar, 3 opsi, 2027 “perkiraan”, tanpa paywall. |
| F-09 | Diagnostic & placement | ◐ | Titik awal menggeser offset fase (0/18/95/140 jam); belum adaptif. |
| F-10 | Goal & plan generator | ✅ | 700 jam, 7 fase, gate, mock, perubahan goal berversi. |
| F-11 | Adaptive replanning & recovery | ◐ | Recovery, gate pinning, akurasi <70% menurunkan new cap; redistribusi penuh belum. |

### Learning

| ID | Fitur | Status | Catatan |
|---|---|---|---|
| F-12 | Kana | ✅ | 208 karakter, SRS, gate 95% + 20 jawaban, romaji toggle; tidak ada stroke animation. |
| F-13 | Vocabulary | ◐ | 60 kata (target 1.200); 4 modalitas kartu; contoh + audio TTS. |
| F-14 | Kanji | ◐ | 24 kanji (target 240); selalu dalam kata; writing tidak ada. |
| F-15 | Grammar | ◐ | 14 pola / 30 drill (target 100); contrast + common error; belum sentence ordering. |
| F-16 | Reading | ◐ | 5 bacaan / 11 soal (target 40); short/mid/info; belum lookup & timer exam. |
| F-17 | Listening | ◐ | 10 item, 4 tipe N4; audio sekali di exam; belum dictation/shadowing. |
| F-18 | Daily session player | ✅ | Semua blok, pause/exit, recap, offline, satu CTA. |
| F-19 | FSRS review queue | ✅ | FSRS-4.5, exam-aware, leech, auto-grade; undo & load balancing penuh belum. |

### Assessment & readiness

| ID | Fitur | Status | Catatan |
|---|---|---|---|
| F-20 | Section drills | ◐ | 10 soal timed per domain; timer resmi hanya di mock penuh. |
| F-21 | Full mock | ◐ | 2 form × 65 soal; timer 25/55/35, break, auto-submit, crash recovery; jumlah item bukan resmi. |
| F-22 | Score report | ✅ | Rentang, gate, wins/leaks, item review, rencana; belum auto post-mortem 24 jam. |
| F-23 | Error notebook & fix-it | ✅ | 12 cause, group by cause, fix-it, resolve 2 konteks; “item serupa” masih item yang sama/terkait. |
| F-24 | Readiness range & gates | ✅ | Display rules DESIGN §9.6 ditegakkan di kode + test. |
| F-25 | Pass probability | ◐ | Monte Carlo + interval, confidence low; belum dikalibrasi. |

### V1 / Later (sengaja belum)

F-26 what-if, F-27 exam logistics, F-28 notifications, F-29 streak/rest, F-30 AI explain, F-32 subscription,
F-33 B2B, F-34 full content, F-31/35/36 — belum, sesuai FEATURE §4.2.

---

## 6. Arsitektur

```
.
├── index.html                 # shell, boot splash, manifest, font preload
├── public/                    # manifest, ikon, font (Plus Jakarta Sans), OFL
├── scripts/
│   ├── dev.mjs                # Rollup watch + static server + SSE + tsc watch
│   ├── build.mjs              # typecheck → Rollup → terser → CSS → SW → budget
│   ├── serve.mjs              # preview statis
│   ├── test.mjs               # temukan *.test.ts, satu proses
│   ├── smoke.mjs              # bundle produksi di jsdom (journey penuh)
│   ├── inspect.mjs            # eval core/content/derive/state
│   ├── content-report.mjs     # coverage + integritas + mock balance
│   ├── report.mjs             # metrik terverifikasi → .metrics/latest.json
│   ├── docs.mjs               # docs:check / docs:sync
│   ├── make-icons.py          # ikon PWA (Pillow)
│   └── lib/build-utils.mjs    # TS transform, define, CSS bundler, hash
└── src/
    ├── core/                  # pure TS — tanpa React/DOM
    │   ├── types.ts           # domain + konten + state
    │   ├── fsrs.ts            # scheduler exam-aware
    │   ├── planner.ts         # 700 jam, gate, recovery, mock dates
    │   ├── readiness.ts       # model v0.1 + display rules
    │   ├── mock.ts            # scoring + wins/leaks
    │   ├── session.ts         # komposisi sesi
    │   ├── errors.ts          # taxonomy + grouping + resolusi
    │   ├── ruby.ts            # parser furigana
    │   ├── date.ts, util.ts
    │   └── *.test.ts          # test domain + konten
    ├── content/               # data kanonik + card factory
    │   ├── kana.ts, vocab.ts, kanji.ts, grammar.ts, reading.ts, listening.ts
    │   ├── cards.ts           # StudyCard/Concept/curriculum/mock forms
    │   └── content.test.ts    # validasi konten
    ├── state/
    │   ├── store.ts           # zustand, aksi, jawaban, mock, reconcile
    │   ├── derive.ts          # plan/readiness/pools/preview (pure)
    │   └── persistence.ts     # storage adapter + export/import
    ├── ui/                    # komponen aksesibel (Sheet, Option, CardView…)
    ├── screens/               # 12 layar
    ├── lib/                   # router hash, audio TTS, hooks
    └── styles/                # token, base, components, screens
```

### Prinsip arsitektur

1. **Core tidak tahu React.** Semua aturan produk ada di `src/core` dan diuji tanpa DOM.
2. **Satu jalur jawaban.** Semua jawaban (sesi, review, drill, mock) melewati `applyAnswer` → attempt, FSRS, error,
   coverage tidak mungkin berbeda antar layar.
3. **Store tipis.** Hitungan mahal (plan, readiness, pools) ada di `derive.ts` dan idempoten.
4. **Persistence di satu file.** Ganti ke IndexedDB/Supabase tanpa menyentuh layar.
5. **Konten = kode.** Tipe + factory + test; tidak ada JSON runtime yang bisa gagal parse.

---

## 7. Detail learning engine

### 7.1 FSRS

- FSRS-4.5, 17 parameter default (bukan hasil kalibrasi).
- `S0(G) = w[G-1]`; `D0(G) = w4 − e^(w5(G−1)) + 1`; mean reversion dengan `w7`.
- `R(t,S) = (1 + FACTOR·t/S)^(−0.5)`, `FACTOR = 0.9^(−2) − 1`.
- Rating 1 → due +10 menit (relearning), `lapses++`, fase `learning`/`relearning`.
- Rating 2–4 → interval dari stability; clamp `[1, min(365, daysToExam−1)]`.
- **Exam window:** jika ≤10 hari dan `examWeight ≥ 0.8`, due ditarik ke `examDate − (5..10 hari)` (deterministik dari
  hash card key). Tidak ada review setelah ujian.
- **Auto-grade:** salah → 1; benar & baru → 3; rasio waktu ≤0,6 → 4; ≤1,0 → 3; lebih → 2.
- **Leech:** ≥4 lapses atau stability <1 setelah 8 review; muncul di tab Leech; fix-it mengganti pendekatan.

Belum: parameter personal, load balancing penuh, undo, “cram mode” terpisah.

### 7.2 Planner

- Reality check memakai rentang **575–700–1.000 jam**; target 700.
- Verdict: ≥700 `comfortable`; ≥575 `tight`; ≥460 `risky`; <460 `unrealistic` (dan UI menampilkan tiga opsi).
- Fase: bobot DESIGN §7.3 dinormalisasi ke 700 jam → 33/104/152/191/125/76/19 jam (dibulatkan di `PHASE_HOURS`).
- Durasi fase = jam fase ÷ jam/minggu; total ≈ 700/jam per minggu (12 bulan pada 2,25×6).
- **Gate pinning:** `allowedPhaseIndex` = fase tertinggi yang gate masuknya terpenuhi; `current = min(kalender, bukti)`.
  Jika tertahan, UI menjelaskan gate mana dan mengapa.
- Recovery: ≥3 hari → new cap ×0,5, review cap ×0,8; akurasi <70% (≥20 jawaban) → new cap ×0,6.
- Mock: A di integrasi, B di simulasi, mock ringan H−7; ditampilkan di Rencana.
- `onTrack` dihitung dari sisa jam ÷ pace; jika lewat, narasi menyebut jam/hari yang dibutuhkan atau geser tanggal.

### 7.3 Readiness (v0.1, heuristik)

- Mastery per domain: `(benar + 2)/(attempt + 4)` × koreksi kecepatan (0,85–1,0).
- Skor domain: `mastery × (0,65 + 0,35·retensi) × (0,55 + 0,45·coverage)`.
- KR: rata-rata berbobot vocab 0,30 / kanji 0,18 / grammar 0,22 / reading 0,20 / kana 0,10, dipetakan ke 120
  dengan eksponen 0,92.
- Listening: skor domain → 60, eksponen 0,92.
- Anchor mock: bobot 0,4–0,75 sesuai jumlah mock; SEM memakai lebar rentang laporan mock.
- SEM latihan: `18/√(1+n/12)` (KR), `13/√(1+n_listening/6)` (LS), dilebarkan saat coverage rendah.
- Rentang: ±1,2816 SEM (80%). Total memakai korelasi 0,5.
- **Display rules** (ditegakkan + diuji):
  - <100 attempt & 0 mock → “Belum cukup data”, tanpa skor/probabilitas.
  - 1 mock + coverage <60% → “Estimasi awal”, tanpa probabilitas.
  - Probabilitas hanya jika ≥1 mock, coverage ≥60%, ≥60 jawaban latihan.
  - Status `at_risk` jika salah satu gate gagal — apa pun totalnya.
  - `safe` hanya jika ≥2 mock, semua gate, batas bawah total ≥95.
- Probabilitas: 6.000 simulasi Monte Carlo (shared ability ρ=0,5) + bootstrap 48×220 untuk interval 80%.
- Tiga faktor: gap × bobot domain + bonus gate; rule-based, bukan SHAP.

**Ini bukan model tervalidasi.** Ia sengaja transparan dan konservatif; kalibrasi menunggu data beta.

### 7.4 Sesi

- Rasio fase dari DESIGN §9.5; durasi per item: review 24 s, concept 95 s, check 35 s, apply 150 s, listening 75 s,
  prove 45 s.
- Quick 10/recovery: 3 review + 3 konsep + 2 listening (lihat CHANGELOG).
- Listening minimum 20% (mulai 15 menit), dengan top-up pool.
- Fill/trim agar durasi tidak lebih pendek dari janji; jika pool habis, durasi ditampilkan apa adanya (bukan dipaksa).
- `prove` menyisakan item apply untuk timed set (deep/sprint).
- Tidak ada pengulangan kartu dalam satu sesi.

### 7.5 Mock

- Linear estimate: `max × benar/total`, dengan rentang binomial 80%.
- KR menggabungkan seksi 1+2 (120), listening 60; total 180.
- Gate dievaluasi dari estimasi titik.
- Status `weak` jika <90% soal terjawab.
- Wins/leaks diambil dari item type dengan n≥2; jika kurang, tambah bukti netral (“menjawab X dari Y”).
- Item review default hanya yang salah, maksimal 20; “lihat semua” tersedia.

---

## 8. UX: keputusan & inventaris layar

| Route | Layar | Tujuan UX |
|---|---|---|
| `/onboarding` | 6 langkah | 4 keputusan sebelum sesi; tanpa tes menakutkan. |
| `/today` | Hari Ini | Jawab “apa sekarang?” <3 detik; satu CTA. |
| `/session` | Session player | Fokus penuh; feedback sebelum lanjut. |
| `/review` | Review queue | Due/terlambat/leech; tidak menumpuk. |
| `/plan` | Rencana | Peta fase + konsekuensi perubahan. |
| `/practice` | Latihan | Mock, drill, error, strategi. |
| `/mock/:id` | Mock overview | Aturan + kesiapan + start. |
| `/mock/:id/run` | Mock runner | Timer, answer sheet, break, auto-submit. |
| `/mock/:id/report` | Laporan | Diagnosis, bukan vonis. |
| `/progress` | Kesiapan | Range + gate + bukti + faktor. |
| `/errors` | Buku kesalahan | Kesalahan → remediasi. |
| `/library` + detail | Perpustakaan | Referensi + latihan kontekstual. |
| `/profile` | Profil | Target, preferensi, aksesibilitas, data. |

**Keputusan UX yang disengaja**

1. **Satu CTA solid per layar.** Quick 10 selalu secondary.
2. **Tidak ada “gagal”.** “Belum tepat”, “berisiko”, “belum aman”, “rencana dirapikan”.
3. **Angka selalu berentang** (kecuali coverage dan jumlah attempt, yang memang hitungan).
4. **Feedback tidak menghukum.** Tidak mengunci layar; salah tetap lanjut, item dijadwalkan ulang.
5. **Istirahat dihormati.** Rest day bisa dipin; copy “bukan bolos”.
6. **Audio tidak pernah memblokir.** TTS gagal → transkrip + retry.
7. **Tidak ada gamifikasi yang mempermalukan.** Tidak ada streak/leaderboard/XP.
8. **Beta terlihat.** Badge + banner + disclaimer di Hari Ini, mock, laporan, profil.
9. **Timer mock tidak pernah “menipu”.** Dihitung dari timestamp; reload tidak menghentikan waktu.
10. **Sheet, bukan halaman baru,** untuk penjelasan (“Kenapa?”) agar konteks tidak hilang.

**Yang belum diuji:** 5–8 pengguna per iterasi (DESIGN §12.1). Semua klaim “pengguna paham” masih hipotesis.

---

## 9. Konten

| Domain | Seed | Beta target | Gap |
|---|---:|---:|---:|
| Kana | 208 | 92 + kombinasi | ✅ melebihi |
| Kosakata | 60 | 1.200 | 5% |
| Kanji | 24 | 240 | 10% |
| Grammar | 14 (30 drill) | 100 | 14% |
| Reading | 5 (11 soal) | 40 | 12,5% |
| Listening | 10 | 100 | 10% |
| Mock | 2×65 | 2 form | struktur ✅, jumlah item ~74% |
| Test craft | 6 | 8 | 75% |

**Kenapa seed dulu?** Engineering loop inti tidak boleh menunggu 1.500 item. Seed cukup untuk membuktikan urutan,
feedback, FSRS, readiness, mock, dan error taxonomy. Semua kartu UI menyebut ini beta.

**Kualitas:** setiap item punya reading kana, arti Indonesia, contoh ber-ruby, dan penjelasan. Validasi otomatis
menolak ruby rusak, opsi duplikat, kunci hilang, bukti bacaan yang tidak ada di teks, kanji tanpa kata, grammar tanpa
contrast, dan mock dengan kartu ganda. **Belum** ada reviewer Jepang/Indonesia kedua — ini gap kepercayaan terbesar
selain audio.

**Menambah konten:** tambah ke file domain → ID stabil → `cards.ts` otomatis membuat kartu/curriculum → jalankan
`npm test` (content tests) → `npm run verify`. Tidak ada langkah build konten terpisah.

---

## 10. Aksesibilitas

Sudah:

- Skip link, landmark `main`, heading hierarkis, `lang="ja"` pada teks Jepang.
- Fokus terlihat, target sentuh ≥44 px, opsi ≥56 px.
- Dialog native dengan label unik, Escape, focus trap bawaan.
- Status dengan ikon + teks (bukan hanya warna); feedback `aria-live="polite"`; timer tabular.
- Preferensi reduce motion, text scale 100/115/130, tema terang/gelap/kontras token ≥4,5:1 untuk teks normal.
- Transcript untuk semua audio; fallback jika TTS tidak ada.
- Keyboard: 1–4 memilih, Enter menjawab; navigasi dasar lewat Tab.

Belum:

- Audit axe/Lighthouse otomatis dan uji TalkBack/VoiceOver di perangkat nyata.
- Arrow-key navigation di radiogroup jawaban.
- Fokus awal yang eksplisit saat pindah layar (belum ada route announcer).
- Uji text scaling browser 200% pada semua layar (hanya desain rem + manual spot check).
- Caption waktu nyata untuk audio (transkrip ada, sinkronisasi belum).

---

## 11. Developer experience

**Yang enak:**

- `npm run verify` menjalankan semua gerbang kualitas.
- Test 0,1 dtk; tidak ada transform saat test.
- `src/core` bisa dibaca tanpa React; setiap aturan punya test.
- Konten deterministik → test/smoke tidak flaky.
- Build melaporkan ukuran + status budget.
- Smoke memberi pesan kegagalan dengan dump teks layar dan tombol yang tersedia.

**Yang menyakitkan:**

- Cold start dev ~10–15 dtk (transpile 235 file + TS watch). Perlu cache prebundle.
- Tidak ada HMR; SSE reload memuat ulang halaman.
- Tidak ada typecheck di dev server untuk file yang tidak diimpor (watcher penuh berjalan, tetapi lambat).
- Terser menambah ~10 dtk build.
- Smoke jsdom tidak menguji layout/visual/CSS; bug visual hanya bisa ditangkap manusia.
- Chrome headless diblokir sandbox, jadi screenshot otomatis tidak tersedia.

**Tooling batch 1 (hasil retrospeksi sesi):**

- `npm run inspect` — eval ekspresi terhadap `core`/`content`/`derive`/state JSON, menggantikan 3 script
  `tmp-*.mjs` yang dibuat dan dihapus manual.
- `npm run content:report` — coverage vs target beta, integritas, distribusi kartu/kurikulum, dan overlap mock
  (sekarang mengungkap overlap grammar 13/25 dan listening 10/10 antar form).
- `npm run report` — satu sumber metrik (test, konten, build, smoke) → `.metrics/latest.json`.
- `npm run docs:check` / `docs:sync` — blok metrik di README/PROGRESS tidak bisa lagi basi; ini menutup dua putaran
  patch angka manual (22→23 langkah, 144,0→144,3 KB) yang terjadi di sesi sebelumnya.
- `AGENTS.md` — index modul, CLI, skill, non-negotiables, dan definition of done.

**Tooling batch 2–3:**

- `npm run scenario` — 6 fixture AppState (new, recovery, listening-gate, two-mocks, leech, exam-week);
  `inspect --state` dan smoke memakai state yang sama.
- `npm run smoke:routes` — 20 route dirender dari bundle produksi di jsdom; gagal pada console error,
  duplicate id, kontrol tanpa nama, atau `main#main` hilang. Menemukan dua bug nyata
  (`aria-labelledby` Today, file input Profil tanpa label).
- `npm run audit:a11y` — cek label/id/heading per route + kontras token light/dark (WCAG 4.5:1).
  Sekarang 0 critical, 0 warning, 0 kontras gagal; juga memaksa h1 yang hilang ditambahkan.
- `npm run lint:copy` — 0 temuan; aturan voice DESIGN §8 ditegakkan pada string/JSX, bukan hanya review manual.
- `skills/` — 5 skill portabel (content, release, toolchain, copy, fixtures) + index.
- Metrik kini mencakup Routes/A11y/Copy; `docs:sync` menolak blok yang tidak lengkap.
- **Perbaikan model**: peluang lulus di-cap 98–99% agar model yang belum dikalibrasi tidak mengklaim kepastian.

---

## 12. Agent experience

- **Peta modul jelas**: `core` (aturan) / `content` (data) / `state` (orkestrasi) / `ui` / `screens`.
- **Kontrak stabil**: `StudyCard`, `Concept`, `Attempt`, `Readiness` menjadi bahasa bersama.
- **Determinisme**: semua opsi dan mock memakai seed string; tidak ada `Math.random` di konten. Hanya ID sesi yang
  acak.
- **Test kit sederhana** dengan pesan kegagalan yang menunjukkan actual/expected.
- **Smoke sebagai spesifikasi hidup**: langkah-langkahnya menuliskan journey yang harus tetap jalan (jumlah aktual di
  blok metrik atas).
- **`AGENTS.md` ada** — peta modul, CLI index, skill index, non-negotiables, dan DoD. Ini titik masuk untuk agent
  berikutnya; jangan menambah aturan baru hanya di kepala.
- **`inspect` + `report`** mengurangi script sementara dan klaim angka manual. State fixture (gate gagal, 2 mock,
  recovery, leech) masih prioritas AX berikutnya.

---

## 13. Risiko & utang teknis

| Risiko | Dampak | Status |
|---|---|---|
| Konten seed terlalu kecil untuk klaim beta | Kepercayaan turun | Ditandai beta di UI + docs. |
| Readiness belum dikalibrasi | False safe | Display rules konservatif; perlu data mock. |
| TTS perangkat tidak konsisten | Listening tidak terlatih | Transkrip + label jujur; audio native prioritas 0.2. |
| localStorage bisa hilang (clear data) | Progres hilang | Export/impor + peringatan; IndexedDB/Supabase nanti. |
| localStorage quota (~5 MB) | Gagal simpan | Attempt/log dibatasi 6.000/5.000/400; warning console. |
| Tidak ada sync | Satu perangkat | Dijelaskan di Profil. |
| Jumlah item mock ≠ resmi | Over/under-confidence | Label betaf + disclaimer + rentang. |
| Bug timer saat background | Skor mock | Timer dari timestamp; auto-submit saat kembali. |
| CSS `color-mix` di WebView lama | Warna status gagal | Perlu fallback untuk Android lama (belum). |
| Tidak ada `git` | Tidak ada riwayat | Repo belum diinisialisasi; disarankan `git init`. |
| Reviewer manusia belum ada | Error konten | Validasi otomatis tidak menggantikan guru. |

---

## 14. Rencana berikutnya (prioritas UX → DX → AX)

### UX (0.2)

1. **Undo review 1 langkah** — kepercayaan saat salah tap.
2. **Reading exam mode**: timer, tanpa lookup, highlight bukti.
3. **Tap-to-lookup** kata di bacaan + simpan ke review.
4. **Sentence ordering** (★) dengan interaksi susun, bukan MCQ.
5. **Dictation 1 kalimat** + diff per kata.
6. **Route announcer** + fokus awal untuk screen reader.
7. **Uji 5 pengguna**: pahami rentang + gate, reality check tidak menakutkan, recovery 10 menit.
8. **Empty state** untuk mock belum ada, review kosong, dan audio tidak tersedia (sebagian sudah).

### Konten

9. 300 kata + 60 grammar + 20 bacaan + 30 listening; 100 audio native.
10. Review Jepang + Indonesia; content_version + audit trail.

### DX

11. Prebundle konten dev agar cold start <2 dtk.
12. Test komponen untuk CardView/Sheet (state + keyboard).
13. Contract test schema konten (JSON Schema) untuk CMS nanti.
14. `git init` + CI (test, typecheck, build, smoke, budget).

### AX

15. ~~`AGENTS.md`~~ **selesai**; ~~fixture state~~ **selesai** (`npm run scenario`).
16. ~~`npm run scenario -- gate-listening`~~ **selesai** (`listening-gate`); sisa: tambah skenario baru saat ada
    kelas bug baru.
17. Test snapshot teks layar kunci agar copy tidak regresi tanpa sengaja.
18. ~~`smoke:routes` + `audit:a11y` + `lint:copy`~~ **selesai** (batch 2). Sisa: axe/screen reader device test.

---

## 15. Log keputusan (ADR ringkas)

| # | Keputusan | Alternatif | Alasan |
|---|---|---|---|
| 1 | Local-first single-doc storage | Supabase dari hari 1 | Offline adalah fitur kepercayaan; backend belum ada. |
| 2 | FSRS-4.5 default | SM-2 | Bukti & arah produk (PRD). |
| 3 | 700 jam target | 575 jam | Buffer review/mock/sakit; kejujuran. |
| 4 | Gate pinning | Ikuti kalender saja | Materi baru tanpa fondasi = buang waktu. |
| 5 | Range-first readiness | Skor tunggal | Anti false precision. |
| 6 | Quick 10 3/3/2 | 4/3/3 | Janji 10 menit harus ditepati. |
| 7 | Rollup + tsc | Vite | Sandbox memblokir esbuild. |
| 8 | Smoke jsdom | Playwright | Chrome butuh named pipes. |
| 9 | TTS + transkrip | Tanpa audio | Listening-first tidak boleh menunggu aset. |
| 10 | Mock 65 soal berlabel beta | Menunda mock | Loop asesmen harus terbukti sekarang. |

---

## 16. Verifikasi terakhir

Snapshot 2026-10-26. Angka terbaru selalu ada di blok **“Angka kunci”** (dihasilkan `npm run report`), bukan di sini.

```text
npm run verify
  copy        ✓ 0 temuan
  test        ✓ 72/72
  typecheck   ✓ 0 error
  build       ✓ 144,4 KB gzip (PASS <200 KB), SW 16 file
  smoke       ✓ journey penuh, 0 console error
  routes      ✓ 20/20
  a11y        ✓ 0 critical · 0 warning · 0 kontras gagal
  report      ✓ .metrics/latest.json
  docs:check  ✓ README + PROGRESS cocok
```

Lingkungan: Windows, Node 24.19, Chrome 155 terpasang tetapi diblokir sandbox, jsdom untuk smoke.
