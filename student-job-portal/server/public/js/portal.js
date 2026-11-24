// Small pieces shared by the employer and admin pages.
import { html } from './ui.js';

export const pageTitle = (title, subtitle) => html`<h1>${title}</h1>${subtitle ? html`<p class="sub">${subtitle}</p>` : ''}`;

/** Shown to employers an admin has not verified yet. */
export function verifyBanner(user) {
  const status = user.employer?.verificationStatus;
  if (!status || status === 'verified') return '';
  return html`<p class="notice" style="margin-top:1rem">${status === 'pending'
    ? 'Your company is waiting for admin verification. You can prepare drafts, but you cannot post until it is verified.'
    : 'Your company verification was rejected. Please contact the school administrator.'}</p>`;
}

export const STAGE_LABEL = {
  submitted: 'Submitted', under_review: 'Under review', shortlisted: 'Shortlisted',
  interview: 'Interview', offered: 'Offered', hired: 'Hired',
};
