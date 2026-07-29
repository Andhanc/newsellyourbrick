import { Navigate } from 'react-router-dom'
import { getCabinetDataPath } from '../utils/cabinetRoutes'

/** /data — устаревший маршрут; ведём в актуальный раздел «Данные» кабинета. */
export default function CabinetDataRedirect() {
  return <Navigate to={getCabinetDataPath()} replace />
}
