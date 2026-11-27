import './password-toggle.js'; // the "show password" eye on every password box
// Small helpers shared by every page.
//
// SECURITY: text from the database (names, titles, messages) is untrusted. The html`` helper
// escapes every inserted value automatically. Only values wrapped in raw() or produced by another
// html`` call are inserted as markup. Never build HTML with plain string concatenation.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

class Safe {
  constructor(text) { this.text = text; }
  toString() { return this.text; }
}
export const raw = (text) => new Safe(String(text));

const toText = (v) => {
  if (v instanceof Safe) return v.text;
  if (Array.isArray(v)) return v.map(toText).join('');
  if (v === null || v === undefined || v === false) return '';
  return esc(v);
};

export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += toText(values[i]);
  });
  return new Safe(out);
}

/** Puts html`` markup into an element. */
export function render(element, safe) {
  element.innerHTML = safe instanceof Safe ? safe.text : esc(safe);
}

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Event delegation: runs handler(target, event) when something matching `selector` inside `root` is clicked. */
export function onClick(root, selector, handler) {
  root.addEventListener('click', (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(target, event);
  });
}

export const query = () => new URLSearchParams(location.search);

// ---------- formatting ----------

export function timeAgo(iso) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days} d ago` : new Date(iso).toLocaleDateString();
}
export const fmtDate = (iso) => new Date(iso).toLocaleDateString();
export const fmtDateTime = (iso, dateStyle = 'medium') => new Date(iso).toLocaleString([], { dateStyle, timeStyle: 'short' });
export const initial = (text) => String(text ?? '?').trim().charAt(0).toUpperCase();
export const initials = (text) => String(text ?? '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
export const cap = (text) => String(text ?? '').replace(/_/g, ' ');

/** datetime-local inputs want "YYYY-MM-DDTHH:mm" in the viewer's own timezone. */
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---------- status pills ----------

const APP_STATUS = {
  submitted: ['Submitted', ''], under_review: ['Under review', 'blue'], shortlisted: ['Shortlisted', 'indigo'],
  interview: ['Interview', 'amber'], offered: ['Offered', 'emerald'], hired: ['Hired', 'green'],
  rejected: ['Not selected', 'red'], declined: ['Declined', 'gray'], withdrawn: ['Withdrawn', 'gray'],
};
export function statusPill(status) {
  const [label, cls] = APP_STATUS[status] ?? [status, ''];
  return html`<span class="pill ${cls}">${label}</span>`;
}

const OPP_STATUS = {
  draft: ['Draft', ''], pending_approval: ['Pending approval', 'amber'], open: ['Open', 'green'],
  closed: ['Closed', 'gray'], filled: ['Filled', 'blue'],
};
export function oppStatusPill(status) {
  const [label, cls] = OPP_STATUS[status] ?? [status, ''];
  return html`<span class="pill ${cls}">${label}</span>`;
}

const INTERN_STATUS = {
  ongoing: ['Ongoing', 'blue'], completed: ['Completed', 'green'], removed: ['Removed', 'red'], none: ['No internship', 'gray'],
};
export function internPill(status) {
  const [label, cls] = INTERN_STATUS[status ?? 'none'] ?? [status, ''];
  return html`<span class="pill ${cls}">${label}</span>`;
}

// ---------- icons ----------

const svg = (path, size = 18, fill = 'none') =>
  raw(`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`);
export const icons = {
  search: (s) => svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', s),
  pin: (s) => svg('<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>', s),
  bookmark: (s, filled) => svg('<path d="M6 4h12v17l-6-4-6 4V4Z"/>', s, filled ? 'currentColor' : 'none'),
  bell: (s = 20) => svg('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/>', s),
  message: (s = 20) => svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>', s),
};

// ---------- text with bullets ----------

/**
 * Shows plain text from the database as paragraphs and bullet lists.
 * Lines starting with "-", "*" or a bullet become list items; a short line ending in ":" is a heading.
 */
export function richText(text) {
  const blocks = [];
  for (const rawLine of String(text ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    const last = blocks[blocks.length - 1];
    if (!line) { blocks.push({ type: 'gap', lines: [] }); continue; }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      if (last?.type === 'ul') last.lines.push(bullet[1]);
      else blocks.push({ type: 'ul', lines: [bullet[1]] });
    } else if (line.endsWith(':') && line.length < 60) {
      blocks.push({ type: 'h', lines: [line] });
    } else if (last?.type === 'p') {
      last.lines.push(line);
    } else {
      blocks.push({ type: 'p', lines: [line] });
    }
  }
  const parts = blocks.filter((b) => b.lines.length).map((b) =>
    b.type === 'ul' ? html`<ul>${b.lines.map((l) => html`<li>${l}</li>`)}</ul>`
    : b.type === 'h' ? html`<p class="h">${b.lines[0]}</p>`
    : html`<p>${b.lines.join(' ')}</p>`);
  return html`<div class="rich">${parts}</div>`;
}

// ---------- dropdowns ----------

/** Wires a button to a panel: toggles on click, closes on an outside click or Escape. */
export function attachDropdown(button, panel, onOpen) {
  const close = () => { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); };
  button.addEventListener('click', () => {
    const opening = panel.hidden;
    document.dispatchEvent(new CustomEvent('sc:close-dropdowns'));
    panel.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
    if (opening && onOpen) onOpen();
  });
  document.addEventListener('click', (e) => { if (!panel.hidden && !button.parentElement.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.addEventListener('sc:close-dropdowns', close);
  return close;
}

export function notice(container, message, ok = false) {
  container.innerHTML = message ? `<p class="notice${ok ? ' ok' : ''}">${esc(message)}</p>` : '';
}

/** Search box with a job title and a location field. */
export function searchBar({ q = '', location = '', button = 'Search', flat = false } = {}) {
  return html`<form class="search-bar${flat ? ' flat' : ''}" data-search>
    <label>${icons.search()}<input name="q" value="${q}" placeholder="Job Title, Keywords ..." aria-label="Job title or keywords"></label>
    <label>${icons.pin()}<input name="location" value="${location}" placeholder="Batangas City" aria-label="Location"></label>
    <button class="btn primary" type="submit">${button}</button>
  </form>`;
}