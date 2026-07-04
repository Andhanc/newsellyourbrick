import AuctionCategoryCtaCards from './AuctionCategoryCtaCards'
import FAQ from './FAQ'

function AuctionPageBottomSections({ onContactClick }) {
  return (
    <>
      <AuctionCategoryCtaCards />
      <FAQ onContactClick={onContactClick} />
    </>
  )
}

export default AuctionPageBottomSections
