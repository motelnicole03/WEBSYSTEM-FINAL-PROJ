import { api, errorMessage } from './api.js';
import { listItem } from './cards.js';
import { mountSite } from './layout.js';
import { createSaves } from './saves.js';
import { $, cap, html, icons, initial, notice, onClick, oppStatusPill, query, render, richText, searchBar } from './ui.js';

const user = await mountSite({ active: 'jobs' });
const isStudent = user?.role === 'student';

const message = $('#message');
const saves = await createSaves(user, (text) => notice(message, text));
const state = { items: [], pagination: null, selectedId: null };
const appliedIds = new Set();

// Students see opportunities for their program (plus ones open to every program)
let programId = null;
if (isStudent) {
  programId = (await api.get('/students/me').catch(() => null))?.programId ?? null;
  (await api.get('/applications/mine').catch(() => [])).forEach((a) => appliedIds.add(a.opportunityId));
}

// ---------- URL state: q, location, type, page, id ----------

const params = () => query();
function go(changes, { push = true, keepPage = false } = {}) {
  const p = params();
  for (const [k, v] of Object.entries(changes)) (v ? p.set(k, v) : p.delete(k));
  if (!('page' in changes) && !keepPage) p.delete('page'); // a new search starts on page 1
  history[push ? 'pushState' : 'replaceState'](null, '', `?${p}`);
}

// ---------- header and search ----------

function paintHeader() {
  const p = params();
  const first = user?.student?.firstName;
  render($('#side-head'), html`${first ? html`<h1 style="font-size:1.25rem;font-weight:700">Welcome, <span class="brand">${first}</span>!</h1>` : html`<h1 style="font-size:1.25rem;font-weight:700">Find a job</h1>`}
    <div class="row between mt-sm"><h2 style="font-size:.875rem;font-weight:600">${isStudent ? 'Internships for you' : 'Opportunities'}</h2>
      <select id="type" class="input" style="width:auto;padding:.25rem .5rem;font-size:.75rem" aria-label="Type">
        ${[['', 'All types'], ['internship', 'Internships'], ['ojt', 'OJT'], ['job', 'Jobs']].map(([v, l]) => html`<option value="${v}"${p.get('type') === v || (!p.get('type') && !v) ? ' selected' : ''}>${l}</option>`)}
      </select></div>`);
  $('#type').addEventListener('change', (e) => { go({ type: e.target.value, id: '' }); loadList(); });
}

render($('#search'), searchBar({ q: params().get('q') ?? '', location: params().get('location') ?? '', button: 'Find Internship', flat: true }));
$('[data-search]').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  go({ q: form.get('q').trim(), location: form.get('location').trim(), id: '' });
  loadList();
});

// ---------- list ----------

async function loadList() {
  const p = params();
  const q = new URLSearchParams({ limit: '8', page: p.get('page') || '1' });
  for (const key of ['q', 'location', 'type']) if (p.get(key)) q.set(key, p.get(key));
  if (programId) q.set('programId', String(programId));

  paintHeader();
  render($('#list'), html`<p class="muted small">Loading...</p>`);
  try {
    const result = await api.get(`/opportunities?${q}`);
    state.items = result.data;
    state.pagination = result.pagination;
    state.selectedId = Number(p.get('id')) || state.items[0]?.opportunityId || null; // nothing chosen: show the first result
    paintList();
    paintDetail();
  } catch (e) {
    render($('#list'), html`<p class="brand small">${errorMessage(e)}</p>`);
  }
}

function paintList() {
  const { items, pagination } = state;
  render($('#list'), items.length
    ? html`${items.map((o) => listItem(o, o.opportunityId === state.selectedId, saves.has(o.opportunityId)))}`
    : html`<p class="muted small">No opportunities match your search.</p>`);

  render($('#pager'), pagination && pagination.totalPages > 1
    ? html`<button class="btn ghost sm" data-page="${pagination.page - 1}"${pagination.page <= 1 ? ' disabled' : ''}>Previous</button>
        <span class="muted">${pagination.page} / ${pagination.totalPages}</span>
        <button class="btn ghost sm" data-page="${pagination.page + 1}"${pagination.page >= pagination.totalPages ? ' disabled' : ''}>Next</button>`
    : '');
}

