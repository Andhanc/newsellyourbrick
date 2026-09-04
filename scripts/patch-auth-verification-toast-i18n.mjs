import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const dirs = [
  path.join(root, 'src/i18n/locales/mainPage'),
  path.join(root, 'apps/client/src/legacy/i18n/locales/mainPage'),
]

const translations = {
  ru: {
    authToast_welcome: 'Добро пожаловать, {{name}}!',
    authToast_registrationComplete: 'Добро пожаловать, {{name}}! Регистрация завершена.',
    authToast_userFallback: 'Пользователь',
    authToast_documentsSubmitted:
      'Документы отправлены на верификацию. Вы получите уведомление после проверки.',
    verificationApprovedCelebrationTitle: 'Поздравляем!',
    verificationApprovedCelebrationText:
      'Ваши документы одобрены. Теперь вы можете полноценно пользоваться сервисом.',
    verificationApprovedCelebrationCta: 'Перейти в профиль',
  },
  en: {
    authToast_welcome: 'Welcome, {{name}}!',
    authToast_registrationComplete: 'Welcome, {{name}}! Registration complete.',
    authToast_userFallback: 'User',
    authToast_documentsSubmitted:
      'Documents submitted for verification. You will be notified after review.',
    verificationApprovedCelebrationTitle: 'Congratulations!',
    verificationApprovedCelebrationText:
      'Your documents were approved. You can now use the service fully.',
    verificationApprovedCelebrationCta: 'Go to profile',
  },
  de: {
    authToast_welcome: 'Willkommen, {{name}}!',
    authToast_registrationComplete: 'Willkommen, {{name}}! Registrierung abgeschlossen.',
    authToast_userFallback: 'Benutzer',
    authToast_documentsSubmitted:
      'Dokumente zur Verifizierung gesendet. Sie erhalten eine Benachrichtigung nach der Prüfung.',
    verificationApprovedCelebrationTitle: 'Glückwunsch!',
    verificationApprovedCelebrationText:
      'Ihre Dokumente wurden genehmigt. Sie können den Service jetzt voll nutzen.',
    verificationApprovedCelebrationCta: 'Zum Profil',
  },
  es: {
    authToast_welcome: '¡Bienvenido/a, {{name}}!',
    authToast_registrationComplete: '¡Bienvenido/a, {{name}}! Registro completado.',
    authToast_userFallback: 'Usuario',
    authToast_documentsSubmitted:
      'Documentos enviados para verificación. Recibirá una notificación tras la revisión.',
    verificationApprovedCelebrationTitle: '¡Felicidades!',
    verificationApprovedCelebrationText:
      'Sus documentos fueron aprobados. Ya puede usar el servicio plenamente.',
    verificationApprovedCelebrationCta: 'Ir al perfil',
  },
  fr: {
    authToast_welcome: 'Bienvenue, {{name}} !',
    authToast_registrationComplete: 'Bienvenue, {{name}} ! Inscription terminée.',
    authToast_userFallback: 'Utilisateur',
    authToast_documentsSubmitted:
      'Documents envoyés pour vérification. Vous serez notifié après l’examen.',
    verificationApprovedCelebrationTitle: 'Félicitations !',
    verificationApprovedCelebrationText:
      'Vos documents ont été approuvés. Vous pouvez désormais utiliser pleinement le service.',
    verificationApprovedCelebrationCta: 'Aller au profil',
  },
  pl: {
    authToast_welcome: 'Witamy, {{name}}!',
    authToast_registrationComplete: 'Witamy, {{name}}! Rejestracja zakończona.',
    authToast_userFallback: 'Użytkownik',
    authToast_documentsSubmitted:
      'Dokumenty wysłane do weryfikacji. Otrzymasz powiadomienie po sprawdzeniu.',
    verificationApprovedCelebrationTitle: 'Gratulacje!',
    verificationApprovedCelebrationText:
      'Twoje dokumenty zostały zatwierdzone. Możesz już w pełni korzystać z serwisu.',
    verificationApprovedCelebrationCta: 'Przejdź do profilu',
  },
  sv: {
    authToast_welcome: 'Välkommen, {{name}}!',
    authToast_registrationComplete: 'Välkommen, {{name}}! Registreringen är klar.',
    authToast_userFallback: 'Användare',
    authToast_documentsSubmitted:
      'Dokument skickade för verifiering. Du får en avisering efter granskningen.',
    verificationApprovedCelebrationTitle: 'Grattis!',
    verificationApprovedCelebrationText:
      'Dina dokument har godkänts. Du kan nu använda tjänsten fullt ut.',
    verificationApprovedCelebrationCta: 'Gå till profilen',
  },
}

for (const dir of dirs) {
  for (const [locale, keys] of Object.entries(translations)) {
    const filePath = path.join(dir, `${locale}.json`)
    const data = JSON.parse(readFileSync(filePath, 'utf8'))
    Object.assign(data, keys)
    writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
    console.log('updated', filePath)
  }
}
