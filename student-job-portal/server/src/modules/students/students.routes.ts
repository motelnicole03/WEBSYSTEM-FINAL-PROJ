import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { photoUpload } from '../../middleware/upload';
import { validateBody } from '../../middleware/validate';
import * as controller from './students.controller';
import { setSkillsSchema, updateProfileSchema } from './students.schema';

const router = Router();

const studentOnly = [authenticate, authorize('student')];

router.get('/me', ...studentOnly, controller.getMe);
router.patch('/me', ...studentOnly, validateBody(updateProfileSchema), controller.updateMe);
router.put('/me/skills', ...studentOnly, validateBody(setSkillsSchema), controller.setSkills);
router.post('/me/photo', ...studentOnly, photoUpload, controller.uploadPhoto); // multipart form: photo
router.delete('/me/photo', ...studentOnly, controller.removePhoto);

// Employer: a student's profile, only for students who applied to that employer (kept last so "me" is not read as an id)
router.get('/:id', authenticate, authorize('employer'), controller.getOneForEmployer);

export default router;