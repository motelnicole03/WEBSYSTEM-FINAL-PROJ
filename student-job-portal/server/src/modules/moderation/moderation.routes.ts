import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import * as controller from './moderation.controller';
import { reasonSchema } from './moderation.schema';

const router = Router();

// Admin only
router.use(authenticate, authorize('admin'));

router.get('/search', controller.search); // ?q=name, email, student number or company
router.get('/restricted', controller.listRestricted);
router.post('/accounts/:userId/block', validateBody(reasonSchema), controller.block);
router.post('/accounts/:userId/remove', validateBody(reasonSchema), controller.remove);
router.post('/accounts/:userId/restore', controller.restore);
router.get('/activity', controller.activity); // ?type=all|company|student|job&days=7|30|90|all

export default router;