# Skills — N4 Pilot

Skill portabel (format Agent Skills: `SKILL.md` dengan frontmatter `name` + `description`).
Skill dipakai untuk pekerjaan yang butuh **penilaian**; CLI untuk pekerjaan deterministik.
Skill wajib memanggil CLI, bukan menduplikasi logikanya.

| Skill | Pakai saat | CLI wajib |
|---|---|---|
| [`n4-content-authoring`](./n4-content-authoring/SKILL.md) | Menambah/mengubah kana, kata, kanji, grammar, bacaan, listening | `npm run content:report`, `npm test` |
| [`n4-release-notes`](./n4-release-notes/SKILL.md) | Menutup milestone / menulis CHANGELOG | `npm run verify`, `npm run report`, `npm run docs:check` |
| [`sandbox-webapp-toolchain`](./sandbox-webapp-toolchain/SKILL.md) | Memulai web app di sandbox DSH; Vite/Chrome gagal | probe spawn/registry/browser |
| [`ux-copy-guardrails`](./ux-copy-guardrails/SKILL.md) | Menulis/mereview copy UI | `npm run lint:copy`, `npm run smoke:routes` |
| [`n4-scenario-fixtures`](./n4-scenario-fixtures/SKILL.md) | Bug/QA bergantung pada state learner | `npm run scenario`, `npm run smoke:routes`, `npm run audit:a11y` |

## Memasang di harness

Repo ini tidak mendaftarkan skill secara otomatis ke DSH. Salin folder skill ke direktori skill
harness-mu, atau rujuk path-nya dari `AGENTS.md`. Agent yang membaca `AGENTS.md` tetap mendapat
index + perintah wajibnya.

## Aturan perawatan

- Satu skill = satu pekerjaan; trigger jelas; ada Definition of Done.
- Jangan membuat skill untuk pekerjaan yang baru terjadi sekali.
- Jika CLI berubah, perbarui skill + `AGENTS.md` + README di PR yang sama.
- Skill tidak boleh memuat angka build/test yang bisa basi; rujuk `npm run report`.
