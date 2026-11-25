import { logActivity } from '../../utils/activity';
import { camelize } from '../../utils/camelize';
import { HttpError } from '../../utils/httpError';
import { TokenPayload } from '../../utils/jwt';
import * as repo from './admin.repository';
export async function listEmployers(status: repo.VerificationStatus) {
  return camelize(await repo.listEmployersByStatus(status));
}

export async function setVerification(admin: TokenPayload, employerId: number, status: 'verified' | 'rejected') {
  const employer = await repo.setEmployerVerification(employerId, status);
  if (!employer) throw HttpError.notFound('Employer not found');
  await logActivity(admin.userId, status === 'verified' ? 'approved' : 'rejected', 'company', employerId, String(employer.company_name));
  return camelize(employer);
}
