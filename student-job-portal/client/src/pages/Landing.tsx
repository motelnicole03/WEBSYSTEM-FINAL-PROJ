import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OpportunityCard from '../components/OpportunityCard';
import SearchBar from '../components/SearchBar';
import { api, errorMessage } from '../lib/api';
import { useOpportunityActions } from '../lib/useOpportunityActions';
import { OpportunitySummary, Page } from '../types';

export default function Landing() {
  const navigate = useNavigate();
  const { savedIds, toggleSave, apply, notice, clearNotice } = useOpportunityActions();
  const [featured, setFeatured] = useState<OpportunitySummary[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Page<OpportunitySummary>>('/opportunities?limit=12')
      .then((page) => {
        setFeatured(page.data.slice(0, 3));
        setCompanies([...new Set(page.data.map((o) => o.companyName))].slice(0, 6));
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const search = (q: string, location: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (location) params.set('location', location);
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <>
      {/*
        Hero: a full-screen section that also sits behind the navbar.
        Layers, bottom to top: base gradient -> campus photo -> white fades (top blends into the
        navbar, bottom blends into the next section) -> content.
        Put the photo at client/public/hero.jpg.
      */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-slate-50 to-white" />
        <img
          src="/hero.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white via-white/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-white via-white/80 to-transparent" />

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-32 text-center">
          <h1 className="text-3xl font-semibold leading-snug sm:text-5xl sm:leading-tight">
            Find an <span className="text-brand">internship</span> that aligns with
            <br className="hidden sm:block" /> your interests and skills
          </h1>
          <p className="mt-4 text-sm text-muted sm:text-base">
            Explore opportunities, manage applications, and build your career.
          </p>
          <div className="mt-10 flex w-full justify-center">
            <SearchBar onSearch={search} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-12">
        <h2 className="text-center text-2xl font-semibold">Featured Internships</h2>
        <p className="mt-1 text-center text-sm text-muted">Choose jobs from the top employers and apply for the same.</p>

        {notice && (
          <p className="mx-auto mt-6 max-w-xl rounded bg-brand-soft px-4 py-2 text-center text-sm text-brand" onClick={clearNotice}>
            {notice}
          </p>
        )}

        {loading && <p className="mt-10 text-center text-sm text-muted">Loading...</p>}
        {error && <p className="mt-10 text-center text-sm text-brand">{error}</p>}
        {!loading && !error && featured.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted">No open opportunities yet. Check back soon.</p>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {featured.map((o) => (
            <OpportunityCard
              key={o.opportunityId}
              opportunity={o}
              saved={savedIds.has(o.opportunityId)}
              onToggleSave={toggleSave}
              onApply={apply}
            />
          ))}
        </div>

        <p className="mt-8 text-center">
          <Link to="/jobs" className="text-sm text-brand underline underline-offset-4">View all</Link>
        </p>
      </section>

      {companies.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pt-16">
          <h2 className="text-center text-2xl font-semibold">Top Companies</h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-14 gap-y-6">
            {/* Company names for now. Logos need a logo upload for employers first. */}
            {companies.map((name) => (
              <span key={name} className="text-lg font-semibold text-slate-500">{name}</span>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
