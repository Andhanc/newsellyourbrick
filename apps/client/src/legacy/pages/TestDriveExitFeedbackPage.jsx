import { useNavigate, useParams } from 'react-router-dom'
import TestDriveExitFeedbackModal from '../components/TestDriveExitFeedbackModal'
import './TestDriveExitFeedbackPage.css'

/** Публичная страница оценки после проживания (ссылка из WhatsApp). */
export default function TestDriveExitFeedbackPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  return (
    <div className="td-exit-feedback-page">
      <TestDriveExitFeedbackModal
        open={Boolean(token)}
        feedbackToken={token || null}
        onClose={() => navigate('/', { replace: true })}
        onSuccess={() => navigate('/', { replace: true })}
      />
    </div>
  )
}
