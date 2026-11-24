import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as controller from './analytics.controller';

const router = Router();

router.use(authenticate);

// Admin dashboard: ?from=YYYY-MM-DD&to=YYYY-MM-DD (default: last 90 days)
router.get('/admin/overview', authorize('admin'), controller.adminOverview);
router.get('/admin/trends', authorize('admin'), controller.adminTrends); // &interval=week|month
router.get('/admin/breakdowns', authorize('admin'), controller.adminBreakdowns);
router.get('/admin/activity', authorize('admin'), controller.adminActivity); // ?limit=8
router.get('/admin/reports/:name', authorize('admin'), controller.adminReport); // opportunities|applications|placements

// Employer dashboard: their own postings and applicants only
router.get('/employer/overview', authorize('employer'), controller.employerOverview);
router.get('/employer/funnel', authorize('employer'), controller.employerFunnel); // &opportunityId=

// Student dashboard
router.get('/student/overview', authorize('student'), controller.studentOverview);

export default router;
