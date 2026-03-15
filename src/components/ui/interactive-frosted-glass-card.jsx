import React, { useRef, useEffect } from 'react';
import { ArrowRight, TrendingUp, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import './interactive-frosted-glass-card.css';

/**
 * Frosted glass CTA card with 3D tilt and dynamic glare on mouse move.
 * @param {string} title - Card title
 * @param {string} [subtitle] - Optional subtitle
 * @param {React.ReactNode} children - Description text or content
 * @param {string} buttonText - CTA button label
 * @param {() => void} onButtonClick - Button click handler
 * @param {'investor' | 'seller'} variant - Visual variant (teal vs purple)
 * @param {string} [className] - Additional class for the wrapper
 */
export function FrostedGlassCard({
  title,
  subtitle,
  children,
  buttonText,
  onButtonClick,
  variant = 'investor',
  className,
}) {
  const cardRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateY = ((x - centerX) / centerX) * 10;
      const rotateX = ((y - centerY) / centerY) * -10;

      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    };

    const handleMouseLeave = () => {
      card.style.transform = 'rotateX(0deg) rotateY(0deg)';
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const Icon = variant === 'investor' ? TrendingUp : Home;

  return (
    <div className={cn('frosted-glass-card-container', className)}>
      <div
        ref={cardRef}
        className={cn(
          'frosted-glass-card',
          'frosted-glass-card--' + variant
        )}
      >
        <div className="frosted-glass-card__content">
          <div className="frosted-glass-card__header">
            <div className="frosted-glass-card__icon-wrap">
              <Icon className="frosted-glass-card__icon" size={28} strokeWidth={2} />
            </div>
            <div>
              <h3 className="frosted-glass-card__title">{title}</h3>
              {subtitle && (
                <p className="frosted-glass-card__subtitle">{subtitle}</p>
              )}
            </div>
          </div>
          <p className="frosted-glass-card__text">{children}</p>
          <button
            type="button"
            className={cn(
              'frosted-glass-card__btn',
              'frosted-glass-card__btn--' + variant
            )}
            onClick={onButtonClick}
          >
            {buttonText}
            <ArrowRight size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
