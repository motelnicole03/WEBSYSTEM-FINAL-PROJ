import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import Field from '../components/Field';
import { api, downloadFile, errorMessage, fieldErrors } from '../lib/api';

interface ProfileData {
  firstName: string;
  lastName: string;
  studentNumber: string;
  yearLevel: number;
  availability: string | null;
  programId: number;
  programName: string;
  email: string;
  skills: { skillId: number; skillName: string }[];
  profileCompleteness: { percent: number; missing: string[] };
}
interface Program { programId: number; programName: string }
interface Skill { skillId: number; skillName: string }
interface Resume { resumeId: number; fileName: string; fileSize: number; isDefault: boolean; uploadedAt: string }

type Notice = { ok: boolean; text: string } | null;

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProfile = useCallback(() => api.get<ProfileData>('/students/me').then(setProfile), []);
  const loadResumes = useCallback(() => api.get<Resume[]>('/resumes').then(setResumes), []);

  useEffect(() => {
    Promise.all([
      loadProfile(),
      loadResumes(),
      api.get<Program[]>('/lookups/programs').then(setPrograms),
      api.get<Skill[]>('/lookups/skills').then(setAllSkills),
    ]).catch((e) => setLoadError(errorMessage(e)));
  }, [loadProfile, loadResumes]);

  if (loadError) return <p className="p-10 text-center text-brand">{loadError}</p>;
  if (!profile) return <p className="p-10 text-center text-muted">Loading...</p>;

  const { percent, missing } = profile.profileCompleteness;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <div className="mt-4 rounded-lg border border-line p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Profile {percent}% complete</span>
            <span className="text-xs text-muted">{missing.length ? `To do: ${missing.join(', ')}` : 'All set!'}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-brand transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </header>

      <DetailsSection profile={profile} programs={programs} onSaved={setProfile} />
      <SkillsSection profile={profile} allSkills={allSkills} onSaved={setProfile} />
      <ResumesSection resumes={resumes} reload={async () => { await loadResumes(); await loadProfile(); }} />
    </div>
  );
}

// ---------- details ----------

