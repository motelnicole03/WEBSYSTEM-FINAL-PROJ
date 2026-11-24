import { html, icons, initial } from './ui.js';

/** Larger card used on the landing page and the saved list. */
export function oppCard(o, saved) {
  return html`<article class="opp-card" data-id="${o.opportunityId}">
    <div class="row between" style="align-items:flex-start">
      <h3>${o.title}</h3>
      <button class="bookmark" data-save="${o.opportunityId}" aria-label="${saved ? 'Remove from saved' : 'Save opportunity'}">${icons.bookmark(18, saved)}</button>
    </div>
    <div class="who">
      <span class="avatar">${initial(o.companyName)}</span>
      <div style="min-width:0"><p class="truncate bold" style="font-weight:500">${o.companyName}</p>
        <p class="loc">${icons.pin(12)}<span class="truncate">${o.location ?? 'Location not specified'}</span></p></div>
    </div>
    <div class="actions">
      <a class="btn ghost sm" href="/jobs.html?id=${o.opportunityId}" style="color:var(--brand)">View Details</a>
      <a class="btn primary sm" href="/jobs.html?id=${o.opportunityId}" data-apply="${o.opportunityId}">Apply Now</a>
    </div>
  </article>`;
}

/** Compact card for the list on the Find Job page. */
export function listItem(o, selected, saved) {
  return html`<div class="list-item${selected ? ' selected' : ''}" role="button" tabindex="0" data-select="${o.opportunityId}">
    <div class="row between" style="align-items:flex-start">
      <h3>${o.title}</h3>
      <button class="bookmark" data-save="${o.opportunityId}" aria-label="${saved ? 'Remove from saved' : 'Save opportunity'}">${icons.bookmark(16, saved)}</button>
    </div>
    <div class="who">
      <span class="avatar">${initial(o.companyName)}</span>
      <div style="min-width:0"><p class="truncate" style="font-weight:500">${o.companyName}</p>
        <p class="loc muted" style="display:flex;align-items:center;gap:.25rem">${icons.pin(10)}<span class="truncate">${o.location ?? 'Location not specified'}</span></p></div>
    </div>
  </div>`;
}
