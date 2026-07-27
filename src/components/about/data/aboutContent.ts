import type {
  AgentProfile,
  CollectionItem,
  FaqItem,
  FeatureItem,
  HeroStat,
  ProcessStep,
  PropertyListing,
  StatItem,
  Testimonial,
} from '../types';

export const LUXURY_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920&q=85&auto=format&fit=crop',
  whyUs: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85&auto=format&fit=crop',
  cta: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=85&auto=format&fit=crop',
} as const;

export const HERO_STATS: HeroStat[] = [
  { value: '1500+', label: 'Properties Sold' },
  { value: '98%', label: 'Client Satisfaction' },
  { value: '20+', label: 'Years Experience' },
  { value: '40+', label: 'Cities' },
];

export const FEATURED_PROPERTIES: PropertyListing[] = [
  {
    id: 'p1',
    title: 'Oceanfront Villa Marbella',
    location: 'Marbella, Spain',
    price: '€4,850,000',
    beds: 5,
    baths: 6,
    area: '620 m²',
    image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=900&q=80&auto=format&fit=crop',
    href: '/auction',
  },
  {
    id: 'p2',
    title: 'Skyline Penthouse Dubai',
    location: 'Dubai Marina, UAE',
    price: '€3,200,000',
    beds: 4,
    baths: 5,
    area: '410 m²',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80&auto=format&fit=crop',
    href: '/auction',
  },
  {
    id: 'p3',
    title: 'Alpine Chalet Zermatt',
    location: 'Zermatt, Switzerland',
    price: '€6,100,000',
    beds: 6,
    baths: 7,
    area: '780 m²',
    image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=900&q=80&auto=format&fit=crop',
    href: '/auction',
  },
  {
    id: 'p4',
    title: 'Modern Loft Manhattan',
    location: 'New York, USA',
    price: '€2,450,000',
    beds: 3,
    baths: 3,
    area: '285 m²',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=80&auto=format&fit=crop',
    href: '/auction',
  },
  {
    id: 'p5',
    title: 'Mediterranean Estate',
    location: 'Amalfi Coast, Italy',
    price: '€5,600,000',
    beds: 7,
    baths: 8,
    area: '920 m²',
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=80&auto=format&fit=crop',
    href: '/auction',
  },
  {
    id: 'p6',
    title: 'Glass Residence Lisbon',
    location: 'Lisbon, Portugal',
    price: '€1,980,000',
    beds: 4,
    baths: 4,
    area: '340 m²',
    image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=900&q=80&auto=format&fit=crop',
    href: '/auction',
  },
];

export const WHY_CHOOSE_FEATURES: FeatureItem[] = [
  {
    id: 'f1',
    title: 'Trusted Agents',
    description: 'Licensed professionals with deep local expertise and a white-glove approach to every transaction.',
    icon: 'agents',
  },
  {
    id: 'f2',
    title: 'Premium Listings',
    description: 'Curated portfolio of verified luxury homes, auctions, and investment-grade opportunities.',
    icon: 'listings',
  },
  {
    id: 'f3',
    title: 'Legal Assistance',
    description: 'End-to-end document support, verification, and compliance guidance for cross-border deals.',
    icon: 'legal',
  },
  {
    id: 'f4',
    title: '24/7 Support',
    description: 'Dedicated managers and AI assistance available around the clock for buyers and sellers.',
    icon: 'support',
  },
];

export const LUXURY_COLLECTIONS: CollectionItem[] = [
  {
    id: 'c1',
    title: 'Beach Villas',
    subtitle: 'Coastal estates with private access and panoramic sea views.',
    image: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&q=80&auto=format&fit=crop',
    href: '/auction',
  },
  {
    id: 'c2',
    title: 'Modern Apartments',
    subtitle: 'Architect-designed residences in the world’s most desirable districts.',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80&auto=format&fit=crop',
    href: '/auction?filter=buy_now',
  },
  {
    id: 'c3',
    title: 'Penthouses',
    subtitle: 'Sky-high living with bespoke interiors and skyline terraces.',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80&auto=format&fit=crop',
    href: '/auction',
  },
  {
    id: 'c4',
    title: 'Country Houses',
    subtitle: 'Elegant rural retreats surrounded by nature and absolute privacy.',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80&auto=format&fit=crop',
    href: '/shares',
  },
];

