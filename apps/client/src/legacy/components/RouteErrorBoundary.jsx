import { Component } from 'react'
import i18n from '../i18n/config'

/**
 * Catches render failures and lazy-import exhaustion after lazyWithRetry.
 */
export default class RouteErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('RouteErrorBoundary:', error, info?.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="route-error-boundary">
          <p className="route-error-boundary__text">
            {i18n.t('routeError_message')}
          </p>
          <button
            type="button"
            className="route-error-boundary__btn"
            onClick={() => window.location.reload()}
          >
            {i18n.t('routeError_reload')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
