import { publicAsset } from '../utils/publicAsset'

const SRC = publicAsset('images/owner-properties-test/owner-empty-no-auctions.png')

/** Empty state: no upcoming auctions */
export default function OwnerEmptyAuctionsIllustration({ className = '' }) {
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
