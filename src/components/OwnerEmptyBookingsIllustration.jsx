import { publicAsset } from '../utils/publicAsset'

const SRC = publicAsset('images/owner-properties-test/owner-empty-no-bookings.png')

/** Empty state: no viewing bookings / reservations */
export default function OwnerEmptyBookingsIllustration({ className = '' }) {
  return (
    <img
      className={className}
      src={SRC}
      alt=""
      width={220}
      height={220}
      decoding="async"
      aria-hidden="true"
    />
  )
}