function DetailsSection({ profile, programs, onSaved }: { profile: ProfileData; programs: Program[]; onSaved: (p: ProfileData) => void }) {
  const [form, setForm] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    programId: String(profile.programId),
    yearLevel: String(profile.yearLevel),
    availability: profile.availability ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setNotice(null);
    try {
      const updated = await api.patch<ProfileData>('/students/me', {
        firstName: form.firstName,
        lastName: form.lastName,
        programId: Number(form.programId),
        yearLevel: Number(form.yearLevel),
        availability: form.availability || null, // an empty date clears it
      });
      onSaved(updated);
      setNotice({ ok: true, text: 'Details saved.' });
    } catch (e) {
      setErrors(fieldErrors(e));
      setNotice({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-line p-6">
      <h2 className="font-semibold">Personal details</h2>
      <form onSubmit={save} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
          <Field label="Last name" required value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
          <Field label="Email" value={profile.email} disabled readOnly />
          <Field label="Student number" value={profile.studentNumber} disabled readOnly />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm sm:col-span-1">
            <span className="mb-1 block font-medium">Program</span>
            <select value={form.programId} onChange={set('programId')} className="w-full rounded border border-line bg-white px-3 py-2">
              {programs.map((p) => <option key={p.programId} value={p.programId}>{p.programName}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Year level</span>
            <select value={form.yearLevel} onChange={set('yearLevel')} className="w-full rounded border border-line bg-white px-3 py-2">
              {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <Field label="Available to start" type="date" value={form.availability} onChange={set('availability')} error={errors.availability} />
        </div>
        <SaveRow busy={busy} notice={notice} />
      </form>
    </section>
  );
}

// ---------- skills ----------

function SkillsSection({ profile, allSkills, onSaved }: { profile: ProfileData; allSkills: Skill[]; onSaved: (p: ProfileData) => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set(profile.skills.map((s) => s.skillId)));
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      onSaved(await api.put<ProfileData>('/students/me/skills', { skillIds: [...selected] }));
      setNotice({ ok: true, text: 'Skills saved.' });
    } catch (e) {
      setNotice({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-line p-6">
      <h2 className="font-semibold">Skills</h2>
      <p className="mt-1 text-xs text-muted">Pick the skills you have. Employers can see them on your applications.</p>
      <form onSubmit={save} className="mt-4">
        <div className="flex flex-wrap gap-2">
          {allSkills.map((s) => (
            <button
              type="button"
              key={s.skillId}
              onClick={() => toggle(s.skillId)}
              aria-pressed={selected.has(s.skillId)}
              className={`rounded-full border px-4 py-1.5 text-xs ${selected.has(s.skillId) ? 'border-brand bg-brand text-white' : 'border-line hover:bg-brand-soft'}`}
            >
              {s.skillName}
            </button>
          ))}
        </div>
        <div className="mt-4"><SaveRow busy={busy} notice={notice} /></div>
      </form>
    </section>
  );
}

// ---------- resumes ----------

const formatSize = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

function ResumesSection({ resumes, reload }: { resumes: Resume[]; reload: () => Promise<void> }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, okText?: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      await reload();
      if (okText) setNotice({ ok: true, text: okText });
    } catch (e) {
      setNotice({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets the same file be picked again later
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('isDefault', resumes.length === 0 ? 'true' : 'false'); // the first resume becomes the default
    run(() => api.postForm('/resumes', form), 'Resume uploaded.');
  };

  return (
    <section className="rounded-lg border border-line p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Resumes</h2>
          <p className="mt-1 text-xs text-muted">PDF or DOCX, up to 5 MB. Your default resume is attached when you apply.</p>
        </div>
        <label className={`cursor-pointer rounded bg-brand px-4 py-2 text-xs font-medium text-white hover:bg-brand-dark ${busy ? 'opacity-60' : ''}`}>
          Upload
          <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={upload} disabled={busy} className="hidden" />
        </label>
      </div>

      {notice && <p className={`mt-3 text-sm ${notice.ok ? 'text-green-700' : 'text-brand'}`}>{notice.text}</p>}
      {resumes.length === 0 && <p className="mt-4 text-sm text-muted">No resumes yet.</p>}

      <ul className="mt-4 divide-y divide-line">
        {resumes.map((r) => (
          <li key={r.resumeId} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium">
                {r.fileName}
                {r.isDefault && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-normal text-brand">Default</span>}
              </p>
              <p className="text-xs text-muted">{formatSize(r.fileSize)} &middot; uploaded {new Date(r.uploadedAt).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2 text-xs">
              <button onClick={() => run(() => downloadFile(`/resumes/${r.resumeId}/download`, r.fileName))} className="rounded border border-line px-3 py-1.5 hover:bg-brand-soft">Download</button>
              {!r.isDefault && (
                <button onClick={() => run(() => api.post(`/resumes/${r.resumeId}/default`))} className="rounded border border-line px-3 py-1.5 hover:bg-brand-soft">Make default</button>
              )}
              <button
                onClick={() => window.confirm(`Delete ${r.fileName}?`) && run(() => api.delete(`/resumes/${r.resumeId}`), 'Resume deleted.')}
                className="rounded border border-line px-3 py-1.5 text-muted hover:text-brand"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SaveRow({ busy, notice }: { busy: boolean; notice: Notice }) {
  return (
    <div className="flex items-center gap-4">
      <button disabled={busy} className="rounded bg-brand px-6 py-2 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-60">
        {busy ? 'Saving...' : 'Save'}
      </button>
      {notice && <span className={`text-sm ${notice.ok ? 'text-green-700' : 'text-brand'}`}>{notice.text}</span>}
    </div>
  );
}
