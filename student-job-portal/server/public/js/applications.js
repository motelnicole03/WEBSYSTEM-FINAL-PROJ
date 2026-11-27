import { api, errorMessage } from './api.js';
import { openChat } from './chat.js';
import { mountSite } from './layout.js';
import { requireRole } from './auth.js';
import { $, fmtDate, fmtDateTime, html, internPill, notice, onClick, render, statusPill } from './ui.js';

await requireRole(['student']);
await mountSite({});

const ACTIVE = ['submitted', 'under_review', 'shortlisted', 'interview', 'offered'];
let rows = [];
let interviews = [];
let filter = 'all';

async function load() {
  try {
    [rows, interviews] = await Promise.all([api.get('/applications/mine'), api.get('/interviews?upcoming=true')]);
    paint();
  } catch (e) {
    notice($('#message'), errorMessage(e));
  }
}

function paint() {
  render($('#interviews'), interviews.length ? html`<section class="mt-lg"><h2 class="bold">Upcoming interviews</h2><div class="mt-sm">
    ${interviews.map((i) => html`<div class="item row-wrap between" style="background:#fffbeb;border-color:#fde68a">
      <div class="small"><p style="font-weight:500">${i.opportunityTitle} <span class="muted">at ${i.companyName}</span></p>
        <p class="xs">${fmtDateTime(i.schedule)} &middot; ${i.mode}${i.linkOrVenue ? html` &middot; ${i.linkOrVenue}` : ''}</p></div>
      ${i.studentResponse === 'pending'
        ? html`<div class="row"><button class="btn primary sm" data-respond="${i.interviewId}" data-value="confirmed">Confirm</button><button class="btn ghost sm" data-respond="${i.interviewId}" data-value="declined">Decline</button></div>`
        : html`<span class="xs bold" style="text-transform:capitalize">${i.studentResponse}</span>`}
    </div>`)}</div></section>` : '');

  const visible = rows.filter((r) => filter === 'all' || ACTIVE.includes(r.currentStatus));
  render($('#list'), visible.length ? html`${visible.map((a) => html`<article class="item">
    <div class="row-wrap between" style="align-items:flex-start">
      <div><a href="/jobs.html?id=${a.opportunityId}" style="font-weight:500">${a.title}</a>
        <p class="muted xs">${a.companyName} &middot; Applied ${fmtDate(a.submittedAt)}</p></div>
      <span class="row">${a.internshipStatus ? internPill(a.internshipStatus) : ''}${statusPill(a.currentStatus)}</span>
    </div>
    ${a.currentStatus === 'offered' ? html`<p class="notice ok xs">You have an offer. Accept it to be marked as hired, or decline it.</p>` : ''}
    <div class="row-wrap mt">
      <button class="btn ghost sm" data-chat="${a.applicationId}" style="color:var(--brand)">Message</button>
      ${a.certificateId ? html`<a class="btn primary sm" href="/certificate.html?id=${a.applicationId}">View certificate</a>` : ''}
      ${a.currentStatus === 'offered' ? html`<button class="btn primary sm" data-act="accept" data-id="${a.applicationId}">Accept offer</button><button class="btn ghost sm" data-act="decline" data-id="${a.applicationId}">Decline</button>` : ''}
      ${ACTIVE.includes(a.currentStatus) && a.currentStatus !== 'offered' ? html`<button class="btn ghost sm muted" data-act="withdraw" data-id="${a.applicationId}">Withdraw</button>` : ''}
    </div></article>`)}`
    : html`<p class="muted small">Nothing here yet. <a class="link" href="/jobs.html">Find an internship</a> to apply.</p>`);

  document.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('active', b.dataset.filter === filter));
}

async function act(fn) {
  notice($('#message'), '');
  try { await fn(); await load(); } catch (e) { notice($('#message'), errorMessage(e)); }
}

onClick(document, '[data-filter]', (b) => { filter = b.dataset.filter; paint(); });
onClick(document, '[data-respond]', (b) => act(() => api.post(`/interviews/${b.dataset.respond}/respond`, { response: b.dataset.value })));
onClick($('#list'), '[data-chat]', (b) => {
  const a = rows.find((r) => r.applicationId === Number(b.dataset.chat));
  openChat({ applicationId: a.applicationId, name: a.companyName, subtitle: a.title });
});
onClick($('#list'), '[data-act]', (b) => {
  const a = rows.find((r) => r.applicationId === Number(b.dataset.id));
  const action = b.dataset.act;
  if (action === 'withdraw' && !confirm(`Withdraw your application to "${a.title}"?`)) return;
  if (action === 'decline' && !confirm('Decline this offer?')) return;
  act(() => api.post(`/applications/${a.applicationId}/${action}`));
});

load();