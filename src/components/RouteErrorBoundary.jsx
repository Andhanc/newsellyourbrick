import { Component } from 'react'

/**
 * Ловит сбои рендера и отказ динамического импорта после исчерпания lazyWithRetry.
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
            Не удалось загрузить часть интерфейса. Часто это происходит после обновления сайта.
          </p>
          <button
            type="button"
            className="route-error-boundary__btn"
            onClick={() => window.location.reload()}
          >
            Обновить страницу
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
