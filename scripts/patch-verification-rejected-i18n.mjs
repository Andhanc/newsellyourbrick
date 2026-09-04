import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const dirs = [
  path.join(root, 'src/i18n/locales/mainPage'),
  path.join(root, 'apps/client/src/legacy/i18n/locales/mainPage'),
]

const translations = {
  en: {
    verificationRejectedGateTitle: 'Verification rejected',
    verificationRejectedGateIntro:
      'Your verification was rejected. Please complete verification again and upload your documents anew.',
    verificationRejectedGateReasonLabel: 'Reason:',
    verificationRejectedGateNoReason: 'No reason was provided.',
    verificationRejectedGateCta: 'Verify again',
    verificationRejectedGateVerificationTitle: 'Re-verification required',
    verificationRejectedGateVerificationSubtitle:
      'Upload passport photo, selfie, and selfie with passport. Documents will be sent for review again.',
    verificationRejectedGateVerificationSubtitleWithReason:
      'Reason: {{reason}}. Upload passport photo, selfie, and selfie with passport again.',
  },
  ru: {
    verificationRejectedGateTitle: 'Верификация отклонена',
    verificationRejectedGateIntro:
      'Администратор отклонил вашу верификацию. Пройдите её повторно и загрузите документы заново.',
    verificationRejectedGateReasonLabel: 'Причина:',
    verificationRejectedGateNoReason: 'Причина не указана.',
    verificationRejectedGateCta: 'Пройти верификацию снова',
    verificationRejectedGateVerificationTitle: 'Повторная верификация',
    verificationRejectedGateVerificationSubtitle:
      'Загрузите фото паспорта, селфи и селфи с паспортом. Документы снова отправятся на проверку.',
    verificationRejectedGateVerificationSubtitleWithReason:
      'Причина: {{reason}}. Загрузите фото паспорта, селфи и селфи с паспортом заново.',
  },
  de: {
    verificationRejectedGateTitle: 'Verifizierung abgelehnt',
    verificationRejectedGateIntro:
      'Ihre Verifizierung wurde abgelehnt. Bitte schließen Sie die Verifizierung erneut ab.',
    verificationRejectedGateReasonLabel: 'Grund:',
    verificationRejectedGateNoReason: 'Kein Grund angegeben.',
    verificationRejectedGateCta: 'Erneut verifizieren',
    verificationRejectedGateVerificationTitle: 'Erneute Verifizierung',
    verificationRejectedGateVerificationSubtitle:
      'Laden Sie Passfoto, Selfie und Selfie mit Pass hoch. Die Dokumente werden erneut geprüft.',
    verificationRejectedGateVerificationSubtitleWithReason:
      'Grund: {{reason}}. Laden Sie Passfoto, Selfie und Selfie mit Pass erneut hoch.',
  },
  es: {
    verificationRejectedGateTitle: 'Verificación rechazada',
    verificationRejectedGateIntro:
      'Su verificación fue rechazada. Complete la verificación de nuevo y suba los documentos otra vez.',
    verificationRejectedGateReasonLabel: 'Motivo:',
    verificationRejectedGateNoReason: 'No se indicó el motivo.',
    verificationRejectedGateCta: 'Verificar de nuevo',
    verificationRejectedGateVerificationTitle: 'Reverificación',
    verificationRejectedGateVerificationSubtitle:
      'Suba foto del pasaporte, selfie y selfie con pasaporte. Los documentos se enviarán de nuevo a revisión.',
    verificationRejectedGateVerificationSubtitleWithReason:
      'Motivo: {{reason}}. Suba foto del pasaporte, selfie y selfie con pasaporte otra vez.',
  },
  fr: {
    verificationRejectedGateTitle: 'Vérification refusée',
    verificationRejectedGateIntro:
      'Votre vérification a été refusée. Veuillez la refaire et téléverser vos documents à nouveau.',
    verificationRejectedGateReasonLabel: 'Motif :',
    verificationRejectedGateNoReason: 'Aucun motif indiqué.',
    verificationRejectedGateCta: 'Revérifier',
    verificationRejectedGateVerificationTitle: 'Nouvelle vérification',
    verificationRejectedGateVerificationSubtitle:
      'Téléversez photo du passeport, selfie et selfie avec passeport. Les documents seront renvoyés pour examen.',
    verificationRejectedGateVerificationSubtitleWithReason:
      'Motif : {{reason}}. Téléversez photo du passeport, selfie et selfie avec passeport à nouveau.',
  },
  pl: {
    verificationRejectedGateTitle: 'Weryfikacja odrzucona',
    verificationRejectedGateIntro:
      'Twoja weryfikacja została odrzucona. Przejdź ją ponownie i prześlij dokumenty od nowa.',
    verificationRejectedGateReasonLabel: 'Powód:',
    verificationRejectedGateNoReason: 'Nie podano powodu.',
    verificationRejectedGateCta: 'Zweryfikuj ponownie',
    verificationRejectedGateVerificationTitle: 'Ponowna weryfikacja',
    verificationRejectedGateVerificationSubtitle:
      'Prześlij zdjęcie paszportu, selfie i selfie z paszportem. Dokumenty trafią ponownie do moderacji.',
    verificationRejectedGateVerificationSubtitleWithReason:
      'Powód: {{reason}}. Prześlij zdjęcie paszportu, selfie i selfie z paszportem ponownie.',
  },
  sv: {
    verificationRejectedGateTitle: 'Verifiering avvisad',
    verificationRejectedGateIntro:
      'Din verifiering avvisades. Slutför verifieringen igen och ladda upp dokumenten på nytt.',
    verificationRejectedGateReasonLabel: 'Orsak:',
    verificationRejectedGateNoReason: 'Ingen orsak angavs.',
    verificationRejectedGateCta: 'Verifiera igen',
    verificationRejectedGateVerificationTitle: 'Omverifiering',
    verificationRejectedGateVerificationSubtitle:
      'Ladda upp passfoto, selfie och selfie med pass. Dokumenten skickas till granskning igen.',
    verificationRejectedGateVerificationSubtitleWithReason:
      'Orsak: {{reason}}. Ladda upp passfoto, selfie och selfie med pass igen.',
  },
}

for (const dir of dirs) {
  for (const [locale, entries] of Object.entries(translations)) {
    const filePath = path.join(dir, `${locale}.json`)
    const json = JSON.parse(readFileSync(filePath, 'utf8'))
    Object.assign(json, entries)
    writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`)
    console.log('patched', filePath)
  }
}
