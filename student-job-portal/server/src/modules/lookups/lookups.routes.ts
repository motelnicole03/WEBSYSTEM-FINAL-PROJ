import { Router } from 'express';
import { query } from '../../config/db';
import { asyncHandler } from '../../utils/asyncHandler';
import { camelize } from '../../utils/camelize';

// Public lists the frontend needs for dropdowns (registration form, profile, filters).
const router = Router();

router.get(
  '/programs',
  asyncHandler(async (_req, res) => {
    res.json(camelize(await query('SELECT program_id, program_name FROM programs ORDER BY program_name')));
  }),
);

router.get(
  '/skills',
  asyncHandler(async (_req, res) => {
    res.json(camelize(await query('SELECT skill_id, skill_name FROM skills ORDER BY skill_name')));
  }),
);

export default router;
