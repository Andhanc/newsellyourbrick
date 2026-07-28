'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bath, BedDouble, Heart, MapPin, Maximize2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { PropertyListing } from '../types';

interface PropertyCardProps {
  property: PropertyListing;
  index?: number;
}

export function PropertyCard({ property, index = 0 }: PropertyCardProps) {
  const [favorite, setFavorite] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="al-property-card"
    >
      <div className="al-property-card__media">
        <img src={property.image} alt="" loading="lazy" decoding="async" />
        <button
          type="button"
          aria-label="Add to favorites"
          className={`al-property-card__fav${favorite ? ' is-active' : ''}`}
          onClick={() => setFavorite((v) => !v)}
        >
          <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
        </button>
        <div className="al-property-card__price">{property.price}</div>
      </div>
      <div className="al-property-card__body">
        <h3 className="al-property-card__title">{property.title}</h3>
        <p className="al-property-card__location">
          <MapPin size={14} className="al-icon-bronze" />
          {property.location}
        </p>
        <div className="al-property-card__meta">
          <span>
            <BedDouble size={16} className="al-icon-bronze" />
            {property.beds} Beds
          </span>
          <span>
            <Bath size={16} className="al-icon-bronze" />
            {property.baths} Baths
          </span>
          <span>
            <Maximize2 size={16} className="al-icon-bronze" />
            {property.area}
          </span>
        </div>
        <Link to={property.href} className="al-link">
          View details
        </Link>
      </div>
    </motion.article>
  );
}
