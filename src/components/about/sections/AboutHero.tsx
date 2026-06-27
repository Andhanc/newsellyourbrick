'use client';

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Container } from '../components/Container';
import { FadeIn } from '../components/FadeIn';
import { HERO_STATS, LUXURY_IMAGES } from '../data/aboutContent';

export function AboutHero() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [budget, setBudget] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('q', location);
    if (propertyType) params.set('type', propertyType);
    if (bedrooms) params.set('beds', bedrooms);
    if (budget) params.set('budget', budget);
    navigate(`/search${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <section className="al-hero" aria-label="Hero">
      <img className="al-hero__bg" src={LUXURY_IMAGES.hero} alt="" fetchPriority="high" decoding="async" />
      <div className="al-hero__overlay" aria-hidden="true" />

      <Container className="al-hero__inner">
        <FadeIn className="al-hero__copy">
          <span className="al-hero__badge">Luxury Real Estate</span>
          <h1 className="al-hero__title">Find Your Dream Property</h1>
          <p className="al-hero__lead">
            SellYourBrick connects discerning buyers and sellers with premium homes, transparent
            auctions, and white-glove service across the world&apos;s most desirable markets.
          </p>
          <div className="al-hero__actions">
            <Link to="/auction" className="al-btn al-btn--bronze">
              Browse Properties
              <ArrowRight size={18} aria-hidden />
            </Link>
            <a href="#about-agents" className="al-btn al-btn--hero-ghost">
              Book Consultation
            </a>
          </div>
        </FadeIn>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="al-hero__stats"
        >
          {HERO_STATS.map((stat) => (
            <div key={stat.label}>
              <div className="al-hero__stat-value">{stat.value}</div>
              <div className="al-hero__stat-label">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </Container>

      <div className="al-hero__search-wrap">
        <Container>
          <FadeIn delay={0.2}>
            <div className="al-search-panel">
              <div className="al-search-panel__grid">
                <label className="al-field">
                  <span className="al-field__label">Location</span>
                  <input
                    type="text"
                    className="al-field__input"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, region or country"
                  />
                </label>
                <label className="al-field">
                  <span className="al-field__label">Property Type</span>
                  <select
                    className="al-field__select"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                  >
                    <option value="">Any type</option>
                    <option value="villa">Villa</option>
                    <option value="apartment">Apartment</option>
                    <option value="penthouse">Penthouse</option>
                    <option value="estate">Country Estate</option>
                  </select>
                </label>
                <label className="al-field">
                  <span className="al-field__label">Bedrooms</span>
                  <select
                    className="al-field__select"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                  </select>
                </label>
                <label className="al-field">
                  <span className="al-field__label">Budget</span>
                  <select
                    className="al-field__select"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  >
                    <option value="">Any budget</option>
                    <option value="500k">Up to €500K</option>
                    <option value="1m">Up to €1M</option>
                    <option value="3m">Up to €3M</option>
                    <option value="5m">€5M+</option>
                  </select>
                </label>
                <button type="button" className="al-btn al-btn--dark al-search-panel__btn" onClick={handleSearch}>
                  <Search size={18} aria-hidden />
                  Search
                </button>
              </div>
            </div>
          </FadeIn>
        </Container>
      </div>
    </section>
  );
}
