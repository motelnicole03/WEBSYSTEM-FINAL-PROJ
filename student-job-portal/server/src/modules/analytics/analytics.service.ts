import { camelize } from '../../utils/camelize';
import { toCsv, CsvColumn } from '../../utils/csv';
import { HttpError } from '../../utils/httpError';
import { TokenPayload } from '../../utils/jwt';
import * as repo from './analytics.repository';
import { RangeQuery, ReportName, TrendInterval } from './analytics.schema';

// ---------- helpers ----------

const DAY_MS = 86_400_000;

/** Percentage with one decimal, or null when there is nothing to divide by. */
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);
const ratio = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 10) / 10 : null);
const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

function parseDay(value: string): Date {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw HttpError.badRequest(`Invalid date: ${value}`);
  return date;
}

/** Turns ?from=&to= into [from, to). Defaults to the last 90 days. "to" includes the whole day. */
export function resolveRange(q: RangeQuery) {
  let to = new Date();
  if (q.to) to = new Date(parseDay(q.to).getTime() + DAY_MS);
  const from = q.from ? parseDay(q.from) : new Date(to.getTime() - 90 * DAY_MS);
  if (from.getTime() >= to.getTime()) throw HttpError.badRequest('"from" must be before "to"');
  return { from, to };
}

const period = ({ from, to }: { from: Date; to: Date }) => ({
  from: from.toISOString(),
  to: to.toISOString(), // exclusive
});

// ---------- admin ----------

export async function adminOverview(q: RangeQuery) {
  const range = resolveRange(q);
  const k = await repo.adminKpis(range.from, range.to);

  return {
    period: period(range),
    students: {
      total: k.total_students,
      newInPeriod: k.new_students,
      profileCompletionPercent: pct(k.students_with_resume, k.total_students), // has at least one resume
    },
    employers: { verified: k.verified_employers, pendingVerification: k.pending_employers },
    opportunities: {
      open: k.open_opportunities,
      pendingApproval: k.pending_opportunities,
      closedWithoutHires: k.closed_without_hires,
    },
    applications: {
      total: k.applications,
      applicants: k.applicants,
      views: k.views,
      applicationRatePercent: pct(k.applications, k.views), // applications per view
      shortlistRatePercent: pct(k.shortlisted, k.applications),
      perOpenVacancy: ratio(k.applications_to_open, k.open_slots),
    },
    placements: {
      hires: k.hires,
      placedStudents: k.placed_students,
      placementRatePercent: pct(k.placed_students, k.applicants), // placed students / students who applied
    },
    speed: {
      avgDaysToHire: round1(k.avg_days_to_hire),
      avgDaysToFirstResponse: round1(k.avg_days_to_first_response),
    },
  };
}

export async function adminTrends(q: RangeQuery, interval: TrendInterval) {
  const range = resolveRange(q);
  const [students, applications, hires, opportunities] = await repo.trendSeries(interval, range.from, range.to);

  const rows = new Map<string, { period: string; newStudents: number; applications: number; hires: number; newOpportunities: number }>();
  const row = (key: string) => {
    if (!rows.has(key)) rows.set(key, { period: key, newStudents: 0, applications: 0, hires: 0, newOpportunities: 0 });
    return rows.get(key)!;
  };
  students.forEach((r) => (row(r.period).newStudents = r.count));
  applications.forEach((r) => (row(r.period).applications = r.count));
  hires.forEach((r) => (row(r.period).hires = r.count));
  opportunities.forEach((r) => (row(r.period).newOpportunities = r.count));

  return {
    period: period(range),
    interval,
    series: [...rows.values()].sort((a, b) => a.period.localeCompare(b.period)),
  };
}

export async function adminBreakdowns(q: RangeQuery) {
  const range = resolveRange(q);
  const [byType, byIndustry, byProgram, employers, skills, searches] = await Promise.all([
    repo.opportunitiesByType(),
    repo.opportunitiesByIndustry(),
    repo.placementsByProgram(range.from, range.to),
    repo.topEmployers(range.from, range.to),
    repo.skillDemand(),
    repo.topSearches(range.from, range.to),
  ]);

  const programs = (byProgram as { program_name: string; students: number; applicants: number; placed: number }[]).map(
    (p) => ({
      programName: p.program_name,
      students: p.students,
      applicants: p.applicants,
      placed: p.placed,
      placementRatePercent: pct(p.placed, p.applicants),
    }),
  );

  const employerRows = (employers as { avg_response_days: number | null }[]).map((e) => ({
    ...e,
    avg_response_days: round1(e.avg_response_days),
  }));

  return {
    period: period(range),
    opportunitiesByType: camelize(byType),
    opportunitiesByIndustry: camelize(byIndustry),
    placementsByProgram: programs,
    topEmployers: camelize(employerRows),
    skillDemand: camelize(skills), // open_demand vs students_with_skill
    topSearches: camelize(searches),
  };
}

export async function adminActivity(limit: number) {
  return camelize(await repo.recentActivity(limit));
}

// ---------- CSV reports ----------

