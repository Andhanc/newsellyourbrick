/**
 * Maps authService / API error codes, English messages, and legacy Russian
 * strings to i18n keys for LoginModal and related UI.
 */

const CYRILLIC_RE = /[А-Яа-яЁё]/

/** Short codes → i18n key */
const CODE_TO_KEY = {
  invalid_code: 'invalidCode',
  code_expired: 'authError_codeExpired',
  code_not_found: 'authError_codeNotFound',
  user_blocked: 'authError_userBlocked',
  network_error: 'authError_networkError',
  invalid_email: 'authError_invalidEmailFormat',
  invalid_email_or_password: 'invalidEmailOrPassword',
  email_password_required: 'authError_emailPasswordRequired',
  password_min_length: 'passwordMinLength',
  name_min_length: 'nameMinLength',
  already_registered: 'authError_alreadyRegistered',
  need_register: 'authError_needRegister',
  send_code_failed: 'codeSendFailed',
  verify_code_failed: 'authError_verifyCodeFailed',
  server_connection: 'authError_serverConnection',
  ALREADY_REGISTERED: 'authError_alreadyRegistered',
  NEED_REGISTER: 'authError_needRegister',
}

/**
 * Exact message (English or legacy Russian) → i18n key.
 * English values match en.json so they remain readable without mapping.
 */
