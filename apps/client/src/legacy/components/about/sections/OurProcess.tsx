import { Container } from '../components/Container';
import { Stagger, StaggerItem } from '../components/FadeIn';
import { SectionHeader } from '../components/SectionHeader';
import { PROCESS_STEPS } from '../data/aboutContent';

export function OurProcess() {
  return (
    <section className="al-section al-section--white" aria-labelledby="process-title">
      <Container>
        <SectionHeader
          eyebrow="Our Process"
          title="From discovery to keys in hand"
          subtitle="A refined four-step journey designed for clarity, confidence, and exceptional outcomes."
        />
        <Stagger className="al-process-grid">
          {PROCESS_STEPS.map((step) => (
            <StaggerItem key={step.id}>
              <article className="al-process-card">
                <span className="al-process-card__num">{step.step}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