export const PROCESS_STEPS: ProcessStep[] = [
  {
    id: 's1',
    step: 1,
    title: 'Search',
    description: 'Explore curated listings, map search, and smart filters tailored to your lifestyle.',
  },
  {
    id: 's2',
    step: 2,
    title: 'Visit',
    description: 'Schedule private viewings or virtual tours with our dedicated property specialists.',
  },
  {
    id: 's3',
    step: 3,
    title: 'Purchase',
    description: 'Transparent auctions, secure payments, and full legal support through closing.',
  },
  {
    id: 's4',
    step: 4,
    title: 'Move In',
    description: 'Concierge handover, documentation, and ongoing property management if needed.',
  },
];

export const FEATURED_AGENTS: AgentProfile[] = [
  {
    id: 'a1',
    name: 'Elena Vasquez',
    position: 'Senior Luxury Advisor',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80&auto=format&fit=crop',
    email: 'elena@sellyourbrick.com',
  },
  {
    id: 'a2',
    name: 'James Whitfield',
    position: 'International Sales Director',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80&auto=format&fit=crop',
    email: 'james@sellyourbrick.com',
  },
  {
    id: 'a3',
    name: 'Sofia Laurent',
    position: 'Investment Properties Lead',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80&auto=format&fit=crop',
    email: 'sofia@sellyourbrick.com',
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    name: 'Alexander Reed',
    role: 'Villa Buyer, Costa del Sol',
    quote:
      'SellYourBrick made our cross-border purchase effortless. The team handled every detail with precision and discretion.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format&fit=crop',
    rating: 5,
  },
  {
    id: 't2',
    name: 'Isabella Chen',
    role: 'Investor, Dubai & Lisbon',
    quote:
      'From auction bidding to final paperwork, the platform felt premium at every step. Truly agency-level service online.',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80&auto=format&fit=crop',
    rating: 5,
  },
  {
    id: 't3',
    name: 'Marcus Doyle',
    role: 'Seller, Alpine Estate',
    quote:
      'Our property reached qualified international buyers within days. The marketing and negotiation support were outstanding.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80&auto=format&fit=crop',
    rating: 5,
  },
];

export const MARKET_STATS: StatItem[] = [
  { id: 'ms1', value: 1500, suffix: '+', label: 'Properties Sold' },
  { id: 'ms2', value: 3200, suffix: '+', label: 'Happy Clients' },
  { id: 'ms3', value: 40, suffix: '+', label: 'Cities' },
  { id: 'ms4', value: 18, suffix: '', label: 'Industry Awards' },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq1',
    question: 'How do I schedule a private property viewing?',
    answer:
      'Contact any featured agent or use the consultation button. We arrange in-person or virtual tours at your convenience, including international travel coordination.',
  },
  {
    id: 'faq2',
    question: 'Can I participate in online property auctions?',
    answer:
      'Yes. SellYourBrick offers transparent real-time auctions with verified listings, bid history, and secure reservation payments through your account wallet.',
  },
  {
    id: 'faq3',
    question: 'Do you assist with legal and cross-border transactions?',
    answer:
      'Our legal assistance covers document verification, compliance checklists, and coordination with local notaries and partners in each market we serve.',
  },
  {
    id: 'faq4',
    question: 'What types of luxury properties are available?',
    answer:
      'Beach villas, penthouses, modern apartments, country estates, fractional shares, and select investment-grade assets across 40+ cities worldwide.',
  },
  {
    id: 'faq5',
    question: 'How does seller commission work?',
    answer:
      'Listing packages start from €49 per lot with a transparent 1% success commission. Premium placement and VIP Club options are available on request.',
  },
];
