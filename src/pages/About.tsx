'use client';

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import { AboutHero } from '@/components/about/sections/AboutHero';
import { FeaturedProperties } from '@/components/about/sections/FeaturedProperties';
import { WhyChooseUs } from '@/components/about/sections/WhyChooseUs';
import { LuxuryCollections } from '@/components/about/sections/LuxuryCollections';
import { OurProcess } from '@/components/about/sections/OurProcess';
import { FeaturedAgents } from '@/components/about/sections/FeaturedAgents';
import { ClientTestimonials } from '@/components/about/sections/ClientTestimonials';
import { MarketStatistics } from '@/components/about/sections/MarketStatistics';
import { AboutFaq } from '@/components/about/sections/AboutFaq';
import { AboutCta } from '@/components/about/sections/AboutCta';
import { AboutLandingFooter } from '@/components/about/sections/AboutLandingFooter';
import { scrollMainTo } from '@/utils/mainScroll';
import './about-luxury.css';

const HASH_TARGETS: Record<string, string> = {
  '#about-intro': 'about-intro',
  '#about-agents': 'about-agents',
  '#about-faq': 'about-faq',
  '#about-services': 'about-intro',
};

export default function About() {
  const location = useLocation();

  useEffect(() => {
    scrollMainTo(0, 0);
    window.dispatchEvent(new Event('resetSection'));
  }, []);

  useEffect(() => {
    const targetId = HASH_TARGETS[location.hash];
    if (!targetId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  return (
    <div className="al-page">
      <Header />
      <main>
        <AboutHero />
        <FeaturedProperties />
        <WhyChooseUs />
        <LuxuryCollections />
        <OurProcess />
        <FeaturedAgents />
        <ClientTestimonials />
        <MarketStatistics />
        <AboutFaq />
        <AboutCta />
      </main>
      <AboutLandingFooter />
    </div>
  );
}
