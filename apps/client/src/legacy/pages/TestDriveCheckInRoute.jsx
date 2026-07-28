import { useNavigate, useParams } from 'react-router-dom'
import TestDriveCheckInModal from '../components/TestDriveCheckInModal'

/**
 * Глубокая ссылка /profile/bookings/:id/check-in — только модалка, без отдельной страницы.
 */
export default function TestDriveCheckInRoute() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  return (
    <TestDriveCheckInModal
      open
      bookingId={bookingId}
      onClose={() => navigate('/profile/bookings', { replace: true })}
      onSuccess={() => navigate('/profile/bookings', { replace: true })}
    />
  )
}
