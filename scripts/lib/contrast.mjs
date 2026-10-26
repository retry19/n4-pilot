/**
 * Static WCAG contrast audit for the semantic token pairs in tokens.css.
 * Catches regressions that a jsdom render cannot see (colors are CSS).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function blockFor(css, selector) {
  const index = css.indexOf(selector);
  if (index < 0) return '';
  const start = css.indexOf('{', index);
  const end = css.indexOf('}', start);
  if (start < 0 || end < 0) return '';
  return css.slice(start + 1, end);
}

function parseVars(block) {
  const vars = {};
  for (const match of block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

function resolve(name, vars, root, depth = 0) {
  if (depth > 6) return null;
  const key = name.startsWith('--') ? name.slice(2) : name;
  let value = vars[key] ?? root[key];
  if (!value) return null;
  const ref = value.match(/^var\((--[\w-]+)\)$/);
  if (ref) return resolve(ref[1], vars, root, depth + 1);
  return value;
}

function parseColor(value) {
  if (!value) return null;
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1].length === 3 ? hex[1].split('').map((char) => char + char).join('') : hex[1];
    return {
      r: parseInt(raw.slice(0, 2), 16) / 255,
      g: parseInt(raw.slice(2, 4), 16) / 255,
      b: parseInt(raw.slice(4, 6), 16) / 255,
    };
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((part) => Number(part.trim()) / 255);
    return { r, g, b };
  }
  return null;
}

function channel(value) {
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(color) {
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

const PAIRS = [
  ['text di bg', 'text', 'bg'],
  ['text di surface', 'text', 'surface'],
  ['text di surface-2', 'text', 'surface-2'],
  ['text-secondary di bg', 'text-secondary', 'bg'],
  ['text-secondary di surface', 'text-secondary', 'surface'],
  ['text-secondary di surface-2', 'text-secondary', 'surface-2'],
  ['primary di bg', 'primary', 'bg'],
  ['primary di surface', 'primary', 'surface'],
  ['primary di primary-soft', 'primary', 'primary-soft'],
  ['success di success-soft', 'success', 'success-soft'],
  ['warning di warning-soft', 'warning', 'warning-soft'],
  ['danger di danger-soft', 'danger', 'danger-soft'],
  ['info di info-soft', 'info', 'info-soft'],
  ['text di danger-soft', 'text', 'danger-soft'],
  ['text di warning-soft', 'text', 'warning-soft'],
  ['text di success-soft', 'text', 'success-soft'],
];

export function auditTokenContrast() {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'styles', 'tokens.css'), 'utf8');
  const root = parseVars(blockFor(css, ':root'));
  const dark = parseVars(blockFor(css, "[data-theme='dark']"));
  const themes = [
    { id: 'light', vars: root, buttonFg: '#ffffff' },
    { id: 'dark', vars: { ...root, ...dark }, buttonFg: '#0b0f14' },
  ];

  const results = [];
  for (const theme of themes) {
    const check = (label, fgValue, bgValue) => {
      const fg = parseColor(fgValue);
      const bg = parseColor(bgValue);
      if (!fg || !bg) {
        results.push({ theme: theme.id, label, ratio: null, pass: false, note: 'warna tidak dapat dibaca' });
        return;
      }
      const ratio = contrast(fg, bg);
      results.push({ theme: theme.id, label, ratio: Number(ratio.toFixed(2)), pass: ratio >= 4.5 });
    };

    for (const [label, fgName, bgName] of PAIRS) {
      check(label, resolve(fgName, theme.vars, root), resolve(bgName, theme.vars, root));
    }
    check('teks tombol di primary', theme.buttonFg, resolve('primary', theme.vars, root));
  }

  return {
    results,
    failures: results.filter((result) => !result.pass),
  };
}