onClick($('#pager'), '[data-page]', (b) => { go({ page: b.dataset.page, id: '' }, { push: true }); loadList(); });

const list = $('#list');
function select(id) {
  state.selectedId = id;
  go({ id: String(id) }, { keepPage: true }); // picking a card stays on the same page of the list
  paintList();
  paintDetail();
}
onClick(list, '[data-save]', async (button, event) => {
  event.stopPropagation(); // saving should not change the selected card
  if (await saves.toggle(Number(button.dataset.save))) paintList();
});
onClick(list, '[data-select]', (item) => select(Number(item.dataset.select)));
list.addEventListener('keydown', (e) => {
  const item = e.target.closest?.('[data-select]');
  if (item && (e.key === 'Enter' || e.key === ' ') && e.target === item) { e.preventDefault(); select(Number(item.dataset.select)); }
});

// ---------- detail panel ----------

async function paintDetail() {
  const box = $('#detail');
  const id = state.selectedId;
  if (!id) { render(box, state.pagination ? html`<div class="panel center muted small" style="padding:2.5rem">Select an opportunity to read it here.</div>` : ''); return; }

  render(box, html`<div class="panel center muted small" style="padding:2.5rem">Loading...</div>`);
  let job;
  try {
    job = await api.get(`/opportunities/${id}`);
  } catch (e) {
    if (state.selectedId === id) render(box, html`<div class="panel center brand small" style="padding:2.5rem">${errorMessage(e)}</div>`);
    return;
  }
  if (state.selectedId !== id) return; // the user picked something else while this loaded

  const canApply = !user || isStudent; // employers and admins only read
  const applied = appliedIds.has(id);

  render(box, html`<article class="detail">
    <header>
      <h2>${job.title}</h2>
      <div class="row mt">
        <span class="avatar" style="border-radius:.4rem">${initial(job.companyName)}</span>
        <div class="small"><p style="font-weight:500">${job.companyName}</p>
          <p class="muted xs" style="display:flex;align-items:center;gap:.25rem">${icons.pin(12)} ${job.location ?? 'Location not specified'}</p></div>
      </div>
      <div class="mt" id="apply-area">
        ${canApply ? (applied ? html`<span class="pill gray">Applied</span>` : html`<button class="btn primary sm" id="apply-btn">Apply Now</button>`) : ''}
      </div>
    </header>
    <div class="body">
      <h3 class="bold">Full internship description</h3>
      <div class="stack mt">
        ${job.description ? richText(job.description) : ''}
        ${job.requirements ? richText(job.requirements) : ''}
        ${!job.description && !job.requirements ? html`<p class="muted small">The employer has not added a description yet.</p>` : ''}
      </div>
      ${job.skills?.length ? html`<div class="chips mt-lg">${job.skills.map((s) => html`<span class="chip tag">${s.name}</span>`)}</div>` : ''}
    </div>
  </article>`);

  $('#apply-btn')?.addEventListener('click', () => startApply(id));
}

function startApply(id) {
  if (!user) { location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`; return; }
  const area = $('#apply-area');
  render(area, html`<form style="max-width:32rem" id="apply-form">
    <textarea class="input" name="cover" rows="4" placeholder="Cover letter (optional)"></textarea>
    <div class="row mt-sm"><button class="btn primary sm">Submit application</button><button type="button" class="btn ghost sm" id="apply-cancel">Cancel</button></div>
    <div id="apply-msg"></div></form>`);
  $('#apply-cancel').addEventListener('click', paintDetail);
  $('#apply-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.currentTarget.querySelector('button');
    button.disabled = true;
    try {
      await api.post('/applications', { opportunityId: id, coverLetter: new FormData(e.currentTarget).get('cover').trim() || undefined });
      appliedIds.add(id);
      await paintDetail();
      notice($('#apply-area'), 'Application sent. The employer will be notified.', true);
      $('#apply-area').insertAdjacentHTML('afterbegin', '<span class="pill gray">Applied</span>');
    } catch (err) {
      button.disabled = false;
      notice($('#apply-msg'), errorMessage(err));
    }
  });
}

window.addEventListener('popstate', () => { loadList(); });
loadList();
