import emailjs from '@emailjs/nodejs'
import { sendCrmEmailViaEmailJS } from './emailJsCrmSend.js'

export const PASSWORD_RESET_LOCALES = ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv']

const COPY = {
  en: {
    subject: 'Password recovery — Sellyourbrick',
    hello: 'Hello,',
    intro: 'You asked to reset your password on Sellyourbrick.',
    codeLabel: 'Your confirmation code',
    valid: 'The code is valid for 10 minutes.',
    how: 'How to create a new password',
    steps: [
      'Return to the sign-in window. If it is closed, open the site and choose “Forgot password?” again.',
      'Enter the 4-digit code from this email.',
      'If this email has both a buyer cabinet and a seller cabinet, choose which one to update.',
      'Create a new password and type it again. It must include an uppercase letter, a digit, and a special character (for example ! or #). It must differ from the password of your other cabinet.',
      'Save the password, then sign in with it.',
    ],
    siteLine: 'Open the site:',
    ignore: 'If you did not request this, ignore the email. Your current password stays the same.',
    signoff: 'Sellyourbrick',
  },
  ru: {
    subject: 'Восстановление пароля — Sellyourbrick',
    hello: 'Здравствуйте,',
    intro: 'Вы запросили сброс пароля на Sellyourbrick.',
    codeLabel: 'Код подтверждения',
    valid: 'Код действует 10 минут.',
    how: 'Как придумать новый пароль',
    steps: [
      'Вернитесь в окно входа. Если оно закрыто, откройте сайт и снова нажмите «Забыли пароль?».',
      'Введите 4-значный код из этого письма.',
      'Если на этот email есть и кабинет покупателя, и кабинет продавца, выберите, какой пароль меняете.',
      'Придумайте новый пароль и повторите его. В пароле нужны заглавная буква, цифра и специальный символ (например ! или #). Он должен отличаться от пароля другого кабинета.',
      'Сохраните пароль и войдите с ним.',
    ],
    siteLine: 'Открыть сайт:',
    ignore: 'Если вы не запрашивали сброс, просто проигнорируйте письмо. Текущий пароль не изменится.',
    signoff: 'Sellyourbrick',
  },
  de: {
    subject: 'Passwortwiederherstellung — Sellyourbrick',
    hello: 'Guten Tag,',
    intro: 'Sie haben das Zurücksetzen Ihres Passworts bei Sellyourbrick angefordert.',
    codeLabel: 'Ihr Bestätigungscode',
    valid: 'Der Code ist 10 Minuten gültig.',
    how: 'So legen Sie ein neues Passwort fest',
    steps: [
      'Kehren Sie zum Anmeldefenster zurück. Ist es geschlossen, öffnen Sie die Website und wählen Sie erneut „Passwort vergessen?“.',
      'Geben Sie den 4-stelligen Code aus dieser E-Mail ein.',
      'Wenn zu dieser E-Mail sowohl ein Käufer- als auch ein Verkäuferbereich gehört, wählen Sie, welches Passwort Sie ändern.',
      'Legen Sie ein neues Passwort fest und wiederholen Sie es. Es braucht einen Großbuchstaben, eine Ziffer und ein Sonderzeichen (zum Beispiel ! oder #). Es muss sich vom Passwort des anderen Bereichs unterscheiden.',
      'Speichern Sie das Passwort und melden Sie sich damit an.',
    ],
    siteLine: 'Website öffnen:',
    ignore: 'Wenn Sie das nicht angefordert haben, ignorieren Sie die E-Mail. Ihr aktuelles Passwort bleibt unverändert.',
    signoff: 'Sellyourbrick',
  },
  es: {
    subject: 'Recuperación de contraseña — Sellyourbrick',
    hello: 'Hola,',
    intro: 'Ha solicitado restablecer su contraseña en Sellyourbrick.',
    codeLabel: 'Su código de confirmación',
    valid: 'El código es válido durante 10 minutos.',
    how: 'Cómo crear una contraseña nueva',
    steps: [
      'Vuelva a la ventana de acceso. Si está cerrada, abra el sitio y elija de nuevo «¿Olvidó su contraseña?».',
      'Introduzca el código de 4 dígitos de este correo.',
      'Si este correo tiene un panel de comprador y otro de vendedor, elija cuál desea actualizar.',
      'Cree una contraseña nueva y repítala. Debe incluir una mayúscula, un número y un carácter especial (por ejemplo ! o #). Debe ser distinta de la contraseña del otro panel.',
      'Guarde la contraseña e inicie sesión con ella.',
    ],
    siteLine: 'Abrir el sitio:',
    ignore: 'Si no solicitó esto, ignore el correo. Su contraseña actual no cambiará.',
    signoff: 'Sellyourbrick',
  },
  fr: {
    subject: 'Récupération du mot de passe — Sellyourbrick',
    hello: 'Bonjour,',
    intro: 'Vous avez demandé à réinitialiser votre mot de passe sur Sellyourbrick.',
    codeLabel: 'Votre code de confirmation',
    valid: 'Le code est valable 10 minutes.',
    how: 'Comment créer un nouveau mot de passe',
    steps: [
      'Revenez à la fenêtre de connexion. Si elle est fermée, ouvrez le site et choisissez à nouveau « Mot de passe oublié ? ».',
      'Saisissez le code à 4 chiffres de cet e-mail.',
      'Si cet e-mail a un espace acheteur et un espace vendeur, choisissez celui dont vous changez le mot de passe.',
      'Choisissez un nouveau mot de passe et saisissez-le une seconde fois. Il doit contenir une majuscule, un chiffre et un caractère spécial (par exemple ! ou #). Il doit être différent du mot de passe de l’autre espace.',
      'Enregistrez le mot de passe, puis connectez-vous avec.',
    ],
    siteLine: 'Ouvrir le site :',
    ignore: 'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail. Votre mot de passe actuel reste inchangé.',
    signoff: 'Sellyourbrick',
  },
  pl: {
    subject: 'Odzyskiwanie hasła — Sellyourbrick',
    hello: 'Dzień dobry,',
    intro: 'Poproszono o zresetowanie hasła w Sellyourbrick.',
    codeLabel: 'Kod potwierdzenia',
    valid: 'Kod jest ważny przez 10 minut.',
    how: 'Jak ustawić nowe hasło',
    steps: [
      'Wróć do okna logowania. Jeśli jest zamknięte, otwórz stronę i ponownie wybierz „Nie pamiętasz hasła?”.',
      'Wpisz 4-cyfrowy kod z tej wiadomości.',
      'Jeśli ten e-mail ma konto kupującego i konto sprzedającego, wybierz, które hasło zmieniasz.',
      'Wymyśl nowe hasło i powtórz je. Musi zawierać wielką literę, cyfrę i znak specjalny (na przykład ! lub #). Musi różnić się od hasła drugiego konta.',
      'Zapisz hasło i zaloguj się nim.',
    ],
    siteLine: 'Otwórz stronę:',
    ignore: 'Jeśli to nie Ty prosiłeś o reset, zignoruj wiadomość. Obecne hasło pozostanie bez zmian.',
    signoff: 'Sellyourbrick',
  },
  sv: {
    subject: 'Återställning av lösenord — Sellyourbrick',
    hello: 'Hej,',
    intro: 'Du har bett om att återställa lösenordet på Sellyourbrick.',
    codeLabel: 'Din bekräftelsekod',
    valid: 'Koden gäller i 10 minuter.',
    how: 'Så skapar du ett nytt lösenord',
    steps: [
      'Gå tillbaka till inloggningsfönstret. Om det är stängt, öppna sajten och välj ”Glömt lösenord?” igen.',
      'Ange den fyrsiffriga koden från det här mejlet.',
      'Om e-postadressen har både ett köparkonto och ett säljarkonto, välj vilket lösenord du byter.',
      'Skapa ett nytt lösenord och skriv det en gång till. Det måste innehålla en versal, en siffra och ett specialtecken (till exempel ! eller #). Det måste skilja sig från det andra kontots lösenord.',
      'Spara lösenordet och logga in med det.',
    ],
    siteLine: 'Öppna sajten:',
    ignore: 'Om du inte bad om detta kan du ignorera mejlet. Ditt nuvarande lösenord ändras inte.',
    signoff: 'Sellyourbrick',
  },
}

export function normalizeResetLocale(raw) {
  const code = String(raw || 'en')
    .toLowerCase()
    .split(/[-_]/)[0]
  return PASSWORD_RESET_LOCALES.includes(code) ? code : 'en'
}

export function buildPasswordResetEmail({ code, locale, siteUrl } = {}) {
  const copy = COPY[normalizeResetLocale(locale)]
  const site = String(siteUrl || '').trim()
  const steps = copy.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')
  const siteBlock = site ? `\n${copy.siteLine} ${site}\n` : ''
  const body = `${copy.hello}

${copy.intro}

${copy.codeLabel}: ${code}
${copy.valid}

${copy.how}:
${steps}
${siteBlock}
${copy.ignore}

${copy.signoff}`
  return { subject: copy.subject, body, locale: normalizeResetLocale(locale) }
}

function emailJsConfig() {
  return {
    serviceId: String(
      process.env.REACT_APP_EMAILJS_SERVICE_ID ||
        process.env.VITE_EMAILJS_SERVICE_ID ||
        process.env.EMAILJS_SERVICE_ID ||
        '',
    ).trim(),
    otpTemplateId: String(
      process.env.REACT_APP_EMAILJS_TEMPLATE_ID ||
        process.env.VITE_EMAILJS_TEMPLATE_ID ||
        process.env.EMAILJS_TEMPLATE_ID ||
        '',
    ).trim(),
    crmTemplateId: String(
      process.env.EMAILJS_CRM_TEMPLATE_ID || process.env.VITE_EMAILJS_CRM_TEMPLATE_ID || '',
    ).trim(),
    publicKey: String(
      process.env.REACT_APP_EMAILJS_PUBLIC_KEY ||
        process.env.VITE_EMAILJS_PUBLIC_KEY ||
        process.env.EMAILJS_PUBLIC_KEY ||
        '',
    ).trim(),
    privateKey: String(
      process.env.EMAILJS_PRIVATE_KEY ||
        process.env.EMAILJS_ACCESS_TOKEN ||
        process.env.EMAILJS_PRIVATE_API_KEY ||
        '',
    ).trim(),
  }
}

/**
 * Sends a letter with the code and reset instructions.
 * Prefers the CRM template (full message body). Falls back to the verification template.
 */
export async function deliverPasswordResetEmail({ toEmail, code, locale, siteUrl }) {
  const email = String(toEmail || '').trim()
  const { subject, body } = buildPasswordResetEmail({ code, locale, siteUrl })
  const cfg = emailJsConfig()
  const errors = []

  if (cfg.serviceId && cfg.publicKey && cfg.crmTemplateId) {
    try {
      await sendCrmEmailViaEmailJS(email, subject, body)
      return { sent: true, channel: 'instructions' }
    } catch (err) {
      errors.push(err)
    }
  }

  if (cfg.serviceId && cfg.publicKey && cfg.otpTemplateId) {
    try {
      const result = await emailjs.send(
        cfg.serviceId,
        cfg.otpTemplateId,
        {
          to_email: email,
          email,
          user_email: email,
          subject,
          title: subject,
          email_subject: subject,
          verification_code: String(code),
          code: String(code),
          passcode: String(code),
          message: body,
          body,
          text: body,
          content: body,
          full_message: `${subject}\n\n${body}`,
          from_name: 'Sellyourbrick',
          name: 'Sellyourbrick',
        },
        {
          publicKey: cfg.publicKey,
          ...(cfg.privateKey ? { privateKey: cfg.privateKey } : {}),
        },
      )
      if (result?.status && result.status !== 200) {
        throw new Error(`EmailJS returned status ${result.status}`)
      }
      return { sent: true, channel: 'code-template' }
    } catch (err) {
      errors.push(err)
    }
  }

  if (!cfg.serviceId || !cfg.publicKey || (!cfg.crmTemplateId && !cfg.otpTemplateId)) {
    const err = new Error('email_not_configured')
    err.code = 'email_not_configured'
    throw err
  }

  const detail = errors
    .map((err) => (err && err.message ? err.message : String(err)))
    .filter(Boolean)
    .join(' | ')
  const err = new Error(detail || 'email_send_failed')
  err.code = 'email_send_failed'
  throw err
}
