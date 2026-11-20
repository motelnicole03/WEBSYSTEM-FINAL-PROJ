import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import * as controller from './messages.controller';
import { sendMessageSchema } from './messages.schema';

const router = Router();

// Only the student and the employer on an application can message each other
router.use(authenticate, authorize('student', 'employer'));

router.get('/inbox', controller.inbox);
router.get('/unread-count', controller.unreadCount);
router.get('/', controller.thread); // ?applicationId=&limit=&beforeId=  (marks incoming messages read)
router.post('/', validateBody(sendMessageSchema), controller.send);

export default router;
