import { useState } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, CircleHelp, Clock, Headphones, Info } from 'lucide-react';
import { DOMAIN_LABEL, EXAM } from '../core/types.ts';
import { STATUS_COPY } from '../core/readiness.ts';
import { formatDate, formatDateLong, relativeDay, todayISO } from '../core/date.ts';
import { useActions, useApp } from '../state/store.ts';
import { coveragePools, domainStats, mockReports, planFor, readinessFor } from '../state/derive.ts';
import { navigate } from '../lib/router.ts';
import { BottomNav, TopBar } from '../ui/Navigation.tsx';
import { Banner, Chip, CoverageRow, EmptyState, GateRow, PageHead, Progress, RangeBar, Sparkline, Stat } from '../ui/common.tsx';
import { Sheet } from '../ui/Sheet.tsx';

export function ProgressScreen() {
  const data = useApp((store) => store.data);
  const actions = useActions();
  const [whyOpen, setWhyOpen] = useState(false);
  const today = todayISO();
  const readiness = readinessFor(data, today);
  const plan = planFor(data, today);
  const pools = coveragePools(data);
  const mocks = mockReports(data);

  return (
    <>
      <TopBar meta="Kesiapan" />
      <main className="app-main" id="main" tabIndex={-1}>
        <PageHead
          eyebrow="Progres"
          title="Kesiapan N4"
          description="Range, gate, dan bukti. Ini estimasi dari latihan dan mock — bukan skor resmi JLPT."
        />

        {!readiness || readiness.status === 'insufficient' ? (
          <div className="stack">
            <EmptyState
              icon={<BarChart3 size={22} aria-hidden />}
              title="Belum cukup data"
              body="Kami belum punya cukup bukti untuk menampilkan angka. Selesaikan sesi pertama, lalu ambil 1 full mock setelah coverage 60%."
              action={
                <div className="stack-sm" style={{ width: '100%', maxWidth: 320 }}>
                  <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/today')}>
                    Mulai sesi
                  </button>
                  <button type="button" className="btn btn--secondary btn--block" onClick={() => navigate('/practice')}>
                    Lihat mock
                  </button>
                </div>
              }
            />
            <div className="card stack-sm">
              <span className="card__title">Yang sudah tercatat</span>
              <div className="stat-grid">
                <Stat value={data.attempts.length} label="jawaban" />
                <Stat value={data.mocks.length} label="mock" />
                <Stat value={`${Math.round((readiness?.coverage ?? 0) * 100)}%`} label="coverage" />
              </div>
            </div>
          </div>
        ) : (
          <div className="stack">
            <section className="readiness-hero">
              <div className="row-between">
                <Chip
                  tone={readiness.status === 'safe' ? 'success' : readiness.status === 'at_risk' ? 'warning' : 'info'}
                >
                  {STATUS_COPY[readiness.status].label}
                </Chip>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setWhyOpen(true)}>
                  <CircleHelp size={14} aria-hidden /> Apa yang menaikkan peluang?
                </button>
              </div>

              <div>
                <div className="readiness-score">
                  <span className="readiness-score__value">{readiness.total.estimate}</span>
                  <span className="readiness-score__range">
                    / {EXAM.totalMax} · rentang {readiness.total.low}–{readiness.total.high}
                  </span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <RangeBar
                    low={readiness.total.low}
                    high={readiness.total.high}
                    estimate={readiness.total.estimate}
                    max={EXAM.totalMax}
                    gate={EXAM.passTotal}
                    label={`Estimasi ${readiness.total.estimate} dari 180, rentang ${readiness.total.low}–${readiness.total.high}.`}
                    tone={readiness.status === 'at_risk' ? 'warning' : readiness.status === 'safe' ? 'success' : undefined}
                  />
                </div>
              </div>

              {readiness.probability ? (
                <div className="stack-sm">
                  <span className="card__title">Peluang lulus (estimasi)</span>
                  <div className="prob">
                    <span className="prob__value">
                      {Math.round(readiness.probability.low * 100)}–{Math.round(readiness.probability.high * 100)}%
                    </span>
                    <span className="caption">
                      keyakinan{' '}
                      {readiness.probability.confidence === 'low'
                        ? 'rendah'
                        : readiness.probability.confidence === 'medium'
                          ? 'sedang'
                          : 'cukup'}
                    </span>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${readiness.probability.value * 100}%` }} />
                  </div>
                  <p className="history-note">
                    Interval dari simulasi. Bukan janji; gate tetap bisa menggagalkan total yang tinggi.
                  </p>
                </div>
              ) : (
                <div className="banner banner--info">
                  <Info size={18} aria-hidden />
                  <div>
                    <strong className="banner__title">Peluang lulus belum ditampilkan</strong>
                    {readiness.reasonNoProbability}
                  </div>
                </div>
              )}

              <div className="readiness-evidence">
                <Clock size={14} aria-hidden /> Diperbarui {formatDate(today)} · {readiness.mocks} mock ·{' '}
                {readiness.attempts} jawaban · coverage {Math.round(readiness.coverage * 100)}%
              </div>
            </section>

            <section className="card stack-sm" aria-labelledby="gate-heading">
              <div className="section-title">
                <h2 id="gate-heading">Gate</h2>
                <span className="caption">Ambang minimum, bukan saran</span>
              </div>
              <GateRow
                label="Knowledge + Reading"
                estimate={readiness.kr.estimate}
                max={EXAM.krMax}
                gate={EXAM.krGate}
                passing={readiness.gates.kr}
              />
              <GateRow
                label="Listening"
                estimate={readiness.listening.estimate}
                max={EXAM.listeningMax}
                gate={EXAM.listeningGate}
                passing={readiness.gates.listening}
              />
              <GateRow
                label="Total"
                estimate={readiness.total.estimate}
                max={EXAM.totalMax}
                gate={EXAM.passTotal}
                passing={readiness.gates.total}
              />
              {!readiness.gates.listening ? (
                <Banner tone="warning" title="Listening di bawah gate">
                  Tidak ada status “Aman” selama listening di bawah 19. Fokus minggu ini: menyimak, bukan menambah
                  kosakata.
                </Banner>
              ) : null}
            </section>

            <section className="card stack" aria-labelledby="factors-heading">
              <div className="section-title">
                <h2 id="factors-heading">Tiga faktor terbesar</h2>
                <span className="caption">Rule-based, bukan kotak hitam</span>
              </div>
              {readiness.factors.map((factor) => (
                <div className="factor-row" key={factor.id}>
                  <div className="factor-row__head">
                    <span>{factor.label}</span>
                    <span className="tabular">{Math.round(factor.contribution * 100)}%</span>
                  </div>
                  <Progress value={factor.contribution * 100} tone="warning" />
                  <p className="factor-row__detail">{factor.detail}</p>
                  <p className="factor-row__action">{factor.action}</p>
                </div>
              ))}
              <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/today')}>
                {readiness.nextAction.title} <ArrowRight size={16} aria-hidden />
              </button>
              <p className="caption">{readiness.nextAction.detail}</p>
            </section>

            <section className="card stack" aria-labelledby="coverage-heading">
              <div className="section-title">
                <h2 id="coverage-heading">Coverage per domain</h2>
                <span className="caption">Berapa banyak yang sudah kamu sentuh</span>
              </div>
              <div className="domain-list">
                {(Object.keys(DOMAIN_LABEL) as (keyof typeof DOMAIN_LABEL)[]).map((domain) => {
                  const stats = domainStats(data, domain);
                  return (
                    <div key={domain} className="stack-xs">
                      <CoverageRow label={DOMAIN_LABEL[domain]} value={pools[domain].seen} total={pools[domain].total} />
                      <span className="caption">
                        akurasi {stats.accuracy === null ? '—' : `${Math.round(stats.accuracy * 100)}%`} · {stats.attempts}{' '}
                        jawaban
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="history-note">
                Coverage bukan mastery. Menyentuh item sekali tidak sama dengan menguasainya; mastery dihitung dari
                akurasi, kecepatan, dan retensi.
              </p>
            </section>

            <section className="card stack-sm" aria-labelledby="history-heading">
              <div className="section-title">
                <h2 id="history-heading">Tren estimasi</h2>
                <span className="caption">Bukan skor resmi</span>
              </div>
              <Sparkline points={readiness.history} />
              <div className="stack-sm">
                <span className="card__title">Riwayat mock</span>
                {mocks.length === 0 ? (
                  <p className="caption">Belum ada mock. Satu mock memberi anchor yang jauh lebih stabil.</p>
                ) : (
                  mocks.map((mock) => (
                    <div className="mock-row" key={mock.submittedAt}>
                      <span>{formatDate(mock.submittedAt.slice(0, 10))}</span>
                      <span className="caption">
                        K+R {mock.kr.estimate} · L {mock.listening.estimate}
                      </span>
                      <strong className="tabular">
                        {mock.total.estimate} <span className="tertiary">({mock.total.low}–{mock.total.high})</span>
                      </strong>
                    </div>
                  ))
                )}
              </div>
              {plan?.nextMock ? (
                <div className="banner banner--info">
                  <Headphones size={18} aria-hidden />
                  <div>
                    Mock berikutnya: <strong>{plan.nextMock.label}</strong> pada{' '}
                    {formatDateLong(plan.nextMock.date)} ({relativeDay(plan.nextMock.date, today)}).
                  </div>
                </div>
              ) : null}
            </section>

            <Banner tone="neutral" title="Cara membaca halaman ini">
              Semua angka adalah estimasi dengan rentang. “Aman” hanya muncul setelah 2 mock, semua gate aman, dan batas
              bawah total ≥95. Jika satu seksi di bawah gate, status maksimal “Di jalur”.
            </Banner>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <button type="button" className="btn btn--secondary btn--block" onClick={() => navigate('/errors')}>
            <AlertTriangle size={16} aria-hidden /> Buka buku kesalahan
          </button>
        </div>
      </main>
      <BottomNav />

      <Sheet
        open={whyOpen}
        onClose={() => setWhyOpen(false)}
        title="Apa yang paling menaikkan peluang?"
        description="Tiga hal, bukan daftar 40."
      >
        <div className="stack">
          {readiness?.factors.map((factor) => (
            <div className="focus-item" key={factor.id}>
              <span className="focus-item__rank">{Math.round(factor.contribution * 100)}%</span>
              <div className="grow">
                <p className="focus-item__title">{factor.label}</p>
                <p className="focus-item__detail">{factor.detail}</p>
                <p className="factor-row__action">{factor.action}</p>
              </div>
            </div>
          ))}
          <div className="banner banner--info">
            <CheckCircle2 size={18} aria-hidden />
            <div>
              Prioritaskan gate yang paling dekat dengan ambang. Menaikkan seksi yang sudah jauh di atas gate memberi
              dampak lebih kecil.
            </div>
          </div>
          {readiness?.probability ? (
            <p className="caption">
              Peluang {Math.round(readiness.probability.low * 100)}–{Math.round(readiness.probability.high * 100)}% ·
              keyakinan {readiness.probability.confidence}. Angka ini bergerak setiap ada bukti baru.
            </p>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}

export function useProgressActions() {
  return useActions();
}
