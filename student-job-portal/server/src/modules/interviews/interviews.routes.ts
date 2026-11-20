import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import * as controller from './interviews.controller';
import { createInterviewSchema, rescheduleSchema, respondSchema, resultSchema } from './interviews.schema';

const router = Router();

router.use(authenticate);

// Everyone involved: ?applicationId=  or  ?upcoming=true  (the caller's own calendar)
router.get('/', controller.list);
router.get('/:id', controller.getOne);

// Employer
router.post('/', authorize('employer'), validateBody(createInterviewSchema), controller.schedule);
router.patch('/:id', authorize('employer'), validateBody(rescheduleSchema), controller.reschedule);
router.post('/:id/result', authorize('employer'), validateBody(resultSchema), controller.setResult);

// Student
router.post('/:id/respond', authorize('student'), validateBody(respondSchema), controller.respond);

export default router;
