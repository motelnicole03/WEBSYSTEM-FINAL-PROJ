// Employer "My Profile": a read-only view of the company. Editing happens on /employer/profile-edit.html.
import { api, errorMessage } from './api.js';
import { mountPortal } from './layout.js';
import { pageTitle, verifyBanner } from './portal.js';
import { $, cap, html, initials, notice, render } from './ui.js';

const user = await mountPortal('employer', null); // not one of the sidebar pages, so nothing is highlighted
render($('#head'), html`${pageTitle('My Profile', 'This is how students see your company. Keep it up to date.')}${verifyBanner(user)}`);

const VERIFY_PILL = {
  verified: ['Verified', 'green'],
  pending: ['Pending verification', 'amber'],
  rejected: ['Rejected', 'red'],
};
const EDIT = '/employer/profile-edit.html';
const empty = (text) => html`<span class="muted">${text}</span>`;

function paintCompleteness(p) {
  const { percent, missing } = p.profileCompleteness;
  // Only nag while something is missing
  render($('#completeness'), percent >= 100 ? html`` : html`<section class="card" style="margin-top:1rem">
    <div class="row between small" style="justify-content:space-between"><span class="bold">Profile ${percent}% complete</span><span class="xs muted">To do: ${missing.join(', ')}</span></div>
    <div class="progress mt-sm"><div style="width:${percent}%"></div></div></section>`);
}

function paintCard(p) {
  const [label, cls] = VERIFY_PILL[p.verificationStatus] ?? [cap(p.verificationStatus), ''];
  render($('#company-card'), html`
    <div class="co-logo">${p.logoUrl ? html`<img src="${p.logoUrl}" alt="Logo of ${p.companyName}">` : initials(p.companyName)}</div>
    <div class="co-info">
      <div class="co-title-row"><h2>${p.companyName}</h2><span class="pill ${cls}">${label}</span></div>
      <p class="bold small" style="color:var(--admin)">${p.industry ?? 'Industry not set'}</p>
      <p class="muted small">${[p.address, p.email].filter(Boolean).join(' · ')}</p>
    </div>
    <a class="btn primary" href="${EDIT}">Edit profile</a>`);
}

function paintAbout(p) {
  render($('#about'), p.about
    ? html`<p class="co-text">${p.about}</p>`
    : html`<p class="muted small">You have not written anything yet. <a class="link" href="${EDIT}">Add a short description</a> so students can get to know your company.</p>`);
}

function paintPositions(p) {
  render($('#positions'), p.openPositions.length
    ? html`${p.openPositions.map((o) => html`<div class="co-position">
        <span style="min-width:0"><a class="link" href="/jobs.html?id=${o.opportunityId}">${o.title}</a>
          <span class="muted xs" style="display:block">${[cap(o.type), o.location].filter(Boolean).join(' · ')}</span></span>
        <span class="pill green">Open</span></div>`)}`
    : html`<p class="muted small">No open positions right now. <a class="link" href="/employer/jobs.html">Go to Job Posts</a>.</p>`);
}

function paintDetails(p) {
  const site = p.website ? p.website.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';
  render($('#details'), html`<dl class="co-dl">
    <div><dt>Industry</dt><dd>${p.industry ?? empty('Not set')}</dd></div>
    <div><dt>Company size</dt><dd>${p.companySize ? `${p.companySize} employees` : empty('Not set')}</dd></div>
    <div><dt>Website</dt><dd>${p.website ? html`<a class="link" href="${p.website}" target="_blank" rel="noopener noreferrer">${site}</a>` : empty('Not set')}</dd></div>
    <div><dt>Address</dt><dd>${p.address ?? empty('Not set')}</dd></div>
  </dl>`);
}

function paintContact(p) {
  render($('#contact'), html`<dl class="co-dl">
    <div><dt>Contact person</dt><dd>${p.contactPerson ?? empty('Not set')}</dd></div>
    <div><dt>Email</dt><dd>${p.email}</dd></div>
    <div><dt>Phone</dt><dd>${p.phone ?? empty('Not set')}</dd></div>
  </dl>`);
}

try {
  const profile = await api.get('/employers/me');
  paintCompleteness(profile); paintCard(profile); paintAbout(profile);
  paintPositions(profile); paintDetails(profile); paintContact(profile);
} catch (e) {
  notice($('#message'), errorMessage(e));
}