import { sendCrmEmailViaEmailJS } from './emailJsCrmSend.js';
import { userQueries } from './database/database.js';
import { sendWhatsAppDigits } from './whatsappOutbound.js';
import { resolvePublicFrontendBase } from './publicFrontendUrl.js';

export function testDriveSurveyFrontendBase() {
  return resolvePublicFrontendBase(process.env);
}

export function buildTestDriveSurveyInviteEmail({ firstName, propertyTitle, surveyUrl }) {
  const title = String(propertyTitle || 'объект').trim() || 'объект';
  const hello = firstName ? `Здравствуйте, ${firstName}!` : 'Здравствуйте!';
  const subject = 'Пройдите опрос по тест-драйву';
  const body = `${hello}

Расскажите, что понравилось в «${title}», планируете ли покупку и оцените объект звёздами — это займёт пару минут.

Следующий шаг: откройте опрос и поделитесь впечатлениями — это поможет улучшить объекты.

Пройти опрос:
${surveyUrl}

С уважением, Sellyourbrick`;
  return { subject, body };
}

export function buildTestDriveSurveyInviteWhatsApp({ firstName, propertyTitle, surveyUrl }) {
  const title = String(propertyTitle || 'объект').trim() || 'объект';
  const hello = firstName ? `Здравствуйте, ${firstName}! ` : '';
  return `${hello}Пройдите опрос по тест-драйву «${title}». Расскажите, что понравилось, планируете ли покупку и оцените объект звёздами — это займёт пару минут.

Пройти опрос: ${surveyUrl}`;
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
