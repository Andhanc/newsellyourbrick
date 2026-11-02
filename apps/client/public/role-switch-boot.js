// Keep the branded transition visible before the application bundle and route chunks load.
(() => {
  try {
    const transition = JSON.parse(sessionStorage.getItem('role-switch-transition') || 'null')
    const user = JSON.parse(localStorage.getItem('userData') || 'null')
    if (!transition || transition.phase !== 'committed' || !user) return
    const expectedPath = transition.role === 'seller' ? '/owner-test/profile' : '/profile'
    const role = user.role === 'owner' ? 'seller' : user.role === 'client' ? 'buyer' : user.role
    const age = Date.now() - transition.startedAt
    if (!['buyer', 'seller'].includes(transition.role) || transition.path !== expectedPath ||
      String(user.id) !== transition.userId || role !== transition.role || age < 0 || age > 45000) return
    const loader = document.createElement('div')
    loader.id = 'role-switch-boot-loader'
    loader.className = 'role-switch-preloader'
    loader.setAttribute('role', 'status')
    loader.setAttribute('aria-busy', 'true')
    loader.innerHTML = '<div class="role-switch-preloader__glow"></div><div class="role-switch-preloader__content"><div class="role-switch-preloader__emblem"><span class="role-switch-preloader__orbit"></span><img alt="" width="72" height="72"></div><div class="role-switch-preloader__brand">Sell <span class="site-brand__wordmark-accent">Your</span> Brick</div><p class="role-switch-preloader__message"></p><div class="role-switch-preloader__track"><span></span></div></div>'
    loader.querySelector('img').src = new URL('icons/icon-192.png', document.currentScript.src).href
    loader.querySelector('p').textContent = String(transition.label || '')
    document.body.append(loader)
    // A failed bundle must not leave an unbounded overlay.
    setTimeout(() => loader.remove(), Math.max(1, 45000 - age))
  } catch {
    // Unavailable storage must never prevent the normal application from booting.
  }
})()
