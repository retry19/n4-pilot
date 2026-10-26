---
name: n4-content-authoring
description: Use when adding or changing N4 Pilot learning content (kana, vocabulary, kanji, grammar, reading, listening). Covers the content schema, ruby/furigana syntax, N4-only item types, Indonesian voice, and the validation commands that must pass.
---

# N4 Pilot — content authoring

## When to use

- Menambah/mengubah item di `src/content/{kana,vocab,kanji,grammar,reading,listening}.ts`.
- Membuat mock item, drill, atau contoh kalimat.
- Mereview konten sebelum dianggap selesai.

Bukan untuk mengubah UI atau engine. Untuk itu lihat `AGENTS.md`.

## Baca dulu

1. `PRD.md` §2.3 (item type N4), §9 (volume & quality bar), §9.3 (sumber/lisensi).
2. `DESIGN.md` §8.5 (aturan tampilan Jepang), §8.1–8.4 (voice/terminologi).
3. `src/content/cards.ts` — kartu & mock dibuat otomatis dari item; jangan duplikasi.
4. `AGENTS.md` §4 non-negotiables.

## Aturan yang tidak boleh dilanggar

- **Hanya tipe N4**: vocab (reading kanji, orthography, context, usage), grammar (form,
  sentence ordering/text grammar), reading (short, mid, information retrieval), listening
  (task-based, key points, verbal expressions, quick response). **Tidak ada long reading,
  tidak ada general outline.**
- **Kanji selalu di dalam kata.** Jangan mengajarkan reading kanji terisolasi.
- **Jangan menyalin** soal/audio JLPT resmi. Contoh harus orisinal.
- **Reading kana**: field `reading`, `scriptReading`, dan `passage.reading` hanya kana +
  tanda baca; jangan ada kanji/Latin.
- **Audio**: isi `audio`/`scriptReading` dengan kana agar TTS tidak salah baca kanji.
  Tidak ada rekaman native di seed.
- **Bahasa Indonesia natural**, bukan terjemahan literal. Hindari “Anda”, “gagal”,
  “Salah!”, streak shaming.
- **Setiap item** punya arti Indonesia, contoh, dan penjelasan yang menjelaskan *kenapa*.
- **Setiap kanji** minimal 2 kata contoh; **setiap grammar** punya contrast pair +
  common error + minimal 2 drill; **setiap reading question** punya bukti di teks.

## Sintaks ruby

```ts
example: { ja: '{会社|かいしゃ}まで{電車|でんしゃ}で行きます。', reading: 'かいしゃまででんしゃでいきます。' }
```

- `{kanji|kana}`; reading wajib kana, tanpa nested.
- Contoh tanpa ruby tetap harus punya `reading` penuh.
- `validateRuby` menolak kurung tidak seimbang/reading berkanji.

## ID & data

- ID stabil: `v-taberu`, `k-hito`, `g-teiru`, `r-short-1`, `l-task-1`. Jangan ubah ID yang
  sudah dipakai kartu/attempt.
- Kosakata: `word`, `reading`, `romaji`, `meaning`, `pos`, `level`, `audio`, `example`,
  `kanjiIds`, `tags`, `frequency`.
- Kanji: `on/kun` hanya bacaan relevan; `words` minimal 2; `mnemonic` + `mistake`.
- Grammar drill: 4 opsi unik, `correct` ada, prompt memuat `（　）`, penjelasan ≥15 char.
- Listening: 3–4 opsi unik, `scriptReading` kana, penjelasan distraktor.

## Perintah wajib

```bash
npm run content:report     # integritas harus OK + coverage
npm test                   # content.test + engine
npm run report             # metrik terverifikasi
npm run docs:sync          # jika jumlah konten berubah
```

`content:report` mencakup id unik, ruby, kana-only readings, opsi duplikat, kunci hilang,
bukti bacaan, kanji tanpa kata, grammar tanpa contrast, mock ganda, dan overlap form.

## Definition of done

- [ ] `content:report` integritas **OK** (0 issue).
- [ ] `npm test` hijau.
- [ ] Tidak ada item tanpa contoh/audio/arti.
- [ ] Tidak ada tipe soal di luar N4.
- [ ] Tidak ada konten resmi yang disalin.
- [ ] `docs:sync` jika angka berubah; CHANGELOG bila relevan.
- [ ] Untuk V1: reviewer Jepang + Indonesia menyetujui (seed sekarang belum).

## Jangan

- Menambah field baru ke schema tanpa memperbarui `types.ts`, `cards.ts`, test, dan docs.
- Menaruh kanji di `reading` atau Latin di `scriptReading`.
- Membuat opsi yang semuanya benar/mirip tanpa penjelasan pembeda.
- Mengklaim cakupan beta penuh (1.200 kata) dari seed 60.
