import { api, errorMessage } from './api.js';
import { openChat } from './chat.js';
import { mountPortal } from './layout.js';
import { pageTitle } from './portal.js';
import { $, html, initial, notice, onClick, render, timeAgo } from './ui.js';

await mountPortal('employer', 'messages');
render($('#head'), pageTitle('Messages', 'Conversations with applicants. Click one to open the chat window.'));

let items = [];
async function load() {
  try {
    items = await api.get('/messages/inbox');
    render($('#list'), items.length ? html`<div class="card" style="padding:0;overflow:hidden">${items.map((c) => html`<button data-chat="${c.applicationId}" class="row" style="width:100%;padding:1rem 1.25rem;border:0;border-bottom:1px solid var(--line);background:#fff;text-align:left;cursor:pointer">
      <span class="avatar">${initial(c.firstName)}</span>
      <span class="small grow" style="min-width:0">
        <span class="row between"><span class="t truncate" style="font-weight:${c.unread ? 600 : 500}">${c.firstName} ${c.lastName}</span><span class="xs muted">${timeAgo(c.lastSentAt)}</span></span>
        <span class="xs muted truncate" style="display:block">${c.opportunityTitle}</span>
        <span class="xs truncate" style="display:block;font-weight:${c.unread ? 600 : 400}">${c.lastFromMe ? 'You: ' : ''}${c.lastBody}</span></span>
      ${c.unread > 0 ? html`<span class="dot on"></span>` : ''}</button>`)}</div>`
      : html`<p class="small muted">No conversations yet. Open an applicant and press Message to start one.</p>`);
  } catch (e) { notice($('#message'), errorMessage(e)); }
}
onClick($('#list'), '[data-chat]', (b) => {
  const c = items.find((x) => x.applicationId === Number(b.dataset.chat));
  openChat({ applicationId: c.applicationId, name: `${c.firstName} ${c.lastName}`, subtitle: c.opportunityTitle });
});
load();
setInterval(load, 10_000);
