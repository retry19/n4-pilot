import type { CSSProperties, ReactNode } from 'react';
import { AlertTriangle, Check, CheckCircle2, Minus, XCircle } from 'lucide-react';
import type { ReadinessPoint } from '../core/types.ts';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function Chip({
  tone = 'neutral',
  children,
  icon,
}: {
  tone?: Tone;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <span className={`chip chip--${tone}`}>
      {icon ?? <span className="chip__dot" aria-hidden />}
      {children}
    </span>
  );
}

export function PageHead({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <div className="row-between">
        <h1>{title}</h1>
        {actions}
      </div>
      {description ? <p>{description}</p> : null}
    </header>
  );
}

export function Banner({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const icon =
    tone === 'warning' || tone === 'danger' ? (
      <AlertTriangle size={18} aria-hidden />
    ) : tone === 'success' ? (
      <CheckCircle2 size={18} aria-hidden />
    ) : (
      <span className="chip__dot" aria-hidden style={{ marginTop: 6 }} />
    );
  return (
    <div className={`banner banner--${tone}`} role={tone === 'warning' || tone === 'danger' ? 'alert' : 'status'}>
      {icon}
      <div className="grow">
        {title ? <strong className="banner__title">{title}</strong> : null}
        <div>{children}</div>
        {action ? <div style={{ marginTop: 10 }}>{action}</div> : null}
      </div>
    </div>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      {icon ? <div className="empty__icon">{icon}</div> : null}
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action}
    </div>
  );
}

export function GateRow({
  label,
  estimate,
  max,
  gate,
  passing,
}: {
  label: string;
  estimate: number;
  max: number;
  gate: number;
  passing: boolean;
}) {
  return (
    <div className={`gate-row ${passing ? '' : 'gate-row--fail'}`}>
      <span>
        {label} <span className="tertiary">· min {gate}</span>
      </span>
      <span className="gate-row__value">
        {estimate}/{max}
        {passing ? (
          <CheckCircle2 size={16} aria-label="di atas gate" style={{ color: 'var(--success)' }} />
        ) : (
          <AlertTriangle size={16} aria-label="di bawah gate" style={{ color: 'var(--warning)' }} />
        )}
      </span>
    </div>
  );
}

export function RangeBar({
  low,
  high,
  estimate,
  max,
  gate,
  label,
  tone,
}: {
  low: number;
  high: number;
  estimate: number;
  max: number;
  gate?: number;
  label: string;
  tone?: 'success' | 'warning' | 'danger';
}) {
  const percent = (value: number) => Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  const style = {
    '--low': `${percent(low)}%`,
    '--high': `${percent(high)}%`,
    '--est': `${percent(estimate)}%`,
    '--gate': `${percent(gate ?? 0)}%`,
  } as CSSProperties;
  return (
    <div className={`range ${tone ? `range--${tone}` : ''}`} style={style} role="img" aria-label={label}>
      <div className="range__track" aria-hidden>
        <div className="range__band" />
        {gate !== undefined ? <div className="range__gate" /> : null}
        <div className="range__dot" />
      </div>
      <div className="range__labels" aria-hidden>
        <span>0</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export function Progress({ value, tone }: { value: number; tone?: 'success' | 'warning' }) {
  return (
    <div
      className={`progress ${tone ? `progress--${tone}` : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function CoverageRow({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="coverage-row">
      <span>{label}</span>
      <div className="coverage-row__bar" aria-hidden>
        <span style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <span className="coverage-row__value">
        {value}/{total}
      </span>
    </div>
  );
}

export function Sparkline({ points, max = 180, gate = 90 }: { points: ReadinessPoint[]; max?: number; gate?: number }) {
  if (points.length < 2) {
    return (
      <p className="history-note">
        Grafik akan muncul setelah ada minimal dua titik bukti. Satu angka saja tidak cukup untuk membaca tren.
      </p>
    );
  }
  const width = 300;
  const height = 64;
  const pad = 4;
  const x = (index: number) => pad + (index / (points.length - 1)) * (width - pad * 2);
  const y = (value: number) => height - pad - (Math.max(0, Math.min(max, value)) / max) * (height - pad * 2);
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(point.total).toFixed(1)}`).join(' ');
  const gateY = y(gate);
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return (
    <svg
      className="spark"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Tren estimasi skor dari ${first.total} pada ${first.date} menjadi ${last.total} pada ${last.date}. Garis gate di ${gate}.`}
    >
      <line x1={pad} x2={width - pad} y1={gateY} y2={gateY} stroke="var(--border-strong)" strokeDasharray="4 4" strokeWidth="1" />
      <path className="line" d={path} />
      {points.map((point, index) => (
        <circle key={point.date} cx={x(index)} cy={y(point.total)} r={index === points.length - 1 ? 3.5 : 2} />
      ))}
    </svg>
  );
}

export function StatusIcon({ tone }: { tone: Tone }) {
  if (tone === 'success') return <Check size={14} aria-hidden />;
  if (tone === 'warning' || tone === 'danger') return <AlertTriangle size={14} aria-hidden />;
  if (tone === 'neutral') return <Minus size={14} aria-hidden />;
  return <span className="chip__dot" aria-hidden />;
}

export function FieldError({ children }: { children: ReactNode }) {
  return (
    <p className="field__hint" role="alert" style={{ color: 'var(--danger)' }}>
      <XCircle size={14} aria-hidden style={{ display: 'inline', marginRight: 4 }} /> {children}
    </p>
  );
}
