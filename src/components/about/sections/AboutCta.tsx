import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Container } from '../components/Container';
import { FadeIn } from '../components/FadeIn';
import { LUXURY_IMAGES } from '../data/aboutContent';

export function AboutCta() {
  return (
    <section className="al-cta" aria-labelledby="about-cta-title">
      <img className="al-cta__bg" src={LUXURY_IMAGES.cta} alt="" loading="lazy" decoding="async" />
      <div className="al-cta__overlay" aria-hidden="true" />
      <Container className="al-cta__inner">
        <FadeIn>
          <h2 id="about-cta-title" className="al-heading al-heading--light al-heading--center">
            Ready to Find Your Dream Home?
          </h2>
          <p className="al-cta__text">
            Connect with our advisors or explore premium listings curated for discerning buyers
            worldwide.
          </p>
          <div className="al-cta__actions">
            <Link to="/auction" className="al-btn al-btn--bronze">
              Browse Properties
              <ArrowRight size={18} aria-hidden />
            </Link>
            <a href="#about-agents" className="al-btn al-btn--outline-light">
              Book Consultation
            </a>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
