import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import * as controller from './settings.controller';
import { changePasswordSchema, notificationPrefsSchema, programSchema, reportSchema, skillSchema } from './settings.schema';
const router = Router();

// Everything under /api/settings needs a signed-in user
router.use(authenticate);

// Any role: change my own password, and send or list my own problem reports
router.post('/password', validateBody(changePasswordSchema), controller.changePassword);
router.post('/reports', validateBody(reportSchema), controller.createReport);
router.get('/reports', controller.listMyReports);
router.get('/notifications', controller.getNotificationPrefs);
router.put('/notifications', validateBody(notificationPrefsSchema), controller.updateNotificationPrefs);

// Admin only: manage the programs and skills that people choose from
router.get('/programs', authorize('admin'), controller.listPrograms);
router.post('/programs', authorize('admin'), validateBody(programSchema), controller.addProgram);
router.delete('/programs/:id', authorize('admin'), controller.removeProgram);
router.get('/skills', authorize('admin'), controller.listSkills);
router.post('/skills', authorize('admin'), validateBody(skillSchema), controller.addSkill);
router.delete('/skills/:id', authorize('admin'), controller.removeSkill);

export default router;