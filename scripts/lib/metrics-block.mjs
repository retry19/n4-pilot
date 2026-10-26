/**
 * Renders the metrics block that README.md and PROGRESS.md share.
 * Both files must contain `<!-- metrics:start --> … <!-- metrics:end -->`.
 */
export const DOC_FILES = ['README.md', 'PROGRESS.md'];

const number = new Intl.NumberFormat('id-ID');

export function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
}

export function renderMetricsBlock(metrics) {
  const counts = metrics.content?.counts ?? {};
  const contentLine = [
    counts.kana !== undefined ? `${number.format(counts.kana)} kana` : null,
    counts.vocab !== undefined ? `${number.format(counts.vocab)} kata` : null,
    counts.kanji !== undefined ? `${number.format(counts.kanji)} kanji` : null,
    counts.grammar !== undefined ? `${number.format(counts.grammar)} grammar` : null,
    counts.reading !== undefined ? `${number.format(counts.reading)} bacaan` : null,
    counts.listening !== undefined ? `${number.format(counts.listening)} listening` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const forms = metrics.content?.mock?.forms ?? [];
  const totals = forms.map((form) => form.total);
  const mockLine = forms.length
    ? `${forms.length} form × ${Math.min(...totals)}${Math.min(...totals) === Math.max(...totals) ? '' : `–${Math.max(...totals)}`} soal`
    : '—';

  const tests = metrics.tests;
  const testLine = tests
    ? `${tests.passed}/${tests.total} lulus${tests.failed ? ` · ${tests.failed} gagal` : ''}`
    : 'belum dijalankan';

  const integrity = metrics.content?.integrity
    ? metrics.content.integrity.ok
      ? 'lolos'
      : 'gagal'
    : 'belum dijalankan';

  const js = metrics.build ? `${formatKb(metrics.build.js.gzip)} gzip · ${metrics.build.budget.ok ? 'PASS' : 'OVER'}` : 'belum dibangun';
  const css = metrics.build ? `${formatKb(metrics.build.css.gzip)} gzip` : 'belum dibangun';
  const smoke = metrics.smoke
    ? `${metrics.smoke.steps} langkah${metrics.smoke.passed ? '' : ' (gagal)'}`
    : 'belum dijalankan';

  const routes = metrics.routes
    ? `${metrics.routes.passed}/${metrics.routes.total} route`
    : 'belum dijalankan';
  const a11y = metrics.a11y
    ? `${metrics.a11y.critical} critical · ${metrics.a11y.warnings} warning · ${metrics.a11y.contrastFailures} kontras gagal`
    : 'belum dijalankan';
  const copy = metrics.copy ? `${metrics.copy.findings} temuan` : 'belum dijalankan';

  return [
    '<!-- metrics:start -->',
    '| Metrik | Nilai |',
    '|---|---:|',
    `| Test | ${testLine} |`,
    `| Konten | ${contentLine || '—'} |`,
    `| Mock | ${mockLine} |`,
    `| JS awal | ${js} |`,
    `| CSS | ${css} |`,
    `| Smoke | ${smoke} |`,
    `| Routes | ${routes} |`,
    `| A11y | ${a11y} |`,
    `| Copy | ${copy} |`,
    `| Integritas konten | ${integrity} |`,
    '<!-- metrics:end -->',
  ].join('\n');
}
