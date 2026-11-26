import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { optionalAuthenticate } from '../../middleware/optionalAuthenticate';
import { validateBody } from '../../middleware/validate';
import * as controller from './ratings.controller';
import { rateSchema } from './ratings.schema';

const router = Router();

// Public: the Company Reviews page
router.get('/companies', controller.listCompanies);

// Public summary. A signed-in student also learns whether they can rate it and what they gave.
router.get('/companies/:employerId', optionalAuthenticate, controller.getCompany);

// Students only: give or change a rating (1 to 5)
router.put('/companies/:employerId', authenticate, authorize('student'), validateBody(rateSchema), controller.rate);

export default router;