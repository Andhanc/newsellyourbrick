import type { ReactNode } from 'react';
import { FadeIn } from './FadeIn';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
  children?: ReactNode;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className = '',
  children,
}: SectionHeaderProps) {
  const centered = align === 'center';

  return (
    <FadeIn className={`al-section-head${className ? ` ${className}` : ''}`}>
      {eyebrow ? (
        <p className={`al-eyebrow${centered ? ' al-eyebrow--center' : ''}`}>{eyebrow}</p>
      ) : null}
      <h2 className={`al-heading${centered ? ' al-heading--center' : ''}`}>{title}</h2>
      {subtitle ? (
        <p className={`al-lead${centered ? ' al-lead--center' : ''}`}>{subtitle}</p>
      ) : null}
      {children}
    </FadeIn>
  );
}
