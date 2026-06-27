'use client';

import { useState } from 'react';
import { FiMinus, FiPlus } from 'react-icons/fi';
import { Container } from '../components/Container';
import { FadeIn } from '../components/FadeIn';
import { SectionHeader } from '../components/SectionHeader';
import { FAQ_ITEMS } from '../data/aboutContent';

export function AboutFaq() {
  const [openId, setOpenId] = useState(FAQ_ITEMS[0]?.id ?? '');

  return (
    <section id="about-faq" className="al-section al-section--cream" aria-labelledby="faq-title">
      <Container>
        <div className="al-faq-layout">
          <SectionHeader
            align="left"
            eyebrow="FAQ"
            title="Frequently asked questions"
            subtitle="Everything you need to know before starting your property journey with SellYourBrick."
          />
          <FadeIn>
            <div className="al-accordion">
              {FAQ_ITEMS.map((item) => {
                const isOpen = openId === item.id;
                return (
                  <div key={item.id} className="al-accordion__item">
                    <button
                      type="button"
                      className={`al-accordion__trigger${isOpen ? ' is-open' : ''}`}
                      aria-expanded={isOpen}
                      onClick={() => setOpenId(isOpen ? '' : item.id)}
                    >
                      <span>{item.question}</span>
                      <span className="al-accordion__icon" aria-hidden>
                        {isOpen ? <FiMinus size={16} /> : <FiPlus size={16} />}
                      </span>
                    </button>
                    {isOpen ? <div className="al-accordion__panel">{item.answer}</div> : null}
                  </div>
                );
              })}
            </div>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}
