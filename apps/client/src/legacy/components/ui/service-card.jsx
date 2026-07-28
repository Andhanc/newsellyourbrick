import * as React from 'react';
import { cva } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

const cardVariants = cva(
  'relative flex flex-col justify-between w-full min-h-[200px] rounded-xl shadow-sm transition-all duration-300 ease-out group hover:shadow-lg',
  {
    variants: {
      variant: {
        default: 'bg-white text-gray-900 border border-gray-100',
        red: 'bg-red-500 text-white border-0',
        blue: 'bg-blue-500 text-white border-0',
        gray: 'bg-slate-100 text-gray-900 border border-slate-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

/**
 * @param {string} title - The main title of the card.
 * @param {string} [description] - Descriptive text (shown instead of link when provided).
 * @param {string} [href] - Optional URL for the card link.
 * @param {string} imgSrc - The source URL for the decorative image.
 * @param {string} imgAlt - The alt text for the decorative image.
 * @param {'default'|'red'|'blue'|'gray'} [variant] - Visual variant of the card.
 */
const ServiceCard = React.forwardRef(
  (
    {
      className,
      variant,
      title,
      description,
      href,
      imgSrc,
      imgAlt,
      linkLabel = 'УЗНАТЬ БОЛЬШЕ',
      ...props
    },
    ref
  ) => {
    const cardAnimation = {
      hover: {
        scale: 1.02,
        transition: { duration: 0.3 },
      },
    };

    const imageAnimation = {
      hover: {
        scale: 1.08,
        rotate: 2,
        transition: { duration: 0.4, ease: 'easeOut' },
      },
    };

    return (
      <motion.div
        className={cn(cardVariants({ variant, className }), 'service-card overflow-visible')}
        ref={ref}
        variants={cardAnimation}
        whileHover="hover"
        {...props}
      >
        <div className="relative z-10 flex flex-col h-full p-6">
          <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-3 text-sm leading-relaxed opacity-90 service-card__description">
              {description}
            </p>
          ) : href ? (
            <a
              href={href}
              aria-label={`Узнать больше: ${title}`}
              className="mt-auto flex items-center gap-2 text-sm font-semibold group-hover:underline pt-2"
            >
              {linkLabel}
              <motion.span variants={{ hover: { x: 4 } }} className="inline-flex">
                <ArrowRight className="h-4 w-4" />
              </motion.span>
            </a>
          ) : null}
        </div>

        <motion.div
          className="service-card__img-wrap absolute -right-8 -bottom-8 w-44 h-44 sm:w-52 sm:h-52 pointer-events-none flex items-end justify-end"
          variants={imageAnimation}
          style={{ transformOrigin: 'bottom right' }}
        >
          <img
            src={imgSrc}
            alt={imgAlt}
            className="service-card__img w-full h-full object-contain opacity-95 group-hover:opacity-100 transition-opacity"
          />
        </motion.div>
      </motion.div>
    );
  }
);
ServiceCard.displayName = 'ServiceCard';

export { ServiceCard };
