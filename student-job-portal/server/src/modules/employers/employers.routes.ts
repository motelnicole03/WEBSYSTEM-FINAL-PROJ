import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { optionalAuthenticate } from '../../middleware/optionalAuthenticate';
import { photoUpload } from '../../middleware/upload';
import { validateBody } from '../../middleware/validate';
import * as controller from './employers.controller';
import { updateEmployerSchema } from './employers.schema';

const router = Router();

const employerOnly = [authenticate, authorize('employer')];

// The employer's own profile. These fixed paths must come before '/:id' so "me" is not read as an id.
router.get('/me', ...employerOnly, controller.getMe);
router.patch('/me', ...employerOnly, validateBody(updateEmployerSchema), controller.updateMe);
router.post('/me/logo', ...employerOnly, photoUpload, controller.uploadLogo); // multipart form: photo
router.delete('/me/logo', ...employerOnly, controller.removeLogo);

// Public: the company page students open from a job post (contact details only for logged-in visitors)
router.get('/:id', optionalAuthenticate, controller.getPublic);

export default router;