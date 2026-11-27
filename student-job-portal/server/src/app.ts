import path from 'node:path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { AVATAR_DIR } from './config/paths';
import { errorHandler, notFound } from './middleware/errorHandler';
import adminRoutes from './modules/admin/admin.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import applicationRoutes from './modules/applications/applications.routes';
import authRoutes from './modules/auth/auth.routes';
import employerRoutes from './modules/employers/employers.routes';
import internshipRoutes from './modules/internships/internships.routes';
import interviewRoutes from './modules/interviews/interviews.routes';
import lookupRoutes from './modules/lookups/lookups.routes';
import messageRoutes from './modules/messages/messages.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import opportunityRoutes from './modules/opportunities/opportunities.routes';
import resumeRoutes from './modules/resumes/resumes.routes';
import moderationRoutes from './modules/moderation/moderation.routes';
import ratingRoutes from './modules/ratings/ratings.routes';
import settingsRoutes from './modules/settings/settings.routes';
import studentRoutes from './modules/students/students.routes';

export const app = express();

// helmet's default policy already blocks inline scripts. The one change: no "upgrade-insecure-requests",
// which makes Safari try https on http://localhost and break the page.
app.use(
  helmet({
    contentSecurityPolicy: { useDefaults: true, directives: { 'upgrade-insecure-requests': null } },
  }),
);
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Mount each module here as you build it:
app.use('/api/auth', authRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/employers', employerRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/lookups', lookupRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/ratings', ratingRoutes);
// Profile photos only (random file names). Resumes stay private and are only served through /api/resumes.
app.use('/avatars', express.static(AVATAR_DIR, { maxAge: '1d' }));
// The website (HTML, CSS, JS) is served from server/public, on the same address as the API
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(notFound);
app.use(errorHandler);
