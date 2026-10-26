import { ArrowRight, BookOpen, Headphones, NotebookPen, Play, RotateCcw, Target, Timer, TrendingUp } from 'lucide-react';
import { SESSION_MODES } from '../core/types.ts';
import { formatDate, todayISO } from '../core/date.ts';
import { MOCK_FORMS } from '../content/index.ts';
import { useActions, useApp } from '../state/store.ts';
import { planFor, poolSummary, readinessFor } from '../state/derive.ts';
import { navigate } from '../lib/router.ts';
import { BottomNav, TopBar } from '../ui/Navigation.tsx';
import { Chip, PageHead } from '../ui/common.tsx';

const LESSONS = [
  {
    title: 'Tidak ada pengurangan nilai',
    body: 'Jawab semua soal. Kosong memberi nol, menebak dengan eliminasi masih punya peluang.',
  },
  {
    title: 'Listening hanya diputar sekali',
    body: 'Latih mendengar sekali. Kalau kehilangan satu kalimat, lepaskan dan tunggu kalimat berikutnya.',
  },
  {
    title: 'Gate per seksi, bukan total',
    body: 'Total 150 tetap tidak menutup listening di bawah 19. Gate adalah aturan, bukan saran.',
  },
  {
    title: 'Pacing kosakata',
    body: 'Bagian kosakata 25 menit. Targetkan sekitar 45 detik per soal, sisakan waktu untuk membaca ulang opsi.',
  },
  {
    title: 'Reading yang efisien',
    body: 'Baca pertanyaan dulu untuk tipe information retrieval, lalu cari angkanya. Jangan membaca semua teks dengan kecepatan sama.',
  },
  {
    title: 'Saat benar-benar tidak tahu',
    body: 'Eliminasi dua opsi, pilih satu, tandai, lanjut. Jangan menaruh 5 menit pada satu soal.',
  },
];

export function PracticeScreen() {
  const data = useApp((store) => store.data);
  const actions = useActions();
  const today = todayISO();
  const plan = planFor(data, today);
  const readiness = readinessFor(data, today);
  const pools = plan ? poolSummary(data, plan, today) : null;
  const openErrors = data.errors.filter((error) => error.status !== 'resolved').length;

  const startMock = (formId: string) => {
    actions.startMock(formId);
    navigate(`/mock/${formId}/run`);
  };

  return (
    <>
      <TopBar meta="Latihan" />
      <main className="app-main" id="main" tabIndex={-1}>
        <PageHead
          eyebrow="Latihan"
          title="Latihan yang mirip ujian"
          description="Mock penuh, drill format ujian, dan buku kesalahan. Tidak ada soal resmi JLPT yang disalin."
        />

        <div className="hub-grid">
          <button
            type="button"
            className="hub-card"
            onClick={() => {
              const mode = plan?.recovery ? 'recovery' : 'core45';
              if (actions.startSession(mode)) navigate('/session');
            }}
          >
            <span className="hub-card__icon"><Target size={18} aria-hidden /></span>
            <span className="hub-card__title">Latihan hari ini</span>
            <span className="hub-card__desc">
              Sesi adaptif dari rencana: review, item baru, latihan, dan menyimak.
            </span>
            <span className="hub-card__meta">
              {pools ? `${pools.due} review · ${pools.newItems} item baru` : 'Butuh rencana'}
            </span>
          </button>

          <button
            type="button"
            className="hub-card"
            onClick={() => {
              if (actions.startSession('quick10')) navigate('/session');
            }}
          >
            <span className="hub-card__icon"><Timer size={18} aria-hidden /></span>
            <span className="hub-card__title">Quick 10</span>
            <span className="hub-card__desc">10 menit untuk hari yang sibuk. Tetap berarti, bukan sekadar angka harian.</span>
            <span className="hub-card__meta">3 review · 3 konsep · 2 menyimak</span>
          </button>

          <button
            type="button"
            className="hub-card"
            onClick={() => navigate('/errors')}
          >
            <span className="hub-card__icon"><NotebookPen size={18} aria-hidden /></span>
            <span className="hub-card__title">Buku kesalahan</span>
            <span className="hub-card__desc">Kesalahan dikelompokkan berdasarkan penyebab, bukan nomor soal.</span>
            <span className="hub-card__meta">{openErrors > 0 ? `${openErrors} terbuka` : 'Belum ada kesalahan'}</span>
          </button>

          <button type="button" className="hub-card" onClick={() => navigate('/review')}>
            <span className="hub-card__icon"><RotateCcw size={18} aria-hidden /></span>
            <span className="hub-card__title">Review saja</span>
            <span className="hub-card__desc">Tanpa materi baru. Untuk hari yang hanya ingin mengunci ingatan.</span>
            <span className="hub-card__meta">{pools?.due ?? 0} kartu due</span>
          </button>
        </div>

        <section className="stack" style={{ marginTop: 24 }} aria-labelledby="drill-heading">
          <div className="section-title">
            <h2 id="drill-heading">Drill seksi</h2>
            <span className="caption">10 soal format ujian · timed</span>
          </div>
          <div className="stack-sm">
            {(
              [
                ['vocabulary', 'Kosakata', 'Ejaan, bacaan kanji, konteks', BookOpen],
                ['grammar_reading', 'Grammar & Membaca', 'Bentuk, kohesi, bacaan pendek', TrendingUp],
                ['listening', 'Menyimak', 'Audio sekali, termasuk quick response', Headphones],
              ] as const
            ).map(([domain, title, desc, Icon]) => (
              <button
                type="button"
                className="quick-link"
                key={domain}
                onClick={() => {
                  if (actions.startDrill(domain)) navigate('/session');
                  else actions.notify('Selesaikan sesi yang sedang berjalan dulu.');
                }}
              >
                <span className="quick-link__icon"><Icon size={18} aria-hidden /></span>
                <span className="grow">
                  <span className="quick-link__title">{title}</span>
                  <span className="quick-link__sub">{desc}</span>
                </span>
                <ArrowRight size={16} aria-hidden />
              </button>
            ))}
          </div>
          <p className="caption">
            Drill ini memakai item mock form beta dengan timer 10 menit. Timer section resmi 25/55/35 menit dipakai di
            full mock.
          </p>
        </section>

        <section className="stack" style={{ marginTop: 24 }} aria-labelledby="mock-heading">
          <div className="section-title">
            <h2 id="mock-heading">Full mock</h2>
            <span className="caption">2 form beta · timer ketat</span>
          </div>
          {MOCK_FORMS.map((form) => {
            const attempts = data.mocks.filter((mock) => mock.formId === form.id);
            const last = attempts.at(-1);
            return (
              <div className="card stack-sm" key={form.id}>
                <div className="row-between">
                  <div>
                    <p style={{ fontWeight: 800 }}>{form.label}</p>
                    <p className="caption">
                      {form.sections.vocabulary.length} kosakata · {form.sections.grammar_reading.length} grammar &
                      bacaan · {form.sections.listening.length} menyimak
                    </p>
                  </div>
                  {last ? (
                    <Chip tone="info">{last.report.total.estimate}/180</Chip>
                  ) : (
                    <Chip tone="neutral">belum diambil</Chip>
                  )}
                </div>
                <p className="caption">
                  {last
                    ? `Terakhir ${formatDate(last.submittedAt.slice(0, 10))} · ${last.report.status === 'above' ? 'di atas gate' : last.report.status === 'gate_failed' ? 'ada gate di bawah ambang' : 'bukti belum lengkap'}`
                    : '115 menit + istirahat. Audio sekali. Pause hanya antar-seksi.'}
                </p>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn--primary grow"
                    onClick={() => startMock(form.id)}
                  >
                    <Play size={16} aria-hidden /> Mulai {form.label}
                  </button>
                  {last ? (
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => navigate(`/mock/${form.id}/report`)}
                    >
                      Laporan
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => navigate(`/mock/${form.id}`)}
                    >
                      Aturan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <p className="caption">
            Form beta belum setara jumlah item resmi. Timer mengikuti format 2026: 25 + 55 + 35 menit.
          </p>
        </section>

        <section className="stack" style={{ marginTop: 24 }} aria-labelledby="strategy-heading">
          <div className="section-title">
            <h2 id="strategy-heading">Strategi ujian</h2>
            <span className="caption">6 micro-lessons</span>
          </div>
          <div className="stack-sm">
            {LESSONS.map((lesson, index) => (
              <div className="lesson" key={lesson.title}>
                <span className="lesson__num">0{index + 1}</span>
                <span className="lesson__title">{lesson.title}</span>
                <span className="lesson__body">{lesson.body}</span>
              </div>
            ))}
          </div>
        </section>

        {readiness?.nextAction ? (
          <div className="banner banner--info" style={{ marginTop: 24 }}>
            <Target size={18} aria-hidden />
            <div>
              <strong className="banner__title">{readiness.nextAction.title}</strong>
              {readiness.nextAction.detail}
            </div>
          </div>
        ) : null}
      </main>
      <BottomNav />
    </>
  );
}
