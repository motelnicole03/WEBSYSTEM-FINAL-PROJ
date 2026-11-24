import { api, errorMessage } from './api.js';
import { oppCard } from './cards.js';
import { mountSite } from './layout.js';
import { createSaves } from './saves.js';
import { $, esc, html, notice, onClick, render, searchBar } from './ui.js';

const user = await mountSite({ active: 'home', overlay: true });

// Hero search goes to the Find Job page
render($('#hero-search'), searchBar());
$('[data-search]').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const params = new URLSearchParams();
  if (form.get('q').trim()) params.set('q', form.get('q').trim());
  if (form.get('location').trim()) params.set('location', form.get('location').trim());
  location.href = `/jobs.html?${params}`;
});

const message = $('#message');
const saves = await createSaves(user, (text) => notice(message, text));
const box = $('#featured');
let featured = [];

function paint() {
  render(box, featured.length
    ? html`${featured.map((o) => oppCard(o, saves.has(o.opportunityId)))}`
    : html`<p class="muted small center" style="grid-column:1/-1">No open opportunities yet. Check back soon.</p>`);
}

try {
  const page = await api.get('/opportunities?limit=12');
  featured = page.data.slice(0, 3);
  paint();

  // No logo column in the database yet, so Top Companies shows names
  const names = [...new Set(page.data.map((o) => o.companyName))].slice(0, 6);
  if (names.length) {
    render($('#companies'), html`<h2 class="title">Top Companies</h2><div class="company-row">${names.map((n) => html`<span>${n}</span>`)}</div>`);
  }
} catch (e) {
  render(box, html`<p class="brand small center" style="grid-column:1/-1">${errorMessage(e)}</p>`);
}

onClick(box, '[data-save]', async (button, event) => {
  event.preventDefault();
  if (await saves.toggle(Number(button.dataset.save))) paint();
});
onClick(box, '[data-apply]', (link, event) => {
  // Guests log in first; everyone else goes to the details page to apply
  if (!user) { event.preventDefault(); location.href = `/login.html?next=${encodeURIComponent(link.getAttribute('href'))}`; }
});
