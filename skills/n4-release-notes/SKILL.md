---
name: n4-release-notes
description: Use when closing a milestone, preparing a PR, or updating CHANGELOG/PROGRESS for N4 Pilot. Ensures numbers come from verified metrics, gaps stay honest, and docs do not drift.
---

# N4 Pilot — release notes & progress

## When to use

- Menutup batch fitur / PR / milestone.
- Memperbarui `CHANGELOG.md`, `PROGRESS.md`, atau README.
- Menjawab “apa yang berubah dan apa yang belum?”.

## Perintah wajib (urutan)

```bash
npm run verify        # test → typecheck → build → smoke → routes → a11y → copy → report → docs:check
npm run report        # metrik aktual ke .metrics/latest.json
npm run docs:check    # harus lulus
```

Jika `docs:check` gagal karena angka berubah:

```bash
npm run docs:sync
```

Jangan menyalin angka dari terminal ke prosa. Blok di README/PROGRESS di antara
`<!-- metrics:start -->` dan `<!-- metrics:end -->` hanya boleh diubah oleh `docs:sync`.

## Isi CHANGELOG

- Tambah di `## [Unreleased]`; jangan menulis ulang rilis lama.
- Kelompokkan `Added`, `Changed`, `Fixed`, `Known gaps`.
- Setiap bug: sebutkan **bagaimana ditemukan** (test/smoke/route/a11y/manual) dan dampaknya.
- Sebutkan command verifikasi yang benar-benar dijalankan, bukan yang seharusnya.
- Untuk perubahan konten, sebutkan angka seed vs target beta dengan jujur.

## Isi PROGRESS

- Status fitur terhadap F-ID (`FEATURE.md`) dan bukti (layar/modul/test).
- Gap yang belum selesai: jangan disembunyikan.
- Risiko/utang teknis + rencana berikutnya.
- Angka kunci memakai blok metrik otomatis (jangan hardcode angka baru di prosa).

## Aturan kejujuran

- Jangan menulis “siap N4”, “dijamin lulus”, atau skor resmi.
- Sebut “estimasi”, “rentang”, “beta”, “seed” bila memang demikian.
- Kalau smoke/route/a11y gagal, jangan merilis notes yang mengklaim hijau.
- Kalau metrik tidak lengkap, tulis “belum dijalankan” — jangan mengarang.

## Definition of done

- [ ] `npm run verify` hijau (atau kegagalan dijelaskan eksplisit).
- [ ] CHANGELOG punya entri untuk perubahan ini.
- [ ] PROGRESS memperbarui status/gap + blok metrik sinkron.
- [ ] `docs:check` lulus tanpa edit manual blok metrik.
- [ ] Tidak ada klaim yang tidak bisa dibuktikan dengan command di repo.
