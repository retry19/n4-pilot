/**
 * Readiness: per-domain mastery → scoring sections → pass probability.
 *
 * Design rules enforced here (DESIGN §9.6):
 *  - never a single number without a range;
 *  - no probability without ≥1 full mock and ≥60% coverage;
 *  - "Aman" (safe) requires 2 mocks, all gates, and a lower bound ≥95;
 *  - a failed gate caps the status at "Di jalur";
 *  - everything explains itself with three ranked factors.
 *
 * The model is an explicit heuristic (v0), not an IRT calibration. It is
 * versioned by `MODEL_VERSION` so snapshots stay interpretable.
 */
import type {
  Attempt,
  Domain,
  DomainReadiness,
  EvidenceLevel,
  FsrsState,
  MockReport,
  Readiness,
  ReadinessFactor,
  ReadinessPoint,
  ReadinessStatus,
  TargetScore,
} from './types.ts';
import { DOMAIN_LABEL, EXAM } from './types.ts';
import { retrievabilityOn } from './fsrs.ts';
import { clamp, count, mean, round, seededRandom } from './util.ts';

export const MODEL_VERSION = 'readiness-v0.1';
const ALPHA = 2;
const BETA = 2;
const RHO = 0.5;
const Z80 = 1.2816;

const KR_WEIGHTS: Partial<Record<Domain, number>> = {
  vocab: 0.3,
  kanji: 0.18,
  grammar: 0.22,
  reading: 0.2,
  kana: 0.1,
};

const DOMAIN_TARGET_SECONDS: Record<Domain, number> = {
  kana: 3,
  vocab: 8,
  kanji: 10,
  grammar: 20,
  reading: 60,
  listening: 20,
};

export interface DomainPool {
  total: number;
  seen: number;
}

export interface ReadinessInput {
  today: string;
  examDate: string;
  targetScore: TargetScore;
  attempts: Attempt[];
  cards: Record<string, FsrsState>;
  coverage: Record<Domain, DomainPool>;
  mocks: MockReport[];
  history: ReadinessPoint[];
}

