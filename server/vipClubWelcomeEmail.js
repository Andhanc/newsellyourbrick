import { sendCrmEmailViaEmailJS } from './emailJsCrmSend.js';
import { userQueries } from './database/database.js';
import { getWhatsAppManagerDigits, buildWhatsAppChatUrl } from './whatsappOutbound.js';

const VIP_WELCOME_PREFILL = 'Hello! I subscribed to the VIP private club.';

export function shouldSendVipClubWelcomeEmail({ planKey, isNewPayment, vipPaymentCount }) {
  if (!isNewPayment) return false;
  if (String(planKey || '').toLowerCase() !== 'vip') return false;
  return Number(vipPaymentCount) === 1;
}

export function buildVipClubWelcomeEmail({ firstName, whatsappUrl }) {
  const hello = firstName ? `Hello, ${firstName}!` : 'Hello!';
  const subject = 'Welcome to the VIP private club — Sellyourbrick';
  const chatBlock = whatsappUrl
    ? `Message a manager on WhatsApp — they can help with club listings and answer your questions:

${whatsappUrl}`
    : 'A manager will contact you. If easier, message us via the site chat.';
  const body = `${hello}

Your VIP private club subscription is now active.

${chatBlock}

Best regards,
Sellyourbrick`;
  return { subject, body };
}

async function resolveWelcomeUser({ userId, user }) {
  return user || (userId ? await userQueries.getById(userId) : null);
}

export async function sendVipClubWelcomeEmail({ userId, user, customerEmail } = {}) {
  const profile = await resolveWelcomeUser({ userId, user });
  const email =
    (profile?.email && String(profile.email).trim()) ||
    (customerEmail && String(customerEmail).trim()) ||
    '';
  if (!email) return { ok: false, error: 'no_email' };

  const digits = getWhatsAppManagerDigits();
  const whatsappUrl = digits ? buildWhatsAppChatUrl(digits, VIP_WELCOME_PREFILL) : '';
  if (!whatsappUrl) {
    console.warn(
      '[VIP welcome] Нет номера WhatsApp менеджера: подключите сессию в админке или задайте WHATSAPP_MANAGER_NUMBER.'
    );
  }

  const { subject, body } = buildVipClubWelcomeEmail({
    firstName: profile?.first_name,
    whatsappUrl,
  });
  await sendCrmEmailViaEmailJS(email, subject, body);
  return { ok: true, email, whatsappUrl };
}
