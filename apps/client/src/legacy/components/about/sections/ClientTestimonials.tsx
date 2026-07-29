'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Container } from '../components/Container';
import { SectionHeader } from '../components/SectionHeader';
import { TESTIMONIALS } from '../data/aboutContent';

export function ClientTestimonials() {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const active = TESTIMONIALS[index];

  const prev = () => setIndex((i) => (i === 0 ? TESTIMONIALS.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === TESTIMONIALS.length - 1 ? 0 : i + 1));

  return (
    <section className="al-section al-section--white" aria-labelledby="testimonials-title">
      <Container>
        <SectionHeader
          eyebrow="Testimonials"
          title="What our clients say"
          subtitle="Trusted by buyers, sellers, and investors who expect discretion and results."
        />
        <div className="al-testimonial-shell">
          <div className="al-testimonial-card">
            <Quote className="al-testimonial-card__quote-icon" size={40} aria-hidden />
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={reduceMotion ? false : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
              >
                <div className="al-testimonial-card__stars" aria-hidden>
                  {Array.from({ length: active.rating }).map((_, i) => (
                    <Star key={i} size={18} />
                  ))}
                </div>
                <blockquote className="al-testimonial-card__text">
                  &ldquo;{active.quote}&rdquo;
                </blockquote>
                <footer className="al-testimonial-card__author">
                  <img src={active.avatar} alt="" className="al-testimonial-card__avatar" />
                  <div>
                    <div className="al-testimonial-card__name">{active.name}</div>
                    <div className="al-testimonial-card__role">{active.role}</div>
                  </div>
                </footer>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="al-testimonial-nav">
            <button type="button" className="al-testimonial-nav__btn" onClick={prev} aria-label="Previous">
              <ChevronLeft size={18} />
            </button>
            <div className="al-testimonial-dots">
              {TESTIMONIALS.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Testimonial ${i + 1}`}
                  className={i === index ? 'is-active' : ''}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
            <button type="button" className="al-testimonial-nav__btn" onClick={next} aria-label="Next">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}
