import { api, errorMessage } from './api.js';
import { mountPortal } from './layout.js';
import { pageTitle } from './portal.js';
import { $, $$, cap, fmtDateTime, html, notice, onClick, render } from './ui.js';

await mountPortal('employer', 'interviews');
render($('#head'), pageTitle('Interviews', 'Interviews are scheduled from the Applicants page.'));

const RESPONSE = { pending: 'amber', confirmed: 'green', declined: 'red' };
let items = [], tab = 'upcoming', rescheduling = null;

async function load() {
  try { items = await api.get('/interviews'); paint(); } catch (e) { notice($('#message'), errorMessage(e)); }
}

function paint() {
  $$('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  const now = Date.now();
  const upcoming = (i) => i.result === 'pending' && new Date(i.schedule).getTime() >= now;
  const shown = items.filter((i) => (tab === 'upcoming' ? upcoming(i) : !upcoming(i)))
    .sort((a, b) => (tab === 'upcoming' ? 1 : -1) * (new Date(a.schedule) - new Date(b.schedule)));

  render($('#list'), shown.length ? html`${shown.map((i) => {
    const happened = new Date(i.schedule).getTime() <= now;
    return html`<article class="item">
      <div class="row-wrap between" style="align-items:flex-start">
        <div class="small"><p class="t">${i.firstName} ${i.lastName} <span class="muted">for ${i.opportunityTitle}</span></p>
          <p class="muted xs">${fmtDateTime(i.schedule, 'full')} · ${i.mode}${i.linkOrVenue ? ` · ${i.linkOrVenue}` : ''}</p></div>
        ${i.result === 'pending' ? html`<span class="pill ${RESPONSE[i.studentResponse] ?? ''}">Student: ${i.studentResponse}</span>` : html`<span class="pill gray" style="text-transform:capitalize">${cap(i.result)}</span>`}
      </div>
      ${i.result === 'pending' ? html`<div class="row-wrap mt">${happened
        ? html`<button class="btn primary sm" data-result="passed" data-id="${i.interviewId}">Passed</button><button class="btn ghost sm" data-result="failed" data-id="${i.interviewId}">Did not pass</button><button class="btn ghost sm" data-result="no_show" data-id="${i.interviewId}">No show</button>`
        : html`<button class="btn ghost sm" data-resched="${i.interviewId}">Reschedule</button><button class="btn ghost sm" data-result="cancelled" data-id="${i.interviewId}" style="color:var(--admin-number)">Cancel interview</button>`}</div>` : ''}
      ${rescheduling === i.interviewId ? html`<form class="row-wrap mt-sm" data-resched-form="${i.interviewId}"><input type="datetime-local" name="when" required style="padding:.5rem;border:1px solid var(--line);border-radius:.5rem"><button class="btn primary sm">Save new time</button><button type="button" class="xs muted" data-resched-cancel style="background:none;border:0;cursor:pointer">Cancel</button></form>` : ''}
    </article>`;
  })}` : html`<p class="small muted">No ${tab} interviews.</p>`);
}

async function act(fn) {
  notice($('#message'), '');
  try { await fn(); rescheduling = null; await load(); } catch (e) { notice($('#message'), errorMessage(e)); }
}

onClick(document, '[data-tab]', (b) => { tab = b.dataset.tab; paint(); });
onClick($('#list'), '[data-result]', (b) => {
  if (b.dataset.result === 'cancelled' && !confirm('Cancel this interview? The student will be notified.')) return;
  act(() => api.post(`/interviews/${b.dataset.id}/result`, { result: b.dataset.result }));
});
onClick($('#list'), '[data-resched]', (b) => { rescheduling = Number(b.dataset.resched); paint(); });
onClick($('#list'), '[data-resched-cancel]', () => { rescheduling = null; paint(); });
$('#list').addEventListener('submit', (e) => {
  const form = e.target.closest('[data-resched-form]');
  if (!form) return;
  e.preventDefault();
  const when = new FormData(form).get('when');
  act(() => api.patch(`/interviews/${form.dataset.reschedForm}`, { schedule: new Date(when).toISOString() }));
});

load();
