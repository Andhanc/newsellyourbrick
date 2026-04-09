/**
 * Отправка CRM-писем через EmailJS (тот же путь, что напоминания по аукциону).
 * Официальный @emailjs/nodejs добавляет lib_version и тот же JSON, что браузерный SDK —
 * сырой axios без этого часто даёт 400 «The parameters are invalid».
 */
import emailjs from '@emailjs/nodejs';
import { userQueries } from './database/database.js';

let emailJs403ServerHintLogged = false;

function strParam(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return '';
  }
}

/**
 * Параметры для REST API EmailJS: только строки (иначе часто 400).
 * Набор имён совпадает с src/utils/crmClientEmail.js — один шаблон для CRM и напоминаний.
 */
function buildCrmTemplateParams(toEmail, subject, messageText) {
  const email = strParam(toEmail).trim();
  const subj =
    subject != null && strParam(subject).trim() ? strParam(subject).trim() : 'Sellyourbrick';
  const text = messageText != null ? strParam(messageText) : '';
  const sender = 'Sellyourbrick';
  const messageWithSubject = text ? `${subj}\n\n${text}` : subj;
  const timeStr = new Date().toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return {
    to_email: email,
    email,
    user_email: email,
    subject: subj,
    title: subj,
    email_subject: subj,
    subject_line: subj,
    message: text,
    body: text,
    text,
    content: text,
    html: text,
    message_html: text,
    email_body: text,
    user_message: text,
    letter: text,
    crm_subject: subj,
    crm_body: text,
    full_message: messageWithSubject,
    combined: messageWithSubject,
    from_name: sender,
    name: sender,
    time: timeStr,
  };
}

export async function sendCrmEmailViaEmailJS(toEmail, subject, messageText) {
  const email = String(toEmail || '').trim();
  if (!email) {
    throw new Error('Email получателя пустой');
  }

  const crmTemplateRaw =
    process.env.EMAILJS_CRM_TEMPLATE_ID || process.env.VITE_EMAILJS_CRM_TEMPLATE_ID || '';
  const crmTemplateId = String(crmTemplateRaw).trim();

  const emailJsConfig = {
    serviceId: String(
      process.env.REACT_APP_EMAILJS_SERVICE_ID ||
        process.env.VITE_EMAILJS_SERVICE_ID ||
        process.env.EMAILJS_SERVICE_ID ||
        ''
    ).trim(),
    /** Только CRM-шаблон: общий шаблон кода подтверждения даёт 400 «parameters are invalid». */
    templateId: crmTemplateId,
    publicKey: String(
      process.env.REACT_APP_EMAILJS_PUBLIC_KEY ||
        process.env.VITE_EMAILJS_PUBLIC_KEY ||
        process.env.EMAILJS_PUBLIC_KEY ||
        ''
    ).trim(),
  };
  const privateKey = String(
    process.env.EMAILJS_PRIVATE_KEY ||
      process.env.EMAILJS_ACCESS_TOKEN ||
      process.env.EMAILJS_PRIVATE_API_KEY ||
      ''
  ).trim();

  if (!emailJsConfig.serviceId || !emailJsConfig.templateId || !emailJsConfig.publicKey) {
    throw new Error(
      'EmailJS не настроен для сервера: нужны SERVICE_ID, PUBLIC_KEY и отдельный шаблон писем ' +
        'EMAILJS_CRM_TEMPLATE_ID (или VITE_EMAILJS_CRM_TEMPLATE_ID в корневом .env). ' +
        'Не используйте шаблон «код подтверждения» — создайте шаблон с {{to_email}}, {{subject}}, {{message}} (или {{full_message}}). См. .env.example.'
    );
  }

  const template_params = buildCrmTemplateParams(email, subject, messageText);

  const sendOptions = {
    publicKey: emailJsConfig.publicKey,
    ...(privateKey ? { privateKey } : {}),
  };

  try {
    const result = await emailjs.send(
      emailJsConfig.serviceId,
      emailJsConfig.templateId,
      template_params,
      sendOptions
    );
    if (result.status !== 200) {
      throw new Error(`EmailJS вернул статус ${result.status}`);
    }
    console.log(`[EmailJS] Письмо отправлено → ${email} | тема: ${(subject || '').slice(0, 60)}`);
  } catch (err) {
    if (typeof err === 'string') {
      throw new Error(`EmailJS: ${err}`);
    }
    const status = typeof err?.status === 'number' ? err.status : null;
    const detail =
      typeof err?.text === 'string'
        ? err.text
        : err != null && typeof err.message === 'string'
          ? err.message
          : String(err);
    if (!status && !detail) throw err;
    if (status === 403) {
      const detailStr = String(detail || '');
      const nonBrowserBlocked =
        /non-browser|non browser|browser environments is currently disabled/i.test(detailStr);
      if (!emailJs403ServerHintLogged) {
        emailJs403ServerHintLogged = true;
        console.warn(
          '[EmailJS] 403: серверные запросы. Откройте https://dashboard.emailjs.com/admin/account/security и включите «Allow EmailJS API for non-browser applications». Private key в .env не отменяет эту настройку.'
        );
      }
      const hint403 = nonBrowserBlocked
        ? 'Включите в EmailJS: Account → Security → «Allow EmailJS API for non-browser applications» (сервер Node считается non-browser).'
        : privateKey
          ? 'Проверьте, что EMAILJS_PRIVATE_KEY скопирован из того же аккаунта, что и Public Key; лимиты плана.'
          : 'Добавьте EMAILJS_PRIVATE_KEY в .env или включите non-browser API в настройках EmailJS (см. выше).';
      throw new Error(`EmailJS 403: ${hint403} ${detailStr ? detailStr.slice(0, 280) : ''}`);
    }
    const hint400 =
      status === 400 && /parameters are invalid/i.test(String(detail))
        ? ' Проверьте в EmailJS: шаблон с полями {{to_email}}, {{subject}}, {{message}} (не OTP); service_id и template_id из одного аккаунта; почтовый сервис в дашборде подключён.'
        : '';
    throw new Error(
      status != null && detail
        ? `EmailJS ошибка ${status}: ${detail}${hint400}`
        : err?.message || `EmailJS: ${detail || 'ошибка отправки'}`
    );
  }
}

/** Email покупателя: из заявки или из профиля по buyer_id. */
export async function resolveBuyerEmailForPurchaseRequest(request) {
  if (!request) return null;
  const fromReq =
    (request.buyer_email && String(request.buyer_email).trim()) ||
    (request.buyerEmail && String(request.buyerEmail).trim()) ||
    null;
  if (fromReq) return fromReq;

  const bidRaw = request.buyer_id ?? request.buyerId;
  const bid = bidRaw != null ? parseInt(String(bidRaw).trim(), 10) : NaN;
  if (!Number.isFinite(bid)) return null;
  try {
    const u = await userQueries.getById(bid);
    const em = u && u.email && String(u.email).trim();
    return em || null;
  } catch {
    return null;
  }
}
