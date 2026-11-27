import { api, errorMessage } from './api.js';
import { mountPortal } from './layout.js';
import { pageTitle, verifyBanner } from './portal.js';
import { $, fmtDate, html, notice, onClick, oppStatusPill, render } from './ui.js';

const user = await mountPortal('employer', 'jobs');
const verified = user.employer?.verificationStatus === 'verified';
render($('#head'), html`<div class="row-wrap between" style="align-items:flex-start"><div>${pageTitle('Job Posts', 'Create postings and send them to the admin for approval.')}</div>
  <a class="btn primary" href="/employer/job-form.html" style="margin-top:.75rem${verified ? '' : ';pointer-events:none;opacity:.5'}">+ New post</a></div>${verifyBanner(user)}`);

let rows = [];
async function load() {
  try {
    rows = await api.get('/opportunities/mine');
    render($('#list'), rows.length ? html`${rows.map((r) => {
      const editable = r.status !== 'closed' && r.status !== 'filled';
      return html`<article class="item row-wrap between">
        <div style="min-width:0" class="small"><p class="t">${r.title}</p>
          <p class="muted xs" style="text-transform:none">${r.type} · ${r.slots} slot${r.slots === 1 ? '' : 's'}${r.deadline ? ` · deadline ${fmtDate(r.deadline)}` : ''} · <a class="link" href="/employer/applicants.html?opportunityId=${r.opportunityId}">${r.applicationsCount} applicant${r.applicationsCount === 1 ? '' : 's'}</a></p></div>
        <div class="row-wrap">${oppStatusPill(r.status)}
          ${r.status === 'open' ? html`<a class="btn ghost sm" href="/jobs.html?id=${r.opportunityId}">View live</a>` : ''}
          ${editable ? html`<a class="btn ghost sm" href="/employer/job-form.html?id=${r.opportunityId}">Edit</a>` : ''}
          ${r.status === 'draft' ? html`<button class="btn primary sm" data-act="submit" data-id="${r.opportunityId}">Submit for approval</button>` : ''}
          ${r.status === 'open' || r.status === 'filled' ? html`<button class="btn ghost sm" data-act="close" data-id="${r.opportunityId}" data-status="${r.status}">Close</button>` : ''}
          ${r.status === 'draft' ? html`<button class="btn ghost sm" data-act="delete" data-id="${r.opportunityId}" style="color:var(--admin-number)">Delete</button>` : ''}        </div></article>`;
    })}` : html`<p class="small muted">No postings yet.</p>`);
  } catch (e) { notice($('#message'), errorMessage(e)); }
}

onClick($('#list'), '[data-act]', async (b) => {
  const { act, id, status } = b.dataset;
  if (act === 'close' && !confirm(status === 'filled'
    ? 'Mark this filled posting as closed? Students already cannot apply to it. Its applicants and interns are kept.'
    : 'Close this posting? Students will no longer be able to apply.')) return;
  if (act === 'delete' && !confirm('Delete this draft? This cannot be undone.')) return;
  notice($('#message'), '');
  try {
    if (act === 'delete') await api.delete(`/opportunities/${id}`);
    else await api.post(`/opportunities/${id}/${act}`);
    await load();
  } catch (e) { notice($('#message'), errorMessage(e)); }
});
load();
