import { Container } from '../components/Container';
import { PropertyCard } from '../components/PropertyCard';
import { SectionHeader } from '../components/SectionHeader';
import { FEATURED_PROPERTIES } from '../data/aboutContent';

export function FeaturedProperties() {
  return (
    <section
      id="about-intro"
      className="al-section al-section--cream al-properties-section"
      aria-labelledby="featured-properties-title"
    >
      <Container>
        <SectionHeader
          eyebrow="Featured Listings"
          title="Exceptional Properties"
          subtitle="Handpicked residences defined by location, architecture, and long-term value."
        />
        <div className="al-properties-grid">
          {FEATURED_PROPERTIES.map((property, index) => (
            <PropertyCard key={property.id} property={property} index={index} />
          ))}
        </div>
      </Container>
    </section>
  );
}
