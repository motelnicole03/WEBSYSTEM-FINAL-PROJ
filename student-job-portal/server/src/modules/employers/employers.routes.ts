import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { photoUpload } from '../../middleware/upload';
import { validateBody } from '../../middleware/validate';
import * as controller from './employers.controller';
import { updateEmployerSchema } from './employers.schema';

const router = Router();

router.use(authenticate, authorize('employer'));

router.get('/me', controller.getMe);
router.patch('/me', validateBody(updateEmployerSchema), controller.updateMe);
router.post('/me/logo', photoUpload, controller.uploadLogo); // multipart form: photo
router.delete('/me/logo', controller.removeLogo);

export default router;