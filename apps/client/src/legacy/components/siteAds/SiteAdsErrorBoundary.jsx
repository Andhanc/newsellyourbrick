import { Component } from 'react'

export default class SiteAdsErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('SiteAdsErrorBoundary:', error, info?.componentStack)
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}