const MESSAGE_TO_KEY = {
  // Codes as messages
  invalid_code: 'invalidCode',
  code_expired: 'authError_codeExpired',
  code_not_found: 'authError_codeNotFound',
  user_blocked: 'authError_userBlocked',
  network_error: 'authError_networkError',

  // English (authService / en.json)
  'Invalid code': 'invalidCode',
  'Invalid code. Please try again.': 'invalidCode',
  'Code not found. Request a new code.': 'authError_codeNotFound',
  'Code not found. You may have entered the code for a different number.':
    'authError_codeNotFoundWrongPhone',
  'Code expired. Request a new code.': 'authError_codeExpired',
  'Phone number is too short': 'authError_phoneTooShort',
  'Phone number is too long': 'authError_phoneTooLong',
  'Code sent to WhatsApp': 'authError_codeSentWhatsApp',
  'WhatsApp service is temporarily unavailable. Please wait a few seconds and try again.':
    'authError_whatsappUnavailable',
  'WhatsApp service unavailable. In development mode, use the code from the console.':
    'authError_whatsappUnavailableDev',
  'Could not send the code automatically; use the code from the console (development mode)':
    'authError_whatsappSendDevFallback',
  'Could not send the code via WhatsApp': 'authError_whatsappSendFailed',
  'Backend unavailable. In development mode, use the code from the console.':
    'authError_backendUnavailableDev',
  'Could not send the code. Please try again later.': 'authError_sendCodeLater',
  'Could not send the code': 'codeSendFailed',
  'User is blocked': 'authError_userBlocked',
  'You are already registered with this number. Please sign in.':
    'authError_alreadyRegisteredPhone',
  'No user found with this number. Please register via WhatsApp first.':
    'authError_needRegisterWhatsApp',
  'Could not save data': 'authError_saveDataFailed',
  'Could not verify the code. Please try again later.': 'authError_verifyCodeFailed',
  'Unknown Google response format': 'authError_googleUnknownFormat',
  'Could not process authentication data': 'authError_authDataFailed',
  'You are already registered. Please sign in.': 'authError_alreadyRegistered',
  'Account not found. Please register with Google first.': 'authError_needRegisterGoogle',
  'Google sign-in failed': 'googleSignInFailed',
  'Could not fetch user data': 'authError_fetchUserFailed',
  'Could not fetch user data from Google': 'authError_googleUserDataFailed',
  'Telegram sign-in failed': 'authError_telegramFailed',
  'Could not sign in with Telegram': 'authError_telegramSignInFailed',
  'Invalid email format': 'authError_invalidEmailFormat',
  'Invalid email address': 'authError_invalidEmailFormat',
  'Code sent to email': 'authError_codeSentEmail',
  'Could not send the code to email': 'authError_emailSendFailed',
  'Enter a valid email': 'enterValidEmail',
  'Enter a valid email address': 'enterValidEmail',
  'Could not verify email': 'emailCheckFailed',
  'Network error. Please try again later.': 'authError_networkError',
  'Network error': 'networkErrorShort',
  'User saved locally. Backend unavailable.': 'authError_userSavedLocally',
  'Password must contain at least 6 characters': 'passwordMinLength',
  'Name must contain at least 2 characters': 'nameMinLength',
  'An error occurred during registration': 'registerGenericError',
  'Could not sign up': 'registerFailed',
  'Could not register the user': 'registerFailed',
  'Email confirmed successfully': 'authError_emailConfirmed',
  'Could not confirm email': 'authError_emailConfirmFailed',
  'Could not connect to the server. Please try again later.': 'authError_serverConnection',
  'Could not connect to the server. Make sure the server is running on port 3000.':
    'authError_serverNotRunning',
  'Email and password are required': 'authError_emailPasswordRequired',
  'Invalid email or password': 'invalidEmailOrPassword',
  'An error occurred while signing in. Please try again later.': 'loginGenericError',
  'An error occurred while signing in': 'loginGenericError',
  'Code verification failed': 'authError_codeVerifyFailed',
  'Could not save password': 'forgotPassword_saveError',
  'Password updated': 'authError_passwordUpdated',
  'Something went wrong. Please try again.': 'genericError',

  // Legacy Russian (older API / authService responses still in the wild)
  'Неверный код': 'invalidCode',
  'Код не найден. Запросите новый код.': 'authError_codeNotFound',
  'Код не найден. Возможно, вы ввели код для другого номера.':
    'authError_codeNotFoundWrongPhone',
  'Код истек. Запросите новый код.': 'authError_codeExpired',
  'Номер слишком короткий': 'authError_phoneTooShort',
  'Номер слишком длинный': 'authError_phoneTooLong',
  'Код отправлен в WhatsApp': 'authError_codeSentWhatsApp',
  'WhatsApp сервис временно недоступен. Пожалуйста, подождите несколько секунд и попробуйте снова.':
    'authError_whatsappUnavailable',
  'WhatsApp сервис недоступен. В режиме разработки используйте код из консоли.':
    'authError_whatsappUnavailableDev',
  'Не удалось отправить код автоматически, используйте код из консоли (режим разработки)':
    'authError_whatsappSendDevFallback',
  'Не удалось отправить код через WhatsApp': 'authError_whatsappSendFailed',
  'Backend недоступен. В режиме разработки используйте код из консоли.':
    'authError_backendUnavailableDev',
  'Не удалось отправить код. Попробуйте позже.': 'authError_sendCodeLater',
  'Не удалось отправить код': 'codeSendFailed',
  'Пользователь заблокирован': 'authError_userBlocked',
  'Вы уже зарегистрированы с этим номером. Войдите в аккаунт.':
    'authError_alreadyRegisteredPhone',
  'Пользователь с таким номером не найден. Сначала зарегистрируйтесь через WhatsApp.':
    'authError_needRegisterWhatsApp',
  'Ошибка при сохранении данных': 'authError_saveDataFailed',
  'Не удалось проверить код. Попробуйте позже.': 'authError_verifyCodeFailed',
  'Неизвестный формат ответа от Google': 'authError_googleUnknownFormat',
  'Не удалось обработать данные авторизации': 'authError_authDataFailed',
  'Вы уже зарегистрированы. Войдите в аккаунт.': 'authError_alreadyRegistered',
  'Аккаунт не найден. Сначала зарегистрируйтесь через Google.':
    'authError_needRegisterGoogle',
  'Ошибка авторизации через Google': 'googleSignInFailed',
  'Не удалось получить данные пользователя': 'authError_fetchUserFailed',
  'Не удалось получить данные пользователя от Google': 'authError_googleUserDataFailed',
  'Ошибка авторизации через Telegram': 'authError_telegramFailed',
  'Не удалось войти через Telegram': 'authError_telegramSignInFailed',
  'Неверный формат email адреса': 'authError_invalidEmailFormat',
  'Неверный email адрес': 'authError_invalidEmailFormat',
  'Код отправлен на email': 'authError_codeSentEmail',
  'Не удалось отправить код на email': 'authError_emailSendFailed',
  'Укажите корректный email': 'enterValidEmail',
  'Не удалось проверить email': 'emailCheckFailed',
  'Ошибка сети. Попробуйте позже.': 'authError_networkError',
  'Пользователь сохранен локально. Backend недоступен.': 'authError_userSavedLocally',
  'Пароль должен содержать минимум 6 символов': 'passwordMinLength',
  'Имя должно содержать минимум 2 символа': 'nameMinLength',
  'Произошла ошибка при регистрации': 'registerGenericError',
  'Не удалось зарегистрировать пользователя': 'registerFailed',
  'Email успешно подтвержден': 'authError_emailConfirmed',
  'Не удалось подтвердить email': 'authError_emailConfirmFailed',
  'Не удалось подключиться к серверу. Попробуйте позже.': 'authError_serverConnection',
  'Не удалось подключиться к серверу. Убедитесь, что сервер запущен на порту 3000.':
    'authError_serverNotRunning',
  'Необходимо указать email и пароль': 'authError_emailPasswordRequired',
  'Неверный email или пароль': 'invalidEmailOrPassword',
  'Произошла ошибка при входе. Попробуйте позже.': 'loginGenericError',
  'Произошла ошибка при входе': 'loginGenericError',
  'Ошибка проверки кода': 'authError_codeVerifyFailed',
  'Не удалось сохранить пароль': 'forgotPassword_saveError',
  'Пароль обновлён': 'authError_passwordUpdated',
  'Пароль продавца должен отличаться от пароля покупателя. Выберите другой пароль.':
    'sellerPasswordMustDiffer',
  'The seller cabinet password must differ from the buyer cabinet password. Choose a different password.':
    'sellerPasswordMustDiffer',
  'Сначала войдите в кабинет покупателя и задайте пароль, затем создайте кабинет продавца с другим паролем.':
    'buyerPasswordRequiredFirst',
  'Sign in to the buyer cabinet and set a password first, then create the seller cabinet with a different password.':
    'buyerPasswordRequiredFirst',
}

