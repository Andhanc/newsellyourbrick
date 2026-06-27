import { Headphones, Scale, ShieldCheck, Sparkles } from 'lucide-react';
import { Container } from '../components/Container';
import { FadeIn } from '../components/FadeIn';
import { SectionHeader } from '../components/SectionHeader';
import { LUXURY_IMAGES, WHY_CHOOSE_FEATURES } from '../data/aboutContent';
import type { FeatureItem } from '../types';

const ICONS = {
  agents: ShieldCheck,
  listings: Sparkles,
  legal: Scale,
  support: Headphones,
} as const;

function FeatureCard({ feature, index }: { feature: FeatureItem; index: number }) {
  const Icon = ICONS[feature.icon];
  return (
    <FadeIn delay={index * 0.08} className="al-feature-card">
      <div className="al-feature-card__icon">
        <Icon size={22} />
      </div>
      <h3>{feature.title}</h3>
      <p>{feature.description}</p>
    </FadeIn>
  );
}

export function WhyChooseUs() {
  return (
    <section className="al-section al-section--white" aria-labelledby="why-choose-title">
      <Container>
        <div className="al-split">
          <FadeIn className="al-split__image">
            <img src={LUXURY_IMAGES.whyUs} alt="" loading="lazy" decoding="async" />
          </FadeIn>
          <div>
            <SectionHeader
              align="left"
              eyebrow="Why Choose Us"
              title="A standard of excellence in every detail"
              subtitle="SellYourBrick blends boutique brokerage service with modern technology for buyers, sellers, and investors."
            />
            <div className="al-features-grid">
              {WHY_CHOOSE_FEATURES.map((feature, index) => (
                <FeatureCard key={feature.id} feature={feature} index={index} />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
