import { publicAsset } from '../utils/publicAsset'

const PALM_SRC = publicAsset('images/property-detail/test-drive-palm-tiffany-3d.png')

/** Иллюстрация: отдых в объекте перед покупкой (тест-драйв) */
export default function TestDrivePromoIllustration({ className = '' }) {
  return (
    <img
      className={className}
      src={PALM_SRC}
      alt=""
      width={132}
      height={198}
      decoding="async"
      aria-hidden="true"
    />
  )
}
