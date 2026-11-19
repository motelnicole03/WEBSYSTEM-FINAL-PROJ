import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import * as controller from './applications.controller';
import { applySchema, updateStatusSchema } from './applications.schema';

const router = Router();

// Every route here needs a login
router.use(authenticate);

const studentOnly = authorize('student');
const employerOnly = authorize('employer');

// Student
router.post('/', studentOnly, validateBody(applySchema), controller.apply);
router.get('/mine', studentOnly, controller.mine);

// Employer (or admin): applicants for one opportunity
router.get('/opportunity/:opportunityId', authorize('employer', 'admin'), controller.forOpportunity);

// One application: visible to its student, its employer, and admins (checked in the service)
router.get('/:id', controller.getOne);
router.get('/:id/files/:fileId', controller.downloadFile);

// Employer moves it along the status flow
router.patch('/:id/status', employerOnly, validateBody(updateStatusSchema), controller.changeStatus);

// Student responds
router.post('/:id/withdraw', studentOnly, controller.withdraw);
router.post('/:id/accept', studentOnly, controller.accept);
router.post('/:id/decline', studentOnly, controller.decline);

export default router;
