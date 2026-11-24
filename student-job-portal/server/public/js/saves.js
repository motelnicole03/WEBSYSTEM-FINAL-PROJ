// Save (bookmark) behaviour shared by the pages that show opportunity cards.
import { api, errorMessage } from './api.js';

/** Returns { has(id), toggle(id) }. Guests are sent to login; only students can save. */
export async function createSaves(user, showNotice) {
  const ids = new Set();
  if (user?.role === 'student') {
    try { (await api.get('/opportunities/saved')).forEach((o) => ids.add(o.opportunityId)); } catch { /* ignore */ }
  }

  return {
    has: (id) => ids.has(id),
    /** Returns true when the saved state changed. */
    async toggle(id) {
      if (!user) {
        location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
        return false;
      }
      if (user.role !== 'student') { showNotice('Only student accounts can save or apply to opportunities.'); return false; }
      const was = ids.has(id);
      try {
        if (was) await api.delete(`/opportunities/${id}/save`);
        else await api.post(`/opportunities/${id}/save`);
        if (was) ids.delete(id); else ids.add(id);
        return true;
      } catch (e) {
        showNotice(errorMessage(e));
        return false;
      }
    },
  };
}
