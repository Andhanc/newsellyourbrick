import { sendCrmEmailViaEmailJS } from './emailJsCrmSend.js';
import { sendWhatsAppDigits } from './whatsappOutbound.js';
import { resolvePublicFrontendBase } from './publicFrontendUrl.js';

export function buildVerificationRejectedCopy(rejectionReason, { siteUrl } = {}) {
  const reason =
    rejectionReason && String(rejectionReason).trim() ? String(rejectionReason).trim() : null;
  const base = String(siteUrl || resolvePublicFrontendBase()).replace(/\/+$/, '');
  const subject = 'Верификация отклонена — SellYourBrick';

  const reasonLine = reason
    ? `Ваша верификация была отклонена администратором. Причина: ${reason}.`
    : 'Ваша верификация была отклонена администратором.';

  const emailBody = [
    'Здравствуйте!',
    '',
    reasonLine,
    '',
    'Пожалуйста, пройдите верификацию повторно на сайте: загрузите фото паспорта, селфи и селфи с паспортом.',
    'После повторной отправки документы снова попадут на проверку в админку.',
    '',
    `Открыть сайт: ${base}`,
    '',
    'SellYourBrick',
  ].join('\n');

  const whatsappBody = reason
    ? `❌ Верификация отклонена\n\nПричина: ${reason}\n\nПройдите верификацию повторно на сайте — загрузите паспорт, селфи и селфи с паспортом. После отправки документы снова попадут на проверку.\n\n${base}`
    : `❌ Верификация отклонена\n\nПройдите верификацию повторно на сайте — загрузите паспорт, селфи и селфи с паспортом. После отправки документы снова попадут на проверку.\n\n${base}`;

  return { subject, emailBody, whatsappBody, reason };
}

/**
 * Email + WhatsApp после отклонения верификации. Ошибки каналов логируются, не пробрасываются.
 */
export async function sendVerificationRejectedExternalNotifications(user, rejectionReason) {
  if (!user) return { email: false, whatsapp: false };

  const { subject, emailBody, whatsappBody } = buildVerificationRejectedCopy(rejectionReason);
  const result = { email: false, whatsapp: false };

  const email = user.email && String(user.email).trim();
  if (email) {
    try {
      await sendCrmEmailViaEmailJS(email, subject, emailBody);
      result.email = true;
      console.log(`✅ verification_rejected email → ${email}`);
    } catch (e) {
      console.warn('⚠️ verification_rejected email:', e.message);
    }
  }

  const phoneDigits = user.phone_number && String(user.phone_number).replace(/\D/g, '');
  if (phoneDigits) {
    try {
      const wa = await sendWhatsAppDigits(phoneDigits, whatsappBody);
      result.whatsapp = wa?.ok === true;
      if (result.whatsapp) {
        console.log(`✅ verification_rejected WhatsApp → ${phoneDigits}`);
      } else if (wa?.error) {
        console.warn('⚠️ verification_rejected WhatsApp:', wa.error);
      }
    } catch (e) {
      console.warn('⚠️ verification_rejected WhatsApp:', e.message);
    }
  }

  return result;
}
