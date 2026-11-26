import { query } from '../../config/db';
import { UpdateEmployerInput } from './employers.schema';

export async function findProfileByUserId(userId: number) {
  const rows = await query(
    `SELECT e.employer_id, e.company_name, e.industry, e.address, e.contact_person,
            e.verification_status, e.about, e.website, e.company_size, e.phone, e.logo_path,
            u.email
       FROM employers e
       JOIN users u ON u.user_id = e.user_id
      WHERE e.user_id = $1`,
    [userId],
  );
  return rows[0] as (Record<string, unknown> & { employer_id: number }) | undefined;
}

/** The company's newest open postings, for the "Open positions" card. */
export async function listOpenPositions(employerId: number) {
  return query(
    `SELECT opportunity_id, title, type, location
       FROM opportunities
      WHERE employer_id = $1 AND status = 'open'
      ORDER BY created_at DESC
      LIMIT 5`,
    [employerId],
  );
}

export async function updateProfile(employerId: number, input: UpdateEmployerInput) {
  // Column names come from this fixed map, never from user input; values go through $n params.
  const columns = {
    companyName: 'company_name',
    industry: 'industry',
    address: 'address',
    contactPerson: 'contact_person',
    phone: 'phone',
    website: 'website',
    about: 'about',
    companySize: 'company_size',
  } as const;

  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, column] of Object.entries(columns)) {
    const value = input[key as keyof UpdateEmployerInput];
    if (value === undefined) continue; // null is allowed: it clears the field
    params.push(value === '' ? null : value);
    sets.push(`${column} = $${params.length}`);
  }
  params.push(employerId);
  await query(`UPDATE employers SET ${sets.join(', ')} WHERE employer_id = $${params.length}`, params);
}

/** Saves the logo file name (or null to remove it). */
export async function setLogo(employerId: number, fileName: string | null) {
  await query('UPDATE employers SET logo_path = $1 WHERE employer_id = $2', [fileName, employerId]);
}