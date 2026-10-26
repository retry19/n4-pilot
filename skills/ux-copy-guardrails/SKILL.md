---
name: ux-copy-guardrails
description: Use when writing or reviewing N4 Pilot UI copy in Bahasa Indonesia. Enforces the calm-mentor voice, banned words (gagal/Salah!/Anda/streak/guarantees), one primary CTA, and the copy lint gate.
---

# N4 Pilot — UX copy guardrails

## When to use

- Menulis/mengubah teks di `src/screens`, `src/ui`, `src/core/types.ts` (ERROR_CAUSE),
  `src/core/readiness.ts` (STATUS_COPY), `src/core/planner.ts` (narrative), atau toast di store.
- Mereview PR yang mengubah copy.
- Menulis empty state, error, recovery, atau hasil mock.

## Voice

Mentor tenang, jujur, tidak menghakimi. Bicara seperti orang dewasa ke orang dewasa.
Gunakan **“kamu”**, bukan “Anda”. Tidak ada maskot, sakura, atau nada guru TK.

## Dilarang → gunakan

| Jangan | Gunakan |
|---|---|
| “gagal” | “belum aman”, “berisiko”, “belum tepat”, “rencana dirapikan” |
| “Salah!” | “Belum tepat” |
| “Anda” | “kamu” |
| “streak” | “ritme”, “bukti”, “sesi” |
| “mengecewakan” | “kita sesuaikan rencananya” |
| “pasti lulus”, “dijamin lulus” | “estimasi”, “rentang”, “peluang” |
| “klik di sini” | label aksi spesifik: “Mulai sesi”, “Lihat rencana” |
| “!!” | satu tanda seru maksimal, biasanya tanpa |

Aturan tambahan:

- Angka kesiapan selalu berentang; sebut “estimasi, bukan skor resmi”.
- Gate harus terlihat sebelum total; jangan menulis “aman” jika gate di bawah.
- Satu CTA solid per layar; Quick 10 secondary.
- Empty state: satu kalimat + satu aksi.
- Error: apa yang terjadi + apa yang bisa dilakukan + retry.
- Recovery: “Kamu absen 3 hari. Rencana sudah dirapikan.” — bukan “Kamu tertinggal”.
- Jangan hardcode angka build/test/konten; gunakan blok metrik otomatis.

## Perintah wajib

```bash
npm run lint:copy          # 0 temuan
npm run smoke:routes       # copy berubah → pastikan semua route tetap render
npm run audit:a11y         # nama tombol/label tetap ada
```

`lint:copy` memindai string literal + JSX text; komentar, `console.*`, dan `Error()` dilewati.
Jika ada pengecualian yang sah, tambahkan komentar `copy-lint:ignore` di baris tersebut dan
jelaskan alasannya di PR.

## Contoh rewrite

- ❌ “Kamu gagal gate listening.” → ✅ “Listening belum aman. Ini yang paling menaikkan peluangmu minggu ini.”
- ❌ “Salah! Coba lagi.” → ✅ “Belum tepat. に menandai tempat keberadaan; で menandai aktivitas.”
- ❌ “Anda punya 487 review.” → ✅ “Tidak ada tumpukan. Kita sebar review-nya.”
- ❌ “Dijamin lulus dengan 2 jam/hari.” → ✅ “Dengan 2,25 jam × 6 hari, ini sekitar 12 bulan. Bukan janji.”

## Definition of done

- [ ] `npm run lint:copy` 0 temuan.
- [ ] `npm run smoke:routes` hijau.
- [ ] Tidak ada klaim resmi/guarantee/streak shaming.
- [ ] CTA utama jelas; teks sekunder tidak bersaing.
- [ ] Copy membaca natural dalam Bahasa Indonesia (bukan terjemahan literal).
