import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import * as controller from './students.controller';
import { setSkillsSchema, updateProfileSchema } from './students.schema';

const router = Router();

router.use(authenticate, authorize('student'));

router.get('/me', controller.getMe);
router.patch('/me', validateBody(updateProfileSchema), controller.updateMe);
router.put('/me/skills', validateBody(setSkillsSchema), controller.setSkills);

export default router;
