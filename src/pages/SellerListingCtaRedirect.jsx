import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { navigateSellerListingCta } from '../utils/navigateSellerListingCta'

/** Legacy /owner/property/new → новый флоу или «стать продавцом» в профиле. */
export default function SellerListingCtaRedirect() {
  const navigate = useNavigate()
  const { user, isLoaded: userLoaded } = useUser()

  useEffect(() => {
    void navigateSellerListingCta(navigate, { user, userLoaded })
  }, [navigate, user, userLoaded])

  return null
}
