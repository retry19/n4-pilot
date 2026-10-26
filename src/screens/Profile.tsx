import { useRef, useState } from 'react';
import {
  Download,
  ExternalLink,
  Info,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import type { TargetScore } from '../core/types.ts';
import { EXAM_PRESETS } from '../core/planner.ts';
import { formatDate, formatMinutes, todayISO } from '../core/date.ts';
import { CONTENT_SUMMARY } from '../content/index.ts';
import { useActions, useApp } from '../state/store.ts';
import { navigate } from '../lib/router.ts';
import { BottomNav, TopBar } from '../ui/Navigation.tsx';
import { Banner, Chip, PageHead } from '../ui/common.tsx';
import { Sheet } from '../ui/Sheet.tsx';

export function ProfileScreen() {
  const data = useApp((store) => store.data);
  const actions = useActions();
  const fileRef = useRef<HTMLInputElement>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [hours, setHours] = useState(data.goal?.hoursPerDay ?? 2.25);
  const [days, setDays] = useState(data.goal?.daysPerWeek ?? 6);
  const [examDate, setExamDate] = useState(data.goal?.examDate ?? '2027-12-05');
  const [target, setTarget] = useState<TargetScore>(data.goal?.targetScore ?? 90);

  const goal = data.goal;
  const examLabel = EXAM_PRESETS.find((preset) => preset.date === examDate)?.label ?? formatDate(examDate);

  const exportData = () => {
    const blob = new Blob([actions.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `n4-pilot-${todayISO()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    actions.notify('Data diekspor. Simpan file ini di tempat aman.');
  };

  const importData = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const ok = actions.importJson(text);
    actions.notify(ok ? 'Data dipulihkan.' : 'File tidak dikenali. Pastikan ini ekspor N4 Pilot.');
  };

  const toggle = (key: 'romaji' | 'audioAutoplay' | 'reduceMotion' | 'sound' | 'haptics') => {
    actions.updateSettings({ [key]: !data.settings[key] });
  };

  return (
    <>
      <TopBar meta="Profil" />
      <main className="app-main" id="main" tabIndex={-1}>
        <PageHead eyebrow="Akun" title="Profil & pengaturan" description="Semua data tersimpan lokal di perangkat ini. Tidak ada akun, tidak ada unggahan." />

        <div className="stack">
          <div className="profile-hero">
            <span className="avatar" aria-hidden>
              <UserRound size={22} />
            </span>
            <div className="grow">
              <p style={{ fontWeight: 800 }}>Pelajar N4</p>
              <p className="caption">Sejak {formatDate(data.profile.createdAt.slice(0, 10))} · beta</p>
            </div>
            <Chip tone="neutral">lokal</Chip>
          </div>

          <div className="settings-group">
            <h2>Target</h2>
            <div className="settings-list">
              <button type="button" className="settings-row" onClick={() => setGoalOpen(true)}>
                <span>
                  <span className="settings-row__label">Tanggal & beban</span>
                  <span className="settings-row__value" style={{ display: 'block' }}>
                    {goal ? `${goal.examLabel}${goal.examIsEstimate ? ' (perkiraan)' : ''} · ${formatMinutes(goal.hoursPerDay * 60)} × ${goal.daysPerWeek} hari` : 'Belum diatur'}
                  </span>
                </span>
                <span className="settings-row__value">Ubah</span>
              </button>
              <a className="settings-row" href="#/plan">
                <span className="settings-row__label">Rencana & fase</span>
                <span className="settings-row__value">Lihat</span>
              </a>
              <a className="settings-row" href="#/progress">
                <span className="settings-row__label">Kesiapan & bukti</span>
                <span className="settings-row__value">Lihat</span>
              </a>
            </div>
          </div>

          <div className="settings-group">
            <h2>Preferensi belajar</h2>
            <div className="settings-list">
              <div className="settings-row">
                <div>
                  <span className="settings-row__label">Furigana</span>
                  <span className="settings-row__value">Bantuan baca di atas kanji</span>
                </div>
                <div className="segmented" role="group" aria-label="Furigana">
                  {(
                    [
                      ['all', 'Semua'],
                      ['tap', 'Saat tap'],
                      ['off', 'Mati'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={data.settings.furigana === value}
                      onClick={() => actions.updateSettings({ furigana: value })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-row">
                <div>
                  <span className="settings-row__label">Romaji</span>
                  <span className="settings-row__value">Matikan setelah kana gate 95%</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={data.settings.romaji}
                  aria-label="Romaji"
                  className="switch"
                  onClick={() => toggle('romaji')}
                />
              </div>
              <div className="settings-row">
                <div>
                  <span className="settings-row__label">Autoplay audio</span>
                  <span className="settings-row__value">Default mati; audio tidak pernah tiba-tiba berbunyi</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={data.settings.audioAutoplay}
                  aria-label="Autoplay audio"
                  className="switch"
                  onClick={() => toggle('audioAutoplay')}
                />
              </div>
            </div>
          </div>

          <div className="settings-group">
            <h2>Aksesibilitas</h2>
            <div className="settings-list">
              <div className="settings-row">
                <div>
                  <span className="settings-row__label">Ukuran teks</span>
                  <span className="settings-row__value">Sampai 200% tanpa layout rusak</span>
                </div>
                <div className="segmented" role="group" aria-label="Ukuran teks">
                  {(
                    [
                      [1, 'Normal'],
                      [1.15, 'Besar'],
                      [1.3, 'Lebih besar'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={data.settings.textScale === value}
                      onClick={() => actions.updateSettings({ textScale: value })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-row">
                <span className="settings-row__label">Kurangi animasi</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={data.settings.reduceMotion}
                  aria-label="Kurangi animasi"
                  className="switch"
                  onClick={() => toggle('reduceMotion')}
                />
              </div>
              <div className="settings-row">
                <span className="settings-row__label">Tema</span>
                <div className="segmented" role="group" aria-label="Tema">
                  {(
                    [
                      ['system', 'Sistem'],
                      ['light', 'Terang'],
                      ['dark', 'Gelap'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={data.settings.theme === value}
                      onClick={() => actions.updateSettings({ theme: value })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-row">
                <span className="settings-row__label">Getar halus</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={data.settings.haptics}
                  aria-label="Getar halus"
                  className="switch"
                  onClick={() => toggle('haptics')}
                />
              </div>
            </div>
          </div>

          <div className="settings-group">
            <h2>Data</h2>
            <div className="settings-list">
              <button type="button" className="settings-row" onClick={exportData}>
                <span className="row">
                  <Download size={18} aria-hidden />
                  <span className="settings-row__label">Ekspor data</span>
                </span>
                <span className="settings-row__value">JSON</span>
              </button>
              <button type="button" className="settings-row" onClick={() => fileRef.current?.click()}>
                <span className="row">
                  <Upload size={18} aria-hidden />
                  <span className="settings-row__label">Impor data</span>
                </span>
                <span className="settings-row__value">Pulihkan</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="sr-only"
                aria-label="Impor data JSON N4 Pilot"
                onChange={(event) => void importData(event.target.files?.[0])}
              />
              <button type="button" className="settings-row settings-row--danger" onClick={() => setResetOpen(true)}>
                <span className="row">
                  <Trash2 size={18} aria-hidden />
                  <span className="settings-row__label">Hapus semua progres</span>
                </span>
                <span className="settings-row__value">2 langkah</span>
              </button>
            </div>
            <p className="about-note">
              Data ini milikmu. Tidak ada server, tidak ada pelacakan pihak ketiga. Ekspor sebelum mengganti perangkat.
            </p>
          </div>

          <div className="settings-group">
            <h2>Tentang</h2>
            <div className="settings-list">
              <div className="settings-row">
                <span className="settings-row__label">Versi</span>
                <span className="settings-row__value">0.1.0 · beta</span>
              </div>
              <div className="settings-row">
                <span className="settings-row__label">Konten seed</span>
                <span className="settings-row__value">
                  {CONTENT_SUMMARY.vocab} kata · {CONTENT_SUMMARY.kanji} kanji · {CONTENT_SUMMARY.grammar} pola ·{' '}
                  {CONTENT_SUMMARY.reading} bacaan · {CONTENT_SUMMARY.listening} listening
                </span>
              </div>
              <a className="settings-row" href="https://www.jlpt.jp/e/guideline/results.html" target="_blank" rel="noreferrer noopener">
                <span className="settings-row__label">Aturan skor & gate resmi</span>
                <ExternalLink size={16} aria-hidden />
              </a>
              <a className="settings-row" href="https://www.jlpt.jp/e/guideline/testsections.html" target="_blank" rel="noreferrer noopener">
                <span className="settings-row__label">Struktur tes resmi</span>
                <ExternalLink size={16} aria-hidden />
              </a>
              <a className="settings-row" href="https://jlptonline.or.id/" target="_blank" rel="noreferrer noopener">
                <span className="settings-row__label">JLPT Indonesia (pendaftaran)</span>
                <ExternalLink size={16} aria-hidden />
              </a>
            </div>
          </div>

          <Banner tone="info" title="Beta, gratis, dan jujur">
            Ini beta untuk memvalidasi loop belajar. Tidak ada paywall, tidak ada klaim “siap N4”. Cakupan konten masih
            seed dan semua skor adalah estimasi.
          </Banner>

          <div className="banner banner--neutral">
            <ShieldCheck size={18} aria-hidden />
            <div>
              Audio memakai mesin suara perangkat; tidak ada rekaman dikirim ke mana pun. Data belajar tetap di
              localStorage perangkat ini.
            </div>
          </div>

          <button type="button" className="btn btn--secondary btn--block" onClick={() => navigate('/onboarding')}>
            Lihat ulang onboarding
          </button>
        </div>
      </main>
      <BottomNav />

      <Sheet
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        title="Tanggal & beban belajar"
        description="Perubahan akan membuat versi rencana baru. Progres tidak direset."
        footer={
          <>
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => {
                actions.updateGoal({
                  examDate,
                  examLabel,
                  examIsEstimate: EXAM_PRESETS.find((preset) => preset.date === examDate)?.isEstimate ?? true,
                  hoursPerDay: hours,
                  daysPerWeek: days,
                  targetScore: target,
                });
                setGoalOpen(false);
              }}
            >
              Simpan target
            </button>
            <button type="button" className="btn btn--secondary btn--block" onClick={() => setGoalOpen(false)}>
              Batal
            </button>
          </>
        }
      >
        <div className="stack">
          <div className="field">
            <span className="field__label">Tanggal ujian</span>
            <div className="choice-grid">
              {EXAM_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="choice"
                  aria-pressed={examDate === preset.date}
                  onClick={() => setExamDate(preset.date)}
                >
                  <span className="grow">
                    <span className="choice__title">{preset.label}</span>
                    <span className="choice__desc">{preset.note}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="budget-row">
            <span className="field__label">Jam per hari</span>
            <span className="slider-value">{String(hours).replace('.', ',')} jam</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={6}
            step={0.25}
            value={hours}
            aria-label="Jam per hari"
            onChange={(event) => setHours(Number(event.target.value))}
          />
          <div className="field">
            <span className="field__label">Hari per minggu</span>
            <div className="segmented" role="group" aria-label="Hari per minggu">
              {[3, 4, 5, 6, 7].map((value) => (
                <button key={value} type="button" aria-pressed={days === value} onClick={() => setDays(value)}>
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field__label">Target skor</span>
            <div className="segmented" role="group" aria-label="Target skor">
              {[90, 110, 130].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={target === value}
                  onClick={() => setTarget(value as TargetScore)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <p className="caption">Target skor tidak mengubah gate. Total tetap harus ≥90, dengan gate 38 dan 19.</p>
        </div>
      </Sheet>

      <Sheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Hapus semua progres?"
        description="Review, mock, kesalahan, dan rencana akan hilang dari perangkat ini. Tindakan ini tidak bisa dibatalkan."
        footer={
          <>
            <button
              type="button"
              className="btn btn--danger btn--block"
              onClick={() => {
                actions.resetAll();
                setResetOpen(false);
                navigate('/onboarding');
              }}
            >
              <Trash2 size={16} aria-hidden /> Ya, hapus semua
            </button>
            <button type="button" className="btn btn--secondary btn--block" onClick={() => setResetOpen(false)}>
              Batal
            </button>
          </>
        }
      >
        <div className="banner banner--warning">
          <Info size={18} aria-hidden />
          <div>Ekspor data dulu jika kamu ingin menyimpannya.</div>
        </div>
      </Sheet>
    </>
  );
}