function extractMessage(errorOrMessage) {
  if (errorOrMessage == null) return ''
  if (typeof errorOrMessage === 'string') return errorOrMessage.trim()
  if (typeof errorOrMessage === 'object') {
    const code = errorOrMessage.code
    if (code != null && CODE_TO_KEY[String(code)]) {
      return String(code)
    }
    const raw =
      errorOrMessage.error ??
      errorOrMessage.message ??
      errorOrMessage.msg ??
      ''
    return String(raw).trim()
  }
  return String(errorOrMessage).trim()
}

/**
 * @param {string|Error|{error?:string,message?:string,code?:string}|null|undefined} errorOrMessage
 * @param {function} t - i18next t()
 * @returns {string}
 */
export function localizeAuthError(errorOrMessage, t) {
  const msg = extractMessage(errorOrMessage)
  if (!msg) {
    return typeof t === 'function' ? t('genericError') : 'Something went wrong. Please try again.'
  }

  const codeKey = CODE_TO_KEY[msg]
  const messageKey = MESSAGE_TO_KEY[msg]
  const key = codeKey || messageKey

  if (key && typeof t === 'function') {
    return t(key)
  }

  if (!CYRILLIC_RE.test(msg)) {
    return msg
  }

  return typeof t === 'function' ? t('genericError') : msg
}

export { CODE_TO_KEY, MESSAGE_TO_KEY }
