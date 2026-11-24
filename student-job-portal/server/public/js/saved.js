import { api, errorMessage } from './api.js';
import { requireRole } from './auth.js';
import { oppCard } from './cards.js';
import { mountSite } from './layout.js';
import { $, html, notice, onClick, render } from './ui.js';

await requireRole(['student']);
await mountSite({});

let items = [];

function paint() {
  render($('#list'), items.length
    ? html`${items.map((o) => oppCard(o, true))}`
    : html`<p class="muted small" style="grid-column:1/-1">You have not saved anything yet. Tap the bookmark on an internship to keep it here. <a class="link" href="/jobs.html">Browse internships</a></p>`);
}

try { items = await api.get('/opportunities/saved'); paint(); } catch (e) { notice($('#message'), errorMessage(e)); }

// Every card here is saved, so the bookmark removes it from the list
onClick($('#list'), '[data-save]', async (button, event) => {
  event.preventDefault();
  const id = Number(button.dataset.save);
  try {
    await api.delete(`/opportunities/${id}/save`);
    items = items.filter((o) => o.opportunityId !== id);
    paint();
  } catch (e) { notice($('#message'), errorMessage(e)); }
});
