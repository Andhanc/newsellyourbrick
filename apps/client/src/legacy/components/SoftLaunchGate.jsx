import { useLocation } from 'react-router-dom'
import { shouldShowSoftLaunchUnavailable } from '../utils/softLaunchAccess'
import FeatureUnavailablePage from './FeatureUnavailablePage'

/**
 * Soft-launch wrapper: replaces blocked routes with «Пока недоступно».
 * Admin / marketer and allowlisted paths pass through.
 */
export default function SoftLaunchGate({ children }) {
  const { pathname } = useLocation()

  if (shouldShowSoftLaunchUnavailable(pathname)) {
    return <FeatureUnavailablePage />
  }

  return children
}
