import { sendCrmEmailViaEmailJS } from './emailJsCrmSend.js';
import { userQueries } from './database/database.js';
import { sendWhatsAppDigits } from './whatsappOutbound.js';
import { resolvePublicFrontendBase } from './publicFrontendUrl.js';

export function testDriveSurveyFrontendBase() {
  return resolvePublicFrontendBase(process.env);
}

export function buildTestDriveSurveyInviteEmail({ firstName, propertyTitle, surveyUrl }) {
  const title = String(propertyTitle || 'property').trim() || 'property';
  const hello = firstName ? `Hello, ${firstName}!` : 'Hello!';
  const subject = 'Complete the test-drive survey';
  const body = `${hello}

Tell us what you liked about “${title}”, whether you plan to buy, and rate the listing — it only takes a couple of minutes.

Next step: open the survey and share your feedback — it helps us improve the listings.

Open the survey:
${surveyUrl}

Best regards, Sellyourbrick`;
  return { subject, body };
}

export function buildTestDriveSurveyInviteWhatsApp({ firstName, propertyTitle, surveyUrl }) {
  const title = String(propertyTitle || 'property').trim() || 'property';
  const hello = firstName ? `Hello, ${firstName}! ` : '';
  return `${hello}Complete the test-drive survey for “${title}”. Tell us what you liked, whether you plan to buy, and rate the listing — it only takes a couple of minutes.

Open the survey: ${surveyUrl}`;
}

function surveyUrlForToken(surveyToken) {
  const tok = String(surveyToken || '').trim();
  return `${testDriveSurveyFrontendBase()}/test-drive/survey/${encodeURIComponent(tok)}`;
}

async function resolveSurveyUser({ userId, user }) {
  return user || (userId ? await userQueries.getById(userId) : null);
}

export async function sendTestDriveSurveyInviteEmail({
  userId,
  user,
  propertyTitle,
  surveyToken,
}) {
  const tok = String(surveyToken || '').trim();
  if (!tok) return { ok: false, error: 'no_token' };

  const profile = await resolveSurveyUser({ userId, user });
  const email = profile?.email && String(profile.email).trim();
  if (!email) return { ok: false, error: 'no_email' };

  const { subject, body } = buildTestDriveSurveyInviteEmail({
    firstName: profile?.first_name,
    propertyTitle,
    surveyUrl: surveyUrlForToken(tok),
  });
  await sendCrmEmailViaEmailJS(email, subject, body);
  return { ok: true, email };
}

export async function sendTestDriveSurveyInviteWhatsApp({
  userId,
  user,
  propertyTitle,
  surveyToken,
}) {
  const tok = String(surveyToken || '').trim();
  if (!tok) return { ok: false, error: 'no_token' };

  const profile = await resolveSurveyUser({ userId, user });
  const digits = String(profile?.phone_number || '').replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'no_phone' };

  const text = buildTestDriveSurveyInviteWhatsApp({
    firstName: profile?.first_name,
    propertyTitle,
    surveyUrl: surveyUrlForToken(tok),
  });
  const wa = await sendWhatsAppDigits(digits, text);
  if (!wa?.ok) return { ok: false, error: wa?.error || 'wa_failed' };
  return { ok: true };
}
