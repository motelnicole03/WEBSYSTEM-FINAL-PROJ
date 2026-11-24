import { mountSite } from './layout.js';
import { $, query } from './ui.js';

await mountSite({});
const q = query();
$('#title').textContent = q.get('title') || 'Coming soon';
$('#note').textContent = q.get('note') || 'This page is coming next.';
document.title = `${q.get('title') || 'Coming soon'} | StudentConnect`;
