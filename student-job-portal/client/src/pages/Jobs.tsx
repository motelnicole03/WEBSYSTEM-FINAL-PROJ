import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PinIcon } from '../components/icons';
import OpportunityListItem from '../components/OpportunityListItem';
import RichText from '../components/RichText';
import SearchBar from '../components/SearchBar';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage } from '../lib/api';
import { useOpportunityActions } from '../lib/useOpportunityActions';
import { OpportunitySummary, Page } from '../types';

interface Detail extends OpportunitySummary {
  description: string | null;
  requirements: string | null;
}

const TYPES = [
  { value: '', label: 'All types' },
  { value: 'internship', label: 'Internships' },
  { value: 'ojt', label: 'OJT' },
  { value: 'job', label: 'Jobs' },
];

export default function Jobs() {
  const { id } = useParams(); // /jobs/:id selects a card
  const selectedId = id ? Number(id) : null;
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { savedIds, toggleSave, notice, clearNotice } = useOpportunityActions();

  const [result, setResult] = useState<Page<OpportunitySummary> | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [programId, setProgramId] = useState<number | null | undefined>(undefined); // undefined = still loading

  const q = params.get('q') ?? '';
  const location = params.get('location') ?? '';
  const type = params.get('type') ?? '';
  const page = Number(params.get('page') ?? 1) || 1;

  // Students see opportunities for their program (plus ones open to every program)
  const isStudent = user?.role === 'student';
  useEffect(() => {
    if (!isStudent) return setProgramId(null);
    api
      .get<{ programId: number }>('/students/me')
      .then((s) => setProgramId(s.programId))
      .catch(() => setProgramId(null));
  }, [isStudent]);

  useEffect(() => {
    if (programId === undefined) return; // wait until we know whether to filter by program
    const query = new URLSearchParams({ limit: '8', page: String(page) });
    if (q) query.set('q', q);
    if (location) query.set('location', location);
    if (type) query.set('type', type);
    if (programId) query.set('programId', String(programId));

    setLoading(true);
    api
      .get<Page<OpportunitySummary>>(`/opportunities?${query.toString()}`)
      .then((r) => {
        setResult(r);
        setListError(null);
      })
      .catch((e) => setListError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [q, location, type, page, programId]);

  // With nothing selected, show the first result
  const firstId = result?.data[0]?.opportunityId ?? null;
  const activeId = selectedId ?? firstId;

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    navigate({ pathname: '/jobs', search: next.toString() }); // a new search clears the selection
  };

  const select = (opportunityId: number) =>
    navigate({ pathname: `/jobs/${opportunityId}`, search: params.toString() });

  const firstName = user?.student?.firstName;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex justify-center">
        <SearchBar
          key={`${q}|${location}`}
          initialQ={q}
          initialLocation={location}
          buttonLabel="Find Internship"
          onSearch={(nq, nl) => update({ q: nq, location: nl })}
        />
      </div>

      {notice && (
        <p className="mt-6 cursor-pointer rounded bg-brand-soft px-4 py-2 text-sm text-brand" onClick={clearNotice}>{notice}</p>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside>
          {firstName ? (
            <h1 className="text-xl font-bold">Welcome, <span className="text-brand">{firstName}</span>!</h1>
          ) : (
            <h1 className="text-xl font-bold">Find a job</h1>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{isStudent ? 'Internships for you' : 'Opportunities'}</h2>
            <select
              value={type}
              onChange={(e) => update({ type: e.target.value })}
              aria-label="Type"
              className="rounded border border-line bg-white px-2 py-1 text-xs"
            >
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="mt-4 space-y-3">
            {listError && <p className="text-sm text-brand">{listError}</p>}
            {loading && <p className="text-sm text-muted">Loading...</p>}
            {!loading && result?.data.length === 0 && <p className="text-sm text-muted">No opportunities match your search.</p>}
            {result?.data.map((o) => (
              <OpportunityListItem
                key={o.opportunityId}
                opportunity={o}
                selected={o.opportunityId === activeId}
                saved={savedIds.has(o.opportunityId)}
                onSelect={select}
                onToggleSave={toggleSave}
              />
            ))}
          </div>

          {result && result.pagination.totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between text-xs">
              <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} className="rounded border border-line px-3 py-1 disabled:opacity-40">Previous</button>
              <span className="text-muted">{page} / {result.pagination.totalPages}</span>
              <button disabled={page >= result.pagination.totalPages} onClick={() => update({ page: String(page + 1) })} className="rounded border border-line px-3 py-1 disabled:opacity-40">Next</button>
            </div>
          )}
        </aside>

        <section>
          {activeId ? <DetailPanel key={activeId} id={activeId} /> : !loading && <div className="rounded-lg border border-line p-10 text-center text-sm text-muted">Select an opportunity to read it here.</div>}
        </section>
      </div>
    </div>
  );
}

function DetailPanel({ id }: { id: number }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<number>>(new Set());
  const [writing, setWriting] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const isStudent = user?.role === 'student';
  const canApply = !user || isStudent; // employers and admins only read

  useEffect(() => {
    api.get<Detail>(`/opportunities/${id}`).then(setJob).catch((e) => setError(errorMessage(e)));
  }, [id]);

  // Know which postings this student already applied to
  useEffect(() => {
    if (!isStudent) return;
    api
      .get<{ opportunityId: number }[]>('/applications/mine')
      .then((rows) => setAppliedIds(new Set(rows.map((r) => r.opportunityId))))
      .catch(() => {});
  }, [isStudent]);

  const applied = appliedIds.has(id);

  const startApply = () => {
    if (!user) return navigate('/login', { state: { from: `/jobs/${id}` } });
    setWriting(true);
  };

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await api.post('/applications', { opportunityId: id, coverLetter: coverLetter.trim() || undefined });
      setAppliedIds((prev) => new Set(prev).add(id));
      setWriting(false);
      setMessage({ ok: true, text: 'Application sent. The employer will be notified.' });
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="rounded-lg border border-line p-10 text-center text-sm text-brand">{error}</div>;
  if (!job) return <div className="rounded-lg border border-line p-10 text-center text-sm text-muted">Loading...</div>;

  return (
    <article className="rounded-xl border border-line bg-white">
      <header className="border-b border-line p-6">
        <h2 className="text-xl font-semibold">{job.title}</h2>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-brand-soft font-semibold text-brand">
            {job.companyName.charAt(0).toUpperCase()}
          </span>
          <div className="text-sm">
            <p className="font-medium">{job.companyName}</p>
            <p className="flex items-center gap-1 text-xs text-muted">
              <PinIcon width={12} height={12} /> {job.location ?? 'Location not specified'}
            </p>
          </div>
        </div>

        {canApply && (
          <div className="mt-5">
            {applied ? (
              <span className="inline-block rounded bg-slate-100 px-5 py-2 text-xs font-medium text-muted">Applied</span>
            ) : (
              !writing && (
                <button onClick={startApply} className="rounded bg-brand px-6 py-2 text-xs font-medium text-white hover:bg-brand-dark">
                  Apply Now
                </button>
              )
            )}
            {writing && (
              <div className="max-w-lg">
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Cover letter (optional)"
                  rows={4}
                  className="w-full rounded border border-line p-3 text-sm outline-none focus:border-brand"
                />
                <div className="mt-2 flex gap-2 text-xs">
                  <button onClick={submit} disabled={busy} className="rounded bg-brand px-5 py-2 text-white hover:bg-brand-dark disabled:opacity-60">
                    {busy ? 'Sending...' : 'Submit application'}
                  </button>
                  <button onClick={() => setWriting(false)} className="rounded border border-line px-5 py-2">Cancel</button>
                </div>
              </div>
            )}
            {message && <p className={`mt-3 text-sm ${message.ok ? 'text-green-700' : 'text-brand'}`}>{message.text}</p>}
          </div>
        )}
      </header>

      <div className="p-6">
        <h3 className="font-semibold">Full internship description</h3>
        <div className="mt-4 space-y-4">
          {job.description && <RichText text={job.description} />}
          {job.requirements && <RichText text={job.requirements} />}
          {!job.description && !job.requirements && <p className="text-sm text-muted">The employer has not added a description yet.</p>}
        </div>
        {job.skills.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {job.skills.map((s) => (
              <span key={s.id} className="rounded-full bg-brand-soft px-3 py-1 text-xs text-brand">{s.name}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
