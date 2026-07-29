'use client';

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, Mail, Twitter } from 'lucide-react';
import { Container } from '../components/Container';

const COMPANY_LINKS = [
  { label: 'About Us', to: '/about' },
  { label: 'Our Team', to: '/about#about-agents' },
  { label: 'Careers', to: '/about' },
  { label: 'Press', to: '/about' },
];

const PROPERTY_LINKS = [
  { label: 'Auctions', to: '/auction' },
  { label: 'Buy Now', to: '/auction?filter=buy_now' },
  { label: 'Shares', to: '/shares' },
  { label: 'Debts', to: '/debts' },
];

const SUPPORT_LINKS = [
  { label: 'FAQ', to: '/about#about-faq' },
  { label: 'Contact', to: '/about#about-agents' },
  { label: 'Subscriptions', to: '/subscriptions' },
  { label: 'Privacy Policy', to: '/about' },
];

export function AboutLandingFooter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <footer className="al-footer">
      <Container>
        <div className="al-footer__grid">
          <div>
            <Link to="/" className="al-footer__brand">
              SellYourBrick
            </Link>
            <p className="al-footer__desc">
              Premium real estate platform for luxury buyers, sellers, and investors across global
              markets.
            </p>
            <div className="al-footer__socials">
              {[Instagram, Facebook, Twitter, Linkedin].map((Icon, i) => (
                <span key={i} className="al-footer__social" aria-hidden>
                  <Icon size={16} />
                </span>
              ))}
            </div>
          </div>
          <div className="al-footer__col">
            <h3>Company</h3>
            <ul className="al-footer__links">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="al-footer__col">
            <h3>Properties</h3>
            <ul className="al-footer__links">
              {PROPERTY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="al-footer__col">
            <h3>Support</h3>
            <ul className="al-footer__links">
              {SUPPORT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="al-footer__newsletter">
          <div className="al-footer__newsletter-grid">
            <div>
              <h3>Subscribe to our newsletter</h3>
              <p>Receive curated luxury listings and market insights.</p>
            </div>
            <form className="al-footer__form" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="about-newsletter-email">
                Email address
              </label>
              <div className="al-footer__email-wrap">
                <Mail className="al-footer__email-icon" size={16} aria-hidden />
                <input
                  id="about-newsletter-email"
                  type="email"
                  className="al-footer__email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={submitted}
                />
              </div>
              <button type="submit" className="al-btn al-btn--dark" disabled={submitted}>
                {submitted ? 'Subscribed' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>
        <div className="al-footer__copy">
          © {new Date().getFullYear()} SellYourBrick. All rights reserved.
        </div>
      </Container>
    </footer>
  );
}
