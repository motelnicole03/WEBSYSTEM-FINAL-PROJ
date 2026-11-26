// Company Reviews: the companies students rated, with their average stars and how many rated them.
import { api, errorMessage } from './api.js';
import { mountSite } from './layout.js';
import { $, html, icons, initial, render } from './ui.js';

await mountSite({ active: 'reviews' });

let companies = [];

// Read-only stars, rounded to the nearest whole star (4.3 shows 4 filled stars)
const stars = (average) => html`<span class="rstars" role="img" aria-label="${average.toFixed(1)} out of 5 stars">${[1, 2, 3, 4, 5].map((n) => html`<span class="rstar${n <= Math.round(average) ? ' on' : ''}" aria-hidden="true">&#9733;</span>`)}</span>`;

const card = (c) => html`<article class="rcard">
  <h2>${c.companyName}</h2>
  <div class="row mt">
    <span class="avatar" style="border-radius:.4rem">${initial(c.companyName)}</span>
    <div class="small" style="min-width:0"><p style="font-weight:500">${c.companyName}</p>
      <p class="muted xs truncate" style="display:flex;align-items:center;gap:.25rem">${icons.pin(12)} ${c.address || 'Location not specified'}</p></div>
  </div>
  <div class="rcard-foot">${stars(c.average)}<span class="muted xs"><b>${c.average.toFixed(1)}</b> &middot; ${c.count} rated</span></div>
</article>`;

function paint() {
  const text = $('#q').value.trim().toLowerCase();
  const sort = $('#sort').value;
  const list = companies.filter((c) => c.companyName.toLowerCase().includes(text));
  list.sort(sort === 'most' ? (a, b) => b.count - a.count || b.average - a.average
    : sort === 'az' ? (a, b) => a.companyName.localeCompare(b.companyName)
    : (a, b) => b.average - a.average || b.count - a.count);
  render($('#grid'), list.length
    ? html`${list.map(card)}`
    : html`<p class="muted small">${companies.length ? 'No company matches your search.' : 'No company has been rated yet.'}</p>`);
}

$('#q').addEventListener('input', paint);
$('#sort').addEventListener('change', paint);

try {
  companies = await api.get('/ratings/companies');
  paint();
} catch (err) {
  render($('#message'), html`<p class="brand mt">${errorMessage(err)}</p>`);
}