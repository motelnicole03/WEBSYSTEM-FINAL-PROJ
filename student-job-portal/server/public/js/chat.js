// Messenger-style chat windows docked to the bottom-right of the screen.
import { api, errorMessage } from './api.js';
import { esc, html, initial, render } from './ui.js';

const MAX_WINDOWS = 3;
const WIDTH = 328;
const GAP = 12;
const MARGIN = 16;

let me = null;
let dock = null;
const windows = []; // { applicationId, name, subtitle, minimized, messages: [], timer, box }

/** Tells the navbar to re-read its unread counts. */
const announce = () => document.dispatchEvent(new Event('sc:unread-changed'));

export function initChat(user) {
  me = user;
  dock = document.createElement('div');
  dock.id = 'chat-dock';
  document.body.append(dock);
}

export function openChat({ applicationId, name, subtitle }) {
  if (!dock) return;
  const existing = windows.find((w) => w.applicationId === applicationId);
  if (existing) {
    existing.minimized = false;
  } else {
    windows.push({ applicationId, name, subtitle, minimized: false, messages: [], timer: null, box: null });
    while (windows.length > MAX_WINDOWS) closeWindow(windows[0]); // like Messenger, only a few at a time
  }
  layout();
}

function closeWindow(w) {
  clearInterval(w.timer);
  w.box?.remove();
  windows.splice(windows.indexOf(w), 1);
}

function createBox(w) {
  const box = document.createElement('section');
  box.className = 'chat-box';
  box.innerHTML = `
    <header class="chat-head">
      <button class="who" data-toggle aria-label="Minimize or expand chat">
        <span class="avatar">${esc(initial(w.name))}</span>
        <span style="min-width:0"><span class="name truncate" style="display:block">${esc(w.name)}</span><span class="sub truncate" style="display:block">${esc(w.subtitle)}</span></span>
      </button>
      <button class="x" data-toggle aria-label="Minimize">&minus;</button>
      <button class="x" data-close aria-label="Close chat">&times;</button>
    </header>
    <div data-body>
      <div class="chat-msgs" data-msgs></div>
      <div class="chat-err" data-err></div>
      <form class="chat-form" data-form>
        <input name="body" maxlength="2000" placeholder="Aa" aria-label="Message" autocomplete="off">
        <button class="btn primary sm" type="submit">Send</button>
      </form>
    </div>`;

  box.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { closeWindow(w); layout(); }
    else if (e.target.closest('[data-toggle]')) { w.minimized = !w.minimized; layout(); }
  });
  box.querySelector('[data-form]').addEventListener('submit', (e) => { e.preventDefault(); send(w); });
  dock.append(box);
  return box;
}

/** Creates, positions and shows or hides each window to match the state. */
function layout() {
  windows.forEach((w, i) => {
    if (!w.box) w.box = createBox(w);
    w.box.style.right = `${MARGIN + (windows.length - 1 - i) * (WIDTH + GAP)}px`;
    w.box.classList.toggle('behind', i < windows.length - 1); // only the newest shows on phones
    w.box.querySelector('[data-body]').hidden = w.minimized;

    clearInterval(w.timer);
    w.timer = null;
    if (!w.minimized) {
      load(w);
      w.timer = setInterval(() => load(w), 5000); // refresh while expanded
    }
  });
}

async function load(w) {
  try {
    // Loading a thread also marks the incoming messages as read on the server
    const thread = await api.get(`/messages?applicationId=${w.applicationId}`);
    paintMessages(w, thread.messages);
    announce();
  } catch { /* keep what we have; the next refresh tries again */ }
}

function paintMessages(w, messages) {
  const list = w.box.querySelector('[data-msgs]');
  const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40 || w.messages.length === 0;
  w.messages = messages;
  render(list, messages.length === 0
    ? html`<p class="muted xs center" style="padding-top:2.5rem">No messages yet. Say hello!</p>`
    : html`${messages.map((m) => html`<div class="bubble${m.senderId === me.id ? ' mine' : ''}">${m.body}<time>${new Date(m.sentAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div>`)}`);
  if (atBottom) list.scrollTop = list.scrollHeight;
}

async function send(w) {
  const input = w.box.querySelector('input[name="body"]');
  const err = w.box.querySelector('[data-err]');
  const body = input.value.trim();
  if (!body) return;
  err.textContent = '';
  input.disabled = true;
  try {
    const saved = await api.post('/messages', { applicationId: w.applicationId, body });
    paintMessages(w, [...w.messages, saved]);
    w.box.querySelector('[data-msgs]').scrollTop = 1e9;
    input.value = '';
  } catch (e) {
    err.textContent = errorMessage(e);
  } finally {
    input.disabled = false;
    input.focus();
  }
}
