import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OpportunityCard from '../components/OpportunityCard';
import { api, errorMessage } from '../lib/api';
import { OpportunitySummary } from '../types';

export default function SavedInternships() {
  const navigate = useNavigate();
  const [items, setItems] = useState<OpportunitySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<OpportunitySummary[]>('/opportunities/saved').then(setItems).catch((e) => setError(errorMessage(e)));
  }, []);

  // Every card here is saved, so the bookmark removes it from the list
  const unsave = async (id: number) => {
    try {
      await api.delete(`/opportunities/${id}/save`);
      setItems((list) => list?.filter((o) => o.opportunityId !== id) ?? null);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Saved Internships</h1>
      {error && <p className="mt-4 rounded bg-brand-soft px-4 py-2 text-sm text-brand">{error}</p>}
      {items === null && !error && <p className="mt-6 text-sm text-muted">Loading...</p>}
      {items?.length === 0 && (
        <p className="mt-6 text-sm text-muted">
          You have not saved anything yet. Tap the bookmark on an internship to keep it here.{' '}
          <Link to="/jobs" className="text-brand underline">Browse internships</Link>
        </p>
      )}
      <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items?.map((o) => (
          <OpportunityCard
            key={o.opportunityId}
            opportunity={o}
            saved
            onToggleSave={unsave}
            onApply={(id) => navigate(`/jobs/${id}`)}
          />
        ))}
      </div>
    </div>
  );
}
