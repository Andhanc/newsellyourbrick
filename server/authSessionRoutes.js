/** Confirms the identity of an opaque application session; never trusts a client userId. */
export function registerAuthSessionRoutes(app, { authenticateMobileRequest, getUserById }) {
  app.get('/api/auth/mobile/session', async (req, res) => {
    try {
      const session = await authenticateMobileRequest(req)
      if (!session) return res.status(401).json({ success: false, error: 'Invalid session' })
      const user = await getUserById(session.userId)
      if (!user) return res.status(401).json({ success: false, error: 'Invalid session' })
      if (user.is_blocked === 1 || user.is_blocked === true) {
        return res.status(403).json({ success: false, error: 'User is blocked' })
      }
      res.set('Cache-Control', 'no-store')
      return res.json({ success: true, user: { id: user.id, role: user.role, email: user.email } })
    } catch {
      return res.status(503).json({ success: false, error: 'Session verification unavailable' })
    }
  })
}