function gaussian(random: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function masteryFor(domainAttempts: Attempt[]): { mastery: number; attempts: number; correct: number } {
  const attempts = domainAttempts.length;
  const correct = domainAttempts.filter((a) => a.correct).length;
  const base = (correct + ALPHA) / (attempts + ALPHA + BETA);
  // Speed correction: being right but slow is weaker evidence of automaticity.
  const targetMs = DOMAIN_TARGET_SECONDS[domainAttempts[0]?.domain ?? 'vocab'] * 1000;
  const avgMs = attempts > 0 ? mean(domainAttempts.map((a) => a.ms)) : 0;
  const speedFactor = attempts >= 5 && avgMs > 0 ? clamp(targetMs / avgMs, 0.85, 1) : 1;
  return { mastery: clamp(base * speedFactor, 0, 1), attempts, correct };
}

function retentionFor(cards: FsrsState[], examDate: Date): number {
  if (cards.length === 0) return 0.55;
  return mean(cards.map((card) => retrievabilityOn(card, examDate)));
}

export function computeReadiness(input: ReadinessInput): Readiness {
  const { today, examDate, attempts, cards, coverage, mocks, history } = input;
  const exam = new Date(`${examDate}T09:00:00`);
  const byDomain = new Map<Domain, Attempt[]>();
  const practiceAttempts = attempts.filter((a) => a.source !== 'mock');
  for (const attempt of practiceAttempts) {
    const list = byDomain.get(attempt.domain) ?? [];
    list.push(attempt);
    byDomain.set(attempt.domain, list);
  }

  const domains = (Object.keys(DOMAIN_LABEL) as Domain[]).map<DomainReadiness>((domain) => {
    const list = byDomain.get(domain) ?? [];
    const { mastery, attempts: n, correct } = masteryFor(list);
    const domainCards = Object.entries(cards)
      .filter(([key, state]) => state.lastReview !== null && key.startsWith(`${domain}:`))
      .map(([, state]) => state);
    const pool = coverage[domain] ?? { total: 1, seen: 0 };
    const domainCoverage = pool.total > 0 ? clamp(pool.seen / pool.total, 0, 1) : 0;
    return {
      domain,
      mastery: round(mastery * 100, 1),
      attempts: n,
      correct,
      coverage: round(domainCoverage, 3),
      retention: round(retentionFor(domainCards, exam), 3),
      weight: KR_WEIGHTS[domain] ?? 0.15,
    };
  });

  const domainScore = (domain: Domain): number => {
    const entry = domains.find((d) => d.domain === domain);
    if (!entry) return 0;
    return entry.mastery * (0.65 + 0.35 * entry.retention) * (0.55 + 0.45 * entry.coverage);
  };

  const krWeights = Object.entries(KR_WEIGHTS).filter(([domain]) => domain !== 'kana') as [Domain, number][];
  const krWeightTotal = krWeights.reduce((sum, [, weight]) => sum + weight, 0);
  const krModel = krWeights.reduce((sum, [domain, weight]) => sum + domainScore(domain) * weight, 0) / krWeightTotal;
  const listeningScore = domainScore('listening');

  const recentMocks = [...mocks].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)).slice(-4);
  const mockAnchor = recentMocks.length
    ? {
        kr: mean(recentMocks.map((m) => m.kr.estimate)),
        listening: mean(recentMocks.map((m) => m.listening.estimate)),
        krSem: mean(recentMocks.map((m) => (m.kr.high - m.kr.low) / (2 * Z80))),
        listeningSem: mean(recentMocks.map((m) => (m.listening.high - m.listening.low) / (2 * Z80))),
      }
    : null;

  const mockWeight = mockAnchor ? Math.min(0.75, 0.4 + recentMocks.length * 0.12) : 0;

  const krModelScaled = EXAM.krMax * Math.pow(clamp(krModel, 0, 100) / 100, 0.92);
  const lsModelScaled = EXAM.listeningMax * Math.pow(clamp(listeningScore, 0, 100) / 100, 0.92);

  const krEstimate = mockAnchor ? mockAnchor.kr * mockWeight + krModelScaled * (1 - mockWeight) : krModelScaled;
  const lsEstimate = mockAnchor ? mockAnchor.listening * mockWeight + lsModelScaled * (1 - mockWeight) : lsModelScaled;

  const totalPractice = practiceAttempts.length;
  const coverageOverall = mean((Object.keys(DOMAIN_LABEL) as Domain[]).map((domain) => domains.find((d) => d.domain === domain)?.coverage ?? 0));
  const coverageWiden = 1 + (1 - clamp(coverageOverall, 0, 1)) * 0.8;

  const krSemBase = 18 / Math.sqrt(1 + totalPractice / 12);
  const lsSemBase = 13 / Math.sqrt(1 + (byDomain.get('listening')?.length ?? 0) / 6);
  const krSem = mockAnchor ? krSemBase * 0.45 + mockAnchor.krSem * 0.55 : krSemBase * coverageWiden;
  const lsSem = mockAnchor ? lsSemBase * 0.45 + mockAnchor.listeningSem * 0.55 : lsSemBase * coverageWiden;

  const kr = {
    estimate: round(clamp(krEstimate, 0, EXAM.krMax), 0),
    low: round(clamp(krEstimate - Z80 * krSem, 0, EXAM.krMax), 0),
    high: round(clamp(krEstimate + Z80 * krSem, 0, EXAM.krMax), 0),
  };
  const listening = {
    estimate: round(clamp(lsEstimate, 0, EXAM.listeningMax), 0),
    low: round(clamp(lsEstimate - Z80 * lsSem, 0, EXAM.listeningMax), 0),
    high: round(clamp(lsEstimate + Z80 * lsSem, 0, EXAM.listeningMax), 0),
  };
  const totalSem = Math.sqrt(krSem ** 2 + lsSem ** 2 + 2 * RHO * krSem * lsSem);
  const totalEstimate = kr.estimate + listening.estimate;
  const total = {
    estimate: round(clamp(totalEstimate, 0, EXAM.totalMax), 0),
    low: round(clamp(totalEstimate - Z80 * totalSem, 0, EXAM.totalMax), 0),
    high: round(clamp(totalEstimate + Z80 * totalSem, 0, EXAM.totalMax), 0),
  };

  const gates = {
    kr: kr.estimate >= EXAM.krGate,
    listening: listening.estimate >= EXAM.listeningGate,
    total: total.estimate >= EXAM.passTotal,
  };

  const mockCount = mocks.length;
  const evidence = evidenceLevel(totalPractice, mockCount, coverageOverall);
  const canShowProbability = mockCount >= 1 && coverageOverall >= 0.6 && totalPractice >= 60;
  const reasonNoProbability = canShowProbability
    ? null
    : mockCount < 1
      ? 'Butuh minimal 1 full mock untuk menampilkan peluang lulus.'
      : coverageOverall < 0.6
        ? `Coverage baru ${Math.round(coverageOverall * 100)}%. Butuh 60% sebelum kami menampilkan peluang.`
        : 'Bukti latihan masih sedikit untuk peluang yang bisa dipercaya.';

  const probability = canShowProbability
    ? (() => {
        const simulated = simulatePassProbability(
          krEstimate,
          lsEstimate,
          krSem,
          lsSem,
          `${today}:${totalPractice}:${mockCount}:${Math.round(krEstimate)}:${Math.round(lsEstimate)}`,
        );
        const confidence = evidence === 'strong' ? 'high' : evidence === 'stable' ? 'medium' : 'low';
        return { ...simulated, confidence } as Readiness['probability'];
      })()
    : null;

  const status: ReadinessStatus =
    evidence === 'insufficient'
      ? 'insufficient'
      : !gates.kr || !gates.listening || !gates.total
        ? 'at_risk'
        : mockCount >= 2 && total.low >= 95 && evidence !== 'initial'
          ? 'safe'
          : 'on_track';

  const factors = buildFactors(domains, gates, kr, listening, input.targetScore);
  const nextAction = nextActionFor(status, factors, canShowProbability, mockCount);

  const point: ReadinessPoint = {
    date: today,
    total: total.estimate,
    kr: kr.estimate,
    listening: listening.estimate,
  };
  const dedupedHistory = history.filter((entry) => entry.date !== today);

  return {
    computedAt: new Date().toISOString(),
    evidence,
    status,
    attempts: attempts.length,
    mocks: mockCount,
    coverage: round(coverageOverall, 3),
    kr,
    listening,
    total,
    probability,
    gates,
    domains,
    factors,
    canShowProbability,
    reasonNoProbability,
    nextAction,
    history: [...dedupedHistory, point].slice(-30),
    lastMockAt: recentMocks.at(-1)?.submittedAt ?? null,
  };
}

