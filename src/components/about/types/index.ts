export interface PropertyListing {
  id: string;
  title: string;
  location: string;
  price: string;
  beds: number;
  baths: number;
  area: string;
  image: string;
  href: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: 'agents' | 'listings' | 'legal' | 'support';
}

export interface CollectionItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
}

export interface ProcessStep {
  id: string;
  step: number;
  title: string;
  description: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  position: string;
  image: string;
  email: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar: string;
  rating: number;
}

export interface StatItem {
  id: string;
  value: number;
  suffix: string;
  label: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface HeroStat {
  value: string;
  label: string;
}
