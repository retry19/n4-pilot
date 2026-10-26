---
name: n4-scenario-fixtures
description: Use when a bug or design decision depends on learner state (gate failure, recovery, leech, exam week, two mocks). Generates reproducible AppState fixtures and runs route/a11y audits against them without touching real user data.
---

# N4 Pilot — scenario fixtures

## When to use

- Bug hanya muncul pada state tertentu: listening di bawah gate, 2 mock, bolos 4 hari,
  leech, minggu ujian.
- Ingin menguji UI Progress/Today tanpa menjawab 200 soal manual.
- Ingin memastikan “Aman” tidak muncul saat gate gagal.

## Perintah

```bash
npm run scenario                       # daftar skenario
npm run scenario -- --all              # tulis fixtures/<id>.json
npm run scenario -- listening-gate --today 2026-10-26
```

Skenario tersedia: `new`, `recovery`, `listening-gate`, `two-mocks`, `leech`, `exam-week`.

Pakai fixture untuk inspeksi engine:

```bash
npm run inspect -- --state fixtures/listening-gate.json "helpers.readiness().status"
npm run inspect -- --state fixtures/listening-gate.json "helpers.readiness().gates"
npm run inspect -- --state fixtures/exam-week.json "helpers.plan().currentPhase"
```

Uji UI dengan state itu:

```bash
npm run smoke:routes -- --scenario listening-gate
npm run audit:a11y  -- --scenario listening-gate
```

## Aturan

- Fixture **tidak menyentuh** localStorage pengguna; `bootApp` menyuntikkan state ke jsdom.
- Selalu pakai `--today` tetap saat membandingkan hasil/regresi.
- Jangan mengedit JSON fixture manual; ubah `scripts/lib/scenarios.mjs` lalu regenerasi.
- Skenario baru harus punya: id, label, deskripsi, dan tujuan QA yang jelas.
- Jika bug berasal dari kombinasi state baru, tambahkan skenario ke `SCENARIOS` + `build()`.
- Jangan memakai fixture untuk mengklaim lulus ujian; ini alat QA.

## Definition of done

- [ ] `npm run scenario -- <id>` menghasilkan JSON yang bisa dimuat `inspect`.
- [ ] `smoke:routes -- --scenario <id>` 20/20.
- [ ] `audit:a11y -- --scenario <id>` 0 critical, 0 kontras gagal.
- [ ] Readiness/plan pada fixture sesuai tujuan (mis. listening-gate → `at_risk`,
      exam-week → fase `taper`).
- [ ] Perubahan perilaku dilindungi test engine atau smoke step.
