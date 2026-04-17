export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function fmtSec(v, digits = 1) {
  const n = Number(v) || 0;
  if (n >= 60) {
    const m = Math.floor(n / 60);
    const s = (n - m * 60).toFixed(digits);
    return `${m}m ${s}s`;
  }
  return `${n.toFixed(digits)}s`;
}

export function fmtPct(v, digits = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0%';
  return `${n.toFixed(digits)}%`;
}

export function classNames(...xs) {
  return xs.filter(Boolean).join(' ');
}

export function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function clone(v) {
  return JSON.parse(JSON.stringify(v));
}
