/**
 * Send CRM emails via EmailJS in the browser (same path as verification codes in authService).
 * Avoids EmailJS rejecting non-browser requests from the backend.
 */
import emailjs from '@emailjs/browser';
import { getEmailJsConfig, getEnv, loadRuntimeConfig } from './env';

async function resolveEmailJsForCrm() {
  let { serviceId, publicKey } = getEmailJsConfig();
  let crmTemplateId = getEnv('EMAILJS_CRM_TEMPLATE_ID');
  const rt = await loadRuntimeConfig();
  if (rt) {
    if (!serviceId) serviceId = rt.emailjsServiceId || '';
    if (!publicKey) publicKey = rt.emailjsPublicKey || '';
    if (!crmTemplateId) crmTemplateId = rt.emailjsCrmTemplateId || '';
  }
  const templateId = String(crmTemplateId || '').trim();
  return {
    serviceId: String(serviceId || '').trim(),
    templateId,
    publicKey: String(publicKey || '').trim(),
  };
}

/**
 * @param {{ toEmail: string, subject?: string, messageBody?: string, fromName?: string }} params
 */
export async function sendCrmEmailFromBrowser({ toEmail, subject, messageBody, fromName }) {
  const { serviceId, templateId, publicKey } = await resolveEmailJsForCrm();
  if (!serviceId || !publicKey) {
    throw new Error('crmEmailErr_missingKeys');
  }
  if (!templateId) {
    throw new Error('crmEmailErr_missingTemplate');
  }
  emailjs.init(publicKey);
  const subj =
    subject != null && String(subject).trim() ? String(subject).trim() : 'Message from SellYourBrick';
  const text = messageBody != null ? String(messageBody) : '';
  const sender =
    fromName != null && String(fromName).trim() ? String(fromName).trim() : 'SellYourBrick';
  /** Single body field for templates that only expose {{message}}. */
  const messageWithSubject = text ? `${subj}\n\n${text}` : subj;
  const timeStr = new Date().toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const templateParams = {
    to_email: toEmail,
    email: toEmail,
    user_email: toEmail,
    subject: subj,
    title: subj,
    email_subject: subj,
    subject_line: subj,
    message: text,
    body: text,
    text,
    content: text,
    email_body: text,
    user_message: text,
    letter: text,
    crm_subject: subj,
    crm_body: text,
    /** Prefer {{full_message}} or {{message}} when the template has a single body field. */
    full_message: messageWithSubject,
    combined: messageWithSubject,
    from_name: sender,
    /** Contact Us / Auto-Reply templates often expect {{name}} (sender) and {{time}}. */
    name: sender,
    time: timeStr,
  };
  const result = await emailjs.send(serviceId, templateId, templateParams, publicKey);
  if (result.status !== 200) {
    throw new Error(`crmEmailErr_status:${result.status}`);
  }
}
