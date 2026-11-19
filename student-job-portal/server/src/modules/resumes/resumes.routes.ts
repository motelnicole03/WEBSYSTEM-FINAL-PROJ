import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { resumeUpload } from '../../middleware/upload';
import * as controller from './resumes.controller';

const router = Router();

router.use(authenticate, authorize('student'));

router.get('/', controller.list);
router.post('/', resumeUpload, controller.upload); // multipart form: file, isDefault
router.get('/:id/download', controller.download);
router.post('/:id/default', controller.makeDefault);
router.delete('/:id', controller.remove);

export default router;