function evidenceLevel(attempts: number, mocks: number, coverage: number): EvidenceLevel {
  if (attempts < 100 && mocks === 0) return 'insufficient';
  if (mocks === 0 || coverage < 0.6) return 'initial';
  if (mocks >= 2 && coverage > 0.85) return 'strong';
  if (mocks >= 2) return 'stable';
  return 'estimate';
}

function simulatePassProbability(
  krMean: number,
  lsMean: number,
  krSem: number,
  lsSem: number,
  seed: string,
): { value: number; low: number; high: number } {
  const simulate = (random: () => number, iterations: number, muKr: number, muLs: number): number => {
    let passed = 0;
    for (let i = 0; i < iterations; i += 1) {
      const shared = gaussian(random);
      const krScore = muKr + RHO * shared * krSem + Math.sqrt(1 - RHO ** 2) * gaussian(random) * krSem;
      const lsScore = muLs + RHO * shared * lsSem + Math.sqrt(1 - RHO ** 2) * gaussian(random) * lsSem;
      const krClamped = clamp(krScore, 0, EXAM.krMax);
      const lsClamped = clamp(lsScore, 0, EXAM.listeningMax);
      if (krClamped >= EXAM.krGate && lsClamped >= EXAM.listeningGate && krClamped + lsClamped >= EXAM.passTotal) {
        passed += 1;
      }
    }
    return passed / iterations;
  };

  const random = seededRandom(seed);
  const value = simulate(random, 6000, krMean, lsMean);

  // 80% interval from parameter uncertainty (bootstrap over the means).
  const rates: number[] = [];
  const bootstrap = seededRandom(`${seed}:bootstrap`);
  for (let i = 0; i < 48; i += 1) {
    const krPerturbed = krMean + gaussian(bootstrap) * krSem * 0.45;
    const lsPerturbed = lsMean + gaussian(bootstrap) * lsSem * 0.45;
    rates.push(simulate(bootstrap, 220, krPerturbed, lsPerturbed));
  }
  rates.sort((a, b) => a - b);
  const low = rates[Math.floor(rates.length * 0.1)] ?? value;
  const high = rates[Math.floor(rates.length * 0.9)] ?? value;

  // A model that has never been calibrated must not claim certainty. Keep the
  // interval honest by capping the point at 98% and the upper bound at 99%.
  const cappedValue = clamp(value, 0.01, 0.98);
  return {
    value: round(cappedValue, 3),
    low: round(clamp(Math.min(low, cappedValue), 0.01, cappedValue), 3),
    high: round(clamp(Math.max(high, cappedValue), cappedValue, 0.99), 3),
  };
}

