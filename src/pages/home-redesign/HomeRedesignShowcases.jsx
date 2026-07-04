import InvestorHomeShowcases from '../../components/InvestorHomeShowcases'
import HomeRedesignNewsSection from './HomeRedesignNewsSection'
import '../InvestorHomePage.css'

export default function HomeRedesignShowcases() {
  return (
    <div className="invest-home-page hr-showcases">
      <InvestorHomeShowcases />
      <HomeRedesignNewsSection />
    </div>
  )
}
