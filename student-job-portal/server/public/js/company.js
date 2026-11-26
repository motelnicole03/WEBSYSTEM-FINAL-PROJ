// Company page: what a student sees about an employer. The employer edits it on /employer/profile-edit.html.
import { api, errorMessage } from './api.js';
import { mountSite } from './layout.js';
import { $, cap, html, initials, notice, query, render } from './ui.js';

await mountSite({});

const empty = (text) => html`<span class="muted">${text}</span>`;

function paintCard(c) {
  render($('#company-card'), html`
    <div class="co-logo">${c.logoUrl ? html`<img src="${c.logoUrl}" alt="Logo of ${c.companyName}">` : initials(c.companyName)}</div>
    <div class="co-info">
      <div class="co-title-row"><h2>${c.companyName}</h2><span class="pill green">Verified</span></div>
      <p class="bold small brand">${c.industry ?? 'Industry not specified'}</p>
      ${c.address ? html`<p class="muted small">${c.address}</p>` : ''}
    </div>
    ${c.website ? html`<a class="btn primary" href="${c.website}" target="_blank" rel="noopener noreferrer">Visit website</a>` : ''}`);
}

function paintAbout(c) {
  render($('#about'), c.about
    ? html`<p class="co-text">${c.about}</p>`
    : html`<p class="muted small">This company has not added a description yet.</p>`);
}

function paintPositions(c) {
  render($('#positions'), c.openPositions.length
    ? html`${c.openPositions.map((o) => html`<div class="co-position">
        <span style="min-width:0"><a class="link" href="/jobs.html?id=${o.opportunityId}">${o.title}</a>
          <span class="muted xs" style="display:block">${[cap(o.type), o.location].filter(Boolean).join(' · ')}</span></span>
        <span class="pill green">Open</span></div>`)}`
    : html`<p class="muted small">No open positions right now.</p>`);
}

function paintDetails(c) {
  const site = c.website ? c.website.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';
  render($('#details'), html`<dl class="co-dl">
    <div><dt>Industry</dt><dd>${c.industry ?? empty('Not specified')}</dd></div>
    <div><dt>Company size</dt><dd>${c.companySize ? `${c.companySize} employees` : empty('Not specified')}</dd></div>
    <div><dt>Website</dt><dd>${c.website ? html`<a class="link" href="${c.website}" target="_blank" rel="noopener noreferrer">${site}</a>` : empty('Not specified')}</dd></div>
    <div><dt>Address</dt><dd>${c.address ?? empty('Not specified')}</dd></div>
  </dl>`);
}

function paintContact(c) {
  // The server only sends contact details to logged-in visitors
  if (!c.contact) {
    const next = encodeURIComponent(location.pathname + location.search);
    render($('#contact'), html`<p class="muted small"><a class="link" href="/login.html?next=${next}">Log in</a> to see this company's contact details.</p>`);
    return;
  }
  render($('#contact'), html`<dl class="co-dl">
    <div><dt>Contact person</dt><dd>${c.contact.contactPerson ?? empty('Not specified')}</dd></div>
    <div><dt>Email</dt><dd>${c.contact.email}</dd></div>
    <div><dt>Phone</dt><dd>${c.contact.phone ?? empty('Not specified')}</dd></div>
  </dl>`);
}

const id = Number(query().get('id'));
if (!Number.isInteger(id) || id <= 0) {
  notice($('#message'), 'No company was selected.');
} else {
  try {
    const company = await api.get(`/employers/${id}`);
    document.title = `${company.companyName} | StudentConnect`;
    paintCard(company); paintAbout(company); paintPositions(company); paintDetails(company); paintContact(company);
  } catch (e) {
    notice($('#message'), errorMessage(e));
  }
}