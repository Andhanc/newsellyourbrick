import { Container } from '../components/Container';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { FadeIn } from '../components/FadeIn';
import { SectionHeader } from '../components/SectionHeader';
import { MARKET_STATS } from '../data/aboutContent';

export function MarketStatistics() {
  return (
    <section className="al-section al-section--dark" aria-labelledby="market-stats-title">
      <Container>
        <SectionHeader
          eyebrow="Market Presence"
          title="Numbers that define our reputation"
          subtitle="Two decades of premium real estate expertise, delivered with modern technology."
        />
        <div className="al-stats-grid">
          {MARKET_STATS.map((stat, index) => (
            <FadeIn key={stat.id} delay={index * 0.08} className="al-stat-card">
              <div className="al-stat-card__value">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <p className="al-stat-card__label">{stat.label}</p>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
