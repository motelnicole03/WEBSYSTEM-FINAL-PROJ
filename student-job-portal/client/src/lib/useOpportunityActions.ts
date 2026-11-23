import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage } from './api';
import { OpportunitySummary } from '../types';

/** Save and apply behaviour shared by every page that shows opportunity cards. */
export function useOpportunityActions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  const isStudent = user?.role === 'student';

  useEffect(() => {
    if (!isStudent) {
      setSavedIds(new Set());
      return;
    }
    api
      .get<OpportunitySummary[]>('/opportunities/saved')
      .then((rows) => setSavedIds(new Set(rows.map((r) => r.opportunityId))))
      .catch(() => {});
  }, [isStudent]);

  /** Guests are sent to login and come back here afterwards. */
  const requireStudent = useCallback(() => {
    if (isStudent) return true;
    if (!user) navigate('/login', { state: { from: location.pathname } });
    else setNotice('Only student accounts can save or apply to opportunities.');
    return false;
  }, [isStudent, user, navigate, location.pathname]);

  const toggleSave = async (id: number) => {
    if (!requireStudent()) return;
    const wasSaved = savedIds.has(id);
    try {
      if (wasSaved) await api.delete(`/opportunities/${id}/save`);
      else await api.post(`/opportunities/${id}/save`);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(id);
        else next.add(id);
        return next;
      });
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  // Applying happens on the details page, where the student can read the posting first
  const apply = (id: number) => {
    if (requireStudent()) navigate(`/jobs/${id}`);
  };

  return { savedIds, toggleSave, apply, notice, clearNotice: () => setNotice(null) };
}
