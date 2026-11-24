import { esc } from './ui.js';

/** A grouped bar chart drawn as SVG. series = [{ name, color, values: [...] }]. Returns an HTML string. */
export function barChart(labels, series) {
  const W = 600, H = 240;
  const pad = { left: 40, right: 8, top: 10, bottom: 28 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // Round the top of the scale up to 1, 2, 5 or 10 times a power of ten
  const rawMax = Math.max(1, ...series.flatMap((s) => s.values));
  const magnitude = 10 ** Math.floor(Math.log10(rawMax));
  const niceMax = [1, 2, 5, 10].map((m) => m * magnitude).find((m) => m >= rawMax) ?? rawMax;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f));

  const y = (v) => pad.top + plotH - (v / niceMax) * plotH;
  const groupW = plotW / Math.max(labels.length, 1);
  const barW = Math.min(18, (groupW * 0.7) / series.length);

  const grid = ticks.map((t) => `<line x1="${pad.left}" x2="${W - pad.right}" y1="${y(t)}" y2="${y(t)}" stroke="#ece9f5"/><text x="${pad.left - 8}" y="${y(t) + 3}" text-anchor="end" font-size="10" fill="#6b7280">${t}</text>`).join('');

  const groups = labels.map((label, i) => {
    const gx = pad.left + i * groupW + groupW / 2;
    const bars = series.map((s, j) => {
      const v = s.values[i] ?? 0;
      const x = gx - (series.length * barW) / 2 + j * barW + 1;
      return `<rect x="${x}" y="${y(v)}" width="${barW - 2}" height="${Math.max(0, y(0) - y(v))}" rx="3" fill="${s.color}"><title>${esc(`${s.name}, ${label}: ${v}`)}</title></rect>`;
    }).join('');
    return `${bars}<text x="${gx}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#6b7280">${esc(label)}</text>`;
  }).join('');

  const legend = series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('');
  return `<div class="legend">${legend}</div><svg viewBox="0 0 ${W} ${H}" style="width:100%" role="img" aria-label="Chart">${grid}${groups}</svg>`;
}
