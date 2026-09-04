import { sendCrmEmailViaEmailJS } from './emailJsCrmSend.js';
import { sendWhatsAppDigits } from './whatsappOutbound.js';
import { resolvePublicFrontendBase } from './publicFrontendUrl.js';

export function buildVerificationApprovedCopy({ siteUrl } = {}) {
  const base = String(siteUrl || resolvePublicFrontendBase()).replace(/\/+$/, '');
  const subject = 'Верификация пройдена — SellYourBrick';

  const emailBody = [
    'Здравствуйте!',
    '',
    'Ваши документы одобрены администратором. Верификация пройдена.',
    'Теперь вы можете делать ставки на аукционах и пользоваться всеми функциями покупателя.',
    '',
    `Открыть сайт: ${base}`,
    '',
    'SellYourBrick',
  ].join('\n');

  const whatsappBody = `🎉 Верификация пройдена!\n\nДокументы одобрены. Теперь вы можете делать ставки на аукционах и пользоваться всеми функциями покупателя.\n\n${base}`;

  return { subject, emailBody, whatsappBody };
}

/**
 * Email + WhatsApp после одобрения верификации. Ошибки каналов логируются, не пробрасываются.
 */
export async function sendVerificationApprovedExternalNotifications(user) {
  if (!user) return { email: false, whatsapp: false, skipped: 'no_user' };

  const { subject, emailBody, whatsappBody } = buildVerificationApprovedCopy();
  const result = { email: false, whatsapp: false };

  const email = user.email && String(user.email).trim();
  if (email) {
    try {
      await sendCrmEmailViaEmailJS(email, subject, emailBody);
      result.email = true;
      console.log(`✅ verification_success email → ${email}`);
    } catch (e) {
      console.error(`❌ verification_success email → ${email}:`, e.message);
    }
  } else {
    console.warn('⚠️ verification_success email: у пользователя нет email');
  }

  const phoneDigits = user.phone_number && String(user.phone_number).replace(/\D/g, '');
  if (phoneDigits) {
    try {
      const wa = await sendWhatsAppDigits(phoneDigits, whatsappBody);
      result.whatsapp = wa?.ok === true;
      if (result.whatsapp) {
        console.log(`✅ verification_success WhatsApp → ${phoneDigits}`);
      } else {
        console.error(`❌ verification_success WhatsApp → ${phoneDigits}:`, wa?.error || 'unknown');
      }
    } catch (e) {
      console.error(`❌ verification_success WhatsApp → ${phoneDigits}:`, e.message);
    }
  } else {
    console.warn('⚠️ verification_success WhatsApp: у пользователя нет телефона');
  }

  return result;
}
