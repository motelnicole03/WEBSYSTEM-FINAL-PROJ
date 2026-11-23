import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusPill from '../components/StatusPill';
import { useChat } from '../context/ChatContext';
import { api, errorMessage } from '../lib/api';

interface ApplicationRow {
  applicationId: number;
  currentStatus: string;
  submittedAt: string;
  opportunityId: number;
  title: string;
  type: string;
  companyName: string;
}

interface Interview {
  interviewId: number;
  applicationId: number;
  schedule: string;
  mode: string;
  linkOrVenue: string | null;
  studentResponse: 'pending' | 'confirmed' | 'declined';
  opportunityTitle: string;
  companyName: string;
}

const ACTIVE = ['submitted', 'under_review', 'shortlisted', 'interview', 'offered'];

export default function MyApplications() {
  const { openChat } = useChat();
  const [rows, setRows] = useState<ApplicationRow[] | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active'>('all');

  const load = useCallback(async () => {
    try {
      const [apps, upcoming] = await Promise.all([
        api.get<ApplicationRow[]>('/applications/mine'),
        api.get<Interview[]>('/interviews?upcoming=true'),
      ]);
      setRows(apps);
      setInterviews(upcoming);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Runs an action, then reloads the lists. */
  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const withdraw = (a: ApplicationRow) => {
    if (window.confirm(`Withdraw your application to "${a.title}"?`)) {
      act(() => api.post(`/applications/${a.applicationId}/withdraw`));
    }
  };

  const visible = rows?.filter((r) => filter === 'all' || ACTIVE.includes(r.currentStatus));

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold">My Applications</h1>
      {error && <p className="mt-4 rounded bg-brand-soft px-4 py-2 text-sm text-brand">{error}</p>}

      {interviews.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold">Upcoming interviews</h2>
          <div className="mt-3 space-y-3">
            {interviews.map((i) => (
              <div key={i.interviewId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                <div className="text-sm">
                  <p className="font-medium">{i.opportunityTitle} <span className="font-normal text-muted">at {i.companyName}</span></p>
                  <p className="mt-0.5 text-xs text-slate-700">
                    {new Date(i.schedule).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} &middot; {i.mode}
                    {i.linkOrVenue && <> &middot; {i.linkOrVenue}</>}
                  </p>
                </div>
                {i.studentResponse === 'pending' ? (
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => act(() => api.post(`/interviews/${i.interviewId}/respond`, { response: 'confirmed' }))} className="rounded bg-brand px-4 py-1.5 text-white hover:bg-brand-dark">Confirm</button>
                    <button onClick={() => act(() => api.post(`/interviews/${i.interviewId}/respond`, { response: 'declined' }))} className="rounded border border-line bg-white px-4 py-1.5">Decline</button>
                  </div>
                ) : (
                  <span className="text-xs font-medium capitalize text-slate-700">{i.studentResponse}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 flex gap-2 text-xs">
        {(['all', 'active'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 ${filter === f ? 'bg-brand text-white' : 'border border-line hover:bg-brand-soft'}`}>
            {f === 'all' ? 'All' : 'In progress'}
          </button>
        ))}
      </div>

      {rows === null && !error && <p className="mt-6 text-sm text-muted">Loading...</p>}
      {visible?.length === 0 && (
        <p className="mt-6 text-sm text-muted">
          Nothing here yet. <Link to="/jobs" className="text-brand underline">Find an internship</Link> to apply.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {visible?.map((a) => (
          <article key={a.applicationId} className="rounded-lg border border-line bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link to={`/jobs/${a.opportunityId}`} className="font-medium hover:text-brand">{a.title}</Link>
                <p className="text-xs text-muted">
                  {a.companyName} &middot; Applied {new Date(a.submittedAt).toLocaleDateString()}
                </p>
              </div>
              <StatusPill status={a.currentStatus} />
            </div>

            {a.currentStatus === 'offered' && (
              <p className="mt-3 rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                You have an offer. Accept it to be marked as hired, or decline it.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => openChat({ applicationId: a.applicationId, name: a.companyName, subtitle: a.title })}
                className="rounded border border-line px-4 py-1.5 text-brand hover:bg-brand-soft"
              >
                Message
              </button>
              {a.currentStatus === 'offered' && (
                <>
                  <button onClick={() => act(() => api.post(`/applications/${a.applicationId}/accept`))} className="rounded bg-brand px-4 py-1.5 text-white hover:bg-brand-dark">Accept offer</button>
                  <button
                    onClick={() => window.confirm('Decline this offer?') && act(() => api.post(`/applications/${a.applicationId}/decline`))}
                    className="rounded border border-line px-4 py-1.5"
                  >
                    Decline
                  </button>
                </>
              )}
              {ACTIVE.includes(a.currentStatus) && a.currentStatus !== 'offered' && (
                <button onClick={() => withdraw(a)} className="rounded border border-line px-4 py-1.5 text-muted hover:text-brand">Withdraw</button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
