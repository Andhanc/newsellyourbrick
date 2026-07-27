import { Container } from '../components/Container';
import { AgentCard } from '../components/AgentCard';
import { SectionHeader } from '../components/SectionHeader';
import { FEATURED_AGENTS } from '../data/aboutContent';

export function FeaturedAgents() {
  return (
    <section id="about-agents" className="al-section al-section--cream" aria-labelledby="agents-title">
      <Container>
        <SectionHeader
          eyebrow="Our Team"
          title="Featured Agents"
          subtitle="Meet the specialists guiding our clients through the world's finest properties."
        />
        <div className="al-agents-grid">
          {FEATURED_AGENTS.map((agent, index) => (
            <AgentCard key={agent.id} agent={agent} index={index} />
          ))}
        </div>
      </Container>
    </section>
  );
}
