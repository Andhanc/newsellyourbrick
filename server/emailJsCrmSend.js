/**
 * Отправка CRM-писем через EmailJS (тот же путь, что напоминания по аукциону).
 * Вынесено в отдельный модуль, чтобы гарантировать доступ из любых роутов.
 */
import axios from 'axios';
import { userQueries } from './database/database.js';

let emailJs403ServerHintLogged = false;

export async function sendCrmEmailViaEmailJS(toEmail, subject, messageText) {
  const email = String(toEmail || '').trim();
  if (!email) {
    throw new Error('Email получателя пустой');
  }

  const emailJsConfig = {
    serviceId:
      process.env.REACT_APP_EMAILJS_SERVICE_ID ||
      process.env.VITE_EMAILJS_SERVICE_ID ||
      process.env.EMAILJS_SERVICE_ID ||
      '',
    templateId:
      process.env.EMAILJS_CRM_TEMPLATE_ID ||
      process.env.REACT_APP_EMAILJS_TEMPLATE_ID ||
      process.env.VITE_EMAILJS_TEMPLATE_ID ||
      process.env.EMAILJS_TEMPLATE_ID ||
      '',
    publicKey:
      process.env.REACT_APP_EMAILJS_PUBLIC_KEY ||
      process.env.VITE_EMAILJS_PUBLIC_KEY ||
      process.env.EMAILJS_PUBLIC_KEY ||
      '',
  };
  const privateKey = String(
    process.env.EMAILJS_PRIVATE_KEY ||
      process.env.EMAILJS_ACCESS_TOKEN ||
      process.env.EMAILJS_PRIVATE_API_KEY ||
      ''
  ).trim();

  if (!emailJsConfig.serviceId || !emailJsConfig.templateId || !emailJsConfig.publicKey) {
    throw new Error(
      'EmailJS не настроен: нужны SERVICE_ID, шаблон (EMAILJS_CRM_TEMPLATE_ID или общий TEMPLATE_ID) и PUBLIC_KEY'
    );
  }

  // Дублируем поля под типичные шаблоны EmailJS (как в напоминаниях + запасные имена переменных)
  const template_params = {
    to_email: email,
    email: email,
    user_email: email,
    to: email,
    subject: subject || 'Sellyourbrick',
    message: messageText,
    body: messageText,
    text: messageText,
    html: messageText,
    content: messageText,
    message_html: messageText,
    from_name: 'Sellyourbrick',
  };

  const basePayload = {
    service_id: emailJsConfig.serviceId,
    template_id: emailJsConfig.templateId,
    user_id: emailJsConfig.publicKey,
    template_params,
  };

  const postSend = async (payload) => {
    const emailResponse = await axios.post('https://api.emailjs.com/api/v1.0/email/send', payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (emailResponse.status !== 200) {
      throw new Error(`EmailJS вернул статус ${emailResponse.status}`);
    }
    return emailResponse;
  };

  try {
    if (privateKey) {
      try {
        await postSend({ ...basePayload, accessToken: privateKey });
      } catch (firstErr) {
        const st = firstErr.response?.status;
        if (st === 403) {
          await postSend({ ...basePayload, access_token: privateKey });
        } else {
          throw firstErr;
        }
      }
    } else {
      await postSend(basePayload);
    }
    console.log(`[EmailJS] Письмо отправлено → ${email} | тема: ${(subject || '').slice(0, 60)}`);
  } catch (err) {
    const res = err.response;
    if (!res) throw err;
    const detail =
      typeof res.data === 'string' ? res.data : res.data != null ? JSON.stringify(res.data) : '';
    if (res.status === 403) {
      if (!emailJs403ServerHintLogged) {
        emailJs403ServerHintLogged = true;
        console.warn(
          '[EmailJS] 403: запрос с Node заблокирован. Добавьте EMAILJS_PRIVATE_KEY или включите non-browser API в EmailJS Security.'
        );
      }
      const hint = privateKey
        ? 'Private key задан, но EmailJS всё равно вернул 403 — проверьте ключ и лимиты.'
        : 'В .env нет EMAILJS_PRIVATE_KEY — серверная отправка может быть заблокирована.';
      throw new Error(`EmailJS 403: ${hint} ${detail ? String(detail).slice(0, 200) : ''}`);
    }
    throw new Error(
      detail ? `EmailJS ошибка ${res.status}: ${detail}` : err.message || `EmailJS ошибка ${res.status}`
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
