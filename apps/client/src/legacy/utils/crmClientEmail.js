/**
 * Отправка писем из CRM через EmailJS в браузере (тот же путь, что и код верификации в authService).
 * Обходит ограничение EmailJS на запросы не из браузера с бэкенда.
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
    throw new Error(
      'EmailJS: задайте service id и public key (как для регистрации).'
    );
  }
  if (!templateId) {
    throw new Error(
      'Для CRM нужен отдельный шаблон EmailJS, не шаблон «код подтверждения». Создайте в EmailJS новый шаблон: тема {{subject}}, текст {{message}} или {{full_message}}, получатель {{to_email}}. Укажите его Template ID: локально VITE_EMAILJS_CRM_TEMPLATE_ID в .env, на проде — EMAILJS_CRM_TEMPLATE_ID на сервере (отдаётся в /api/config).'
    );
  }
  emailjs.init(publicKey);
  const subj =
    subject != null && String(subject).trim() ? String(subject).trim() : 'Сообщение от Sellyourbrick';
  const text = messageBody != null ? String(messageBody) : '';
  const sender =
    fromName != null && String(fromName).trim() ? String(fromName).trim() : 'Sellyourbrick';
  /** Один блок текста для шаблонов с одной переменной (часто {{message}}). */
  const messageWithSubject = text ? `${subj}\n\n${text}` : subj;
  const timeStr = new Date().toLocaleString('ru-RU', {
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
    /** Если в шаблоне одна площадка «текст письма», подставьте {{full_message}} или {{message}} */
    full_message: messageWithSubject,
    combined: messageWithSubject,
    from_name: sender,
    /** Шаблон Contact Us / Auto-Reply часто ждёт {{name}} (отправитель) и {{time}} */
    name: sender,
    time: timeStr,
  };
  const result = await emailjs.send(serviceId, templateId, templateParams, publicKey);
  if (result.status !== 200) {
    throw new Error(`EmailJS вернул статус ${result.status}`);
  }
}
