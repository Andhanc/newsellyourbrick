import { sendCrmEmailViaEmailJS } from './emailJsCrmSend.js';
import { sendWhatsAppDigits } from './whatsappOutbound.js';
import { resolvePublicFrontendBase } from './publicFrontendUrl.js';

export function buildVerificationRejectedCopy(rejectionReason, { siteUrl } = {}) {
  const reason =
    rejectionReason && String(rejectionReason).trim() ? String(rejectionReason).trim() : null;
  const base = String(siteUrl || resolvePublicFrontendBase()).replace(/\/+$/, '');
  const subject = 'Verification rejected — SellYourBrick';

  const reasonLine = reason
    ? `Your verification was rejected by an administrator. Reason: ${reason}.`
    : 'Your verification was rejected by an administrator.';

  const emailBody = [
    'Hello!',
    '',
    reasonLine,
    '',
    'Please complete verification again on the site: upload a passport photo, a selfie, and a selfie with your passport.',
    'After you resubmit, the documents will go back to admin review.',
    '',
    `Open the site: ${base}`,
    '',
    'SellYourBrick',
  ].join('\n');

  const whatsappBody = reason
    ? `❌ Verification rejected\n\nReason: ${reason}\n\nPlease complete verification again on the site — upload a passport photo, a selfie, and a selfie with your passport. After you resubmit, the documents will go back to review.\n\n${base}`
    : `❌ Verification rejected\n\nPlease complete verification again on the site — upload a passport photo, a selfie, and a selfie with your passport. After you resubmit, the documents will go back to review.\n\n${base}`;

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
