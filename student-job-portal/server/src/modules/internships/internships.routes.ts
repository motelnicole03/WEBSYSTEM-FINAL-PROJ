import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import * as controller from './internships.controller';
import { issueCertificateSchema, removeSchema } from './internships.schema';

const router = Router();
router.use(authenticate);

const employerOnly = authorize('employer');

// Employer: their interns (hired internship/OJT applicants) and what they can do with them
router.get('/', employerOnly, controller.list); // ?status=ongoing|completed|removed
router.post('/:applicationId/complete', employerOnly, controller.complete);
router.post('/:applicationId/remove', employerOnly, validateBody(removeSchema), controller.remove);
router.post('/:applicationId/certificate', employerOnly, validateBody(issueCertificateSchema), controller.issueCertificate);

// The intern, their employer and admins can open the certificate (checked in the service)
router.get('/:applicationId/certificate', controller.getCertificate);

export default router;
