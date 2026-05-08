import { useNavigate, useParams } from 'react-router-dom'
import TestDriveCheckInModal from '../components/TestDriveCheckInModal'
import './TestDriveSurveyPage.css'

/**
 * Публичный опрос по ссылке из WhatsApp (без обязательного входа).
 */
export default function TestDriveSurveyPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  return (
    <div className="td-survey-page">
      <TestDriveCheckInModal
        open={Boolean(token)}
        surveyToken={token || null}
        onClose={() => navigate('/', { replace: true })}
        onSuccess={() => navigate('/', { replace: true })}
      />
    </div>
  )
}
