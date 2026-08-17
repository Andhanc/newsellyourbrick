import { publicAsset } from '../utils/publicAsset'

const SRC = publicAsset('images/owner-properties-test/owner-empty-no-properties.png')

/** Empty state: seller has no listings yet */
export default function OwnerEmptyPropertiesIllustration({ className = '' }) {
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
