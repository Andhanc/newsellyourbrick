'use client';

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Container } from '../components/Container';
import { SectionHeader } from '../components/SectionHeader';
import { LUXURY_COLLECTIONS } from '../data/aboutContent';

export function LuxuryCollections() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="al-section al-section--cream" aria-labelledby="collections-title">
      <Container>
        <SectionHeader
          eyebrow="Collections"
          title="Luxury Collections"
          subtitle="Explore signature property categories curated for distinct lifestyles and investment goals."
        />
        <div className="al-collections">
          {LUXURY_COLLECTIONS.map((item, index) => (
            <motion.div
              key={item.id}
              initial={reduceMotion ? false : { opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
            >
              <Link to={item.href} className="al-collection-card">
                <div className="al-collection-card__media">
                  <img src={item.image} alt="" loading="lazy" decoding="async" />
                </div>
                <div className="al-collection-card__body">
                  <p className="al-collection-card__index">
                    Collection {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3>{item.title}</h3>
                  <p>{item.subtitle}</p>
                  <span className="al-collection-card__link">
                    Explore collection
                    <ArrowRight size={16} aria-hidden />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
