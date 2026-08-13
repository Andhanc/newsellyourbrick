export const SURVEY_STEP_COUNT = 6

export const SURVEY_HIGHLIGHT_KEYS = ['interior', 'bed', 'price', 'kitchen', 'location']

export const SURVEY_NAV_KEYS = [
  'tdSurvey_nav1',
  'tdSurvey_nav2',
  'tdSurvey_nav3',
  'tdSurvey_nav4',
  'tdSurvey_nav5',
  'tdSurvey_nav6',
]

export function createEmptySurveyForm() {
  return {
    first_impression: '',
    first_impression_comment: '',
    comfort: '',
    comfort_missing_comment: '',
    comfort_photos: [],
    highlights: [],
    highlights_comment: '',
    price_impression: '',
    price_improve_comment: '',
    purchase_intent: '',
    purchase_comment: '',
    overall_rating: null,
  }
}

export function toggleSurveyHighlight(list, key) {
  const k = String(key)
  if (list.includes(k)) return list.filter((x) => x !== k)
  return [...list, k]
}

export function filesToDataUrls(files) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = reject
          reader.readAsDataURL(file)
        }),
    ),
  )
}

/** @returns {{ key: string, params?: Record<string, unknown> } | null} */
export function getSurveyStepBlockReason(step, form) {
  switch (step) {
    case 0:
      if (!form.first_impression) return { key: 'tdSurvey_err_s1_pick' }
      return null
    case 1:
      if (!form.comfort) return { key: 'tdSurvey_err_s2_pick' }
      if (form.comfort === 'mostly_but_missing' && !String(form.comfort_missing_comment || '').trim()) {
        return { key: 'tdSurvey_err_s2_missing' }
      }
      return null
    case 2:
      if (!form.highlights?.length) return { key: 'tdSurvey_err_s3_pick' }
      return null
    case 3:
      if (!form.price_impression) return { key: 'tdSurvey_err_s4_pick' }
      return null
    case 4:
      if (!form.purchase_intent) return { key: 'tdSurvey_err_s5_pick' }
      return null
    case 5: {
      const rating = Number(form.overall_rating)
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return { key: 'tdSurvey_s6_err_rating' }
      }
      return null
    }
    default:
      return null
  }
}

export function isSurveyStepValid(step, form) {
  return getSurveyStepBlockReason(step, form) === null
}

export function canNavigateSurveyStep(target, form) {
  if (target < 0 || target >= SURVEY_STEP_COUNT) return false
  for (let j = 0; j < target; j += 1) {
    if (!isSurveyStepValid(j, form)) return false
  }
  return true
}

export function canSubmitSurveyForm(form) {
  for (let j = 0; j < 5; j += 1) {
    if (!isSurveyStepValid(j, form)) return false
  }
  return isSurveyStepValid(5, form)
}

export function buildSurveyReportPayload(form) {
  const trim = (s) => String(s || '').trim()
  return {
    survey_version: 2,
    first_impression: form.first_impression,
    first_impression_comment: trim(form.first_impression_comment),
    comfort: form.comfort,
    comfort_missing_comment:
      form.comfort === 'mostly_but_missing' ? trim(form.comfort_missing_comment) : '',
    comfort_photos: Array.isArray(form.comfort_photos) ? form.comfort_photos.filter(Boolean) : [],
    highlights: Array.isArray(form.highlights) ? [...form.highlights] : [],
    highlights_comment: trim(form.highlights_comment),
    price_impression: form.price_impression,
    price_improve_comment: trim(form.price_improve_comment),
    purchase_intent: form.purchase_intent,
    purchase_comment: trim(form.purchase_comment),
    overall_rating: Math.round(Number(form.overall_rating)),
    submitted_at: new Date().toISOString(),
  }
}
