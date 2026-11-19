import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import * as controller from './notifications.controller';

const router = Router();

// Every user (student, employer, admin) sees only their own notifications
router.use(authenticate);

router.get('/', controller.list); // ?unread=true&limit=20
router.get('/unread-count', controller.unreadCount);
router.post('/read-all', controller.markAllRead);
router.post('/:id/read', controller.markRead);

export default router;