function buildFactors(
  domains: DomainReadiness[],
  gates: Readiness['gates'],
  kr: Readiness['kr'],
  listening: Readiness['listening'],
  targetScore: TargetScore,
): ReadinessFactor[] {
  const factors: ReadinessFactor[] = [];
  const listeningDomain = domains.find((d) => d.domain === 'listening');
  if (listeningDomain) {
    const gap = 1 - listeningDomain.mastery / 100;
    factors.push({
      id: 'listening',
      domain: 'listening',
      label: 'Menyimak',
      detail: `${count(listeningDomain.attempts, 'soal')} · akurasi ${Math.round(listeningDomain.mastery)}%`,
      contribution: clamp(gap * 0.95 + (gates.listening ? 0 : 0.25), 0, 1),
      action: 'Latih menyimak 10 menit',
    });
  }
  for (const domain of ['grammar', 'vocab', 'reading', 'kanji', 'kana'] as Domain[]) {
    const entry = domains.find((d) => d.domain === domain);
    if (!entry) continue;
    const gap = 1 - entry.mastery / 100;
    factors.push({
      id: domain,
      domain,
      label: DOMAIN_LABEL[domain],
      detail: `${count(entry.attempts, 'jawaban')} · ${Math.round(entry.mastery)}%`,
      contribution: clamp(gap * (entry.weight + 0.15), 0, 1),
      action:
        domain === 'kana'
          ? 'Selesaikan gate kana'
          : domain === 'reading'
            ? 'Baca 1 teks pendek timed'
            : domain === 'grammar'
              ? 'Ulangi 1 pola + 3 soal'
              : 'Review 10 item',
    });
  }
  if (kr.estimate < targetScore) {
    factors.push({
      id: 'target',
      domain: 'reading',
      label: 'Target skor',
      detail: `Estimasi ${kr.estimate + listening.estimate} dari target ${targetScore}.`,
      contribution: clamp(((targetScore - (kr.estimate + listening.estimate)) / 180) * 0.8, 0, 0.7),
      action: 'Naikkan coverage, bukan kecepatan',
    });
  }
  return factors.sort((a, b) => b.contribution - a.contribution).slice(0, 3);
}

function nextActionFor(
  status: ReadinessStatus,
  factors: ReadinessFactor[],
  canShowProbability: boolean,
  mockCount: number,
): Readiness['nextAction'] {
  const top = factors[0];
  if (status === 'insufficient') {
    return {
      title: 'Selesaikan sesi pertama',
      detail: 'Baru setelah ada bukti kami bisa menghitung kesiapan. Tidak ada angka karangan.',
      route: '/today',
    };
  }
  if (!canShowProbability) {
    return {
      title: mockCount === 0 ? 'Ambil 1 full mock' : 'Tambah coverage',
      detail:
        mockCount === 0
          ? 'Satu mock memberi anchor yang jauh lebih stabil daripada latihan harian saja.'
          : 'Coverage masih rendah. Lanjutkan sesi harian; mock berikutnya akan lebih akurat.',
      route: mockCount === 0 ? '/practice' : '/today',
    };
  }
  return {
    title: top ? top.action : 'Pertahankan ritme',
    detail: top
      ? `${top.label}: ${top.detail}. Ini faktor terbesar yang bisa kamu geser minggu ini.`
      : 'Tidak ada gap besar. Jaga retensi dan tidur.',
    route: top?.domain === 'listening' ? '/practice' : '/session',
  };
}

/** Convenience for screens that only need the status copy. */
export const STATUS_COPY: Record<ReadinessStatus, { label: string; tone: 'neutral' | 'warning' | 'success' | 'info'; line: string }> = {
  insufficient: {
    label: 'Belum cukup data',
    tone: 'neutral',
    line: 'Kami belum punya cukup bukti. Selesaikan 1 mock untuk estimasi yang lebih stabil.',
  },
  at_risk: {
    label: 'Berisiko',
    tone: 'warning',
    line: 'Ada gate yang belum aman. Fokus minggu ini bukan menambah materi, tetapi menutup gate itu.',
  },
  on_track: {
    label: 'Di jalur',
    tone: 'info',
    line: 'Kamu di jalur, tetapi belum aman. Pertahankan konsistensi.',
  },
  safe: {
    label: 'Aman',
    tone: 'success',
    line: 'Bukti cukup kuat. Jangan tambah materi baru; jaga retensi.',
  },
};
