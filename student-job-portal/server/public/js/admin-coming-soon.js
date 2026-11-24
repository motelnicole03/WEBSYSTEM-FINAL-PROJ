import { mountPortal } from './layout.js';
import { $, query } from './ui.js';

const q = query();
await mountPortal('admin', q.get('key') || 'dashboard');
$('#title').textContent = q.get('title') || 'Coming soon';
$('#note').textContent = q.get('note') || 'This page is coming next.';
document.title = `${q.get('title') || 'Coming soon'} | StudentConnect`;