const REPORT_COLUMNS: Record<ReportName, CsvColumn[]> = {
  opportunities: [
    { key: 'opportunity_id', header: 'ID' }, { key: 'title', header: 'Title' },
    { key: 'company_name', header: 'Company' }, { key: 'type', header: 'Type' },
    { key: 'status', header: 'Status' }, { key: 'location', header: 'Location' },
    { key: 'work_setup', header: 'Work setup' }, { key: 'slots', header: 'Slots' },
    { key: 'deadline', header: 'Deadline' }, { key: 'created_at', header: 'Created' },
    { key: 'views', header: 'Views' }, { key: 'applications', header: 'Applications' },
    { key: 'hires', header: 'Hires' },
  ],
  applications: [
    { key: 'application_id', header: 'ID' }, { key: 'opportunity', header: 'Opportunity' },
    { key: 'company_name', header: 'Company' }, { key: 'student', header: 'Student' },
    { key: 'student_number', header: 'Student number' }, { key: 'program_name', header: 'Program' },
    { key: 'current_status', header: 'Status' }, { key: 'submitted_at', header: 'Submitted' },
  ],
  placements: [
    { key: 'student', header: 'Student' }, { key: 'student_number', header: 'Student number' },
    { key: 'program_name', header: 'Program' }, { key: 'company_name', header: 'Company' },
    { key: 'opportunity', header: 'Opportunity' }, { key: 'type', header: 'Type' },
    { key: 'hired_at', header: 'Hired on' }, { key: 'days_to_hire', header: 'Days to hire' },
  ],
};

export async function buildReport(name: ReportName, q: RangeQuery) {
  const range = resolveRange(q);
  const rows = await repo.reportRows(name, range.from, range.to);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  return {
    fileName: `${name}-report-${day(range.from)}-to-${day(new Date(range.to.getTime() - DAY_MS))}.csv`,
    csv: toCsv(rows, REPORT_COLUMNS[name]),
  };
}

// ---------- employer ----------

async function requireEmployerId(user: TokenPayload) {
  const id = await repo.findEmployerIdByUserId(user.userId);
  if (!id) throw HttpError.forbidden('Employer profile not found');
  return id;
}

export async function employerOverview(user: TokenPayload) {
  const employerId = await requireEmployerId(user);
  const [postings, byProgram, speed] = await Promise.all([
    repo.employerPostings(employerId),
    repo.employerApplicantsByProgram(employerId),
    repo.employerSpeed(employerId),
  ]);

  const rows = postings as { views: number; applications: number; hires: number }[];
  const sum = (key: 'views' | 'applications' | 'hires') => rows.reduce((total, r) => total + r[key], 0);

  return {
    totals: {
      postings: rows.length,
      views: sum('views'),
      applications: sum('applications'),
      hires: sum('hires'),
      avgDaysToHire: round1(speed.avg_days_to_hire),
      avgDaysToFirstResponse: round1(speed.avg_days_to_first_response),
    },
    postings: camelize(postings),
    applicantsByProgram: camelize(byProgram),
  };
}

const FUNNEL_STAGES = ['submitted', 'under_review', 'shortlisted', 'interview', 'offered', 'hired'];
const EXIT_STATUSES = ['rejected', 'declined', 'withdrawn'];

export async function employerFunnel(user: TokenPayload, q: RangeQuery, opportunityId?: number) {
  const employerId = await requireEmployerId(user);
  const range = resolveRange(q);
  const rows = await repo.employerFunnel(employerId, range.from, range.to, opportunityId);

  const reached = new Map(rows.map((r) => [r.status, r.reached]));
  const submitted = reached.get('submitted') ?? 0;

  return {
    period: period(range),
    opportunityId: opportunityId ?? null,
    // Each count = applications that reached the stage at some point
    funnel: FUNNEL_STAGES.map((stage) => {
      const count = reached.get(stage) ?? 0;
      return { stage, count, percentOfSubmitted: pct(count, submitted) };
    }),
    exits: EXIT_STATUSES.map((status) => ({ status, count: reached.get(status) ?? 0 })),
  };
}

// ---------- student ----------

export async function studentOverview(user: TokenPayload) {
  const data = await repo.studentOverview(user.userId);
  if (!data) throw HttpError.forbidden('Student profile not found');

  const byStatus = Object.fromEntries(data.byStatus.map((r) => [r.status, r.count]));
  const total = data.byStatus.reduce((sum, r) => sum + r.count, 0);

  // Profile completeness: three checks, each worth a third
  const checks = [
    { item: 'Upload a resume', done: data.resumes > 0 },
    { item: 'Add your skills', done: data.skills > 0 },
    { item: 'Set your availability date', done: data.hasAvailability },
  ];

  return {
    applications: { total, byStatus },
    savedOpportunities: data.saved,
    resumes: data.resumes,
    profileCompleteness: {
      percent: Math.round((checks.filter((c) => c.done).length / checks.length) * 100),
      missing: checks.filter((c) => !c.done).map((c) => c.item),
    },
  };
}
