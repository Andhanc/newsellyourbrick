'use client';

import { useState } from 'react';
import { FaLinkedinIn, FaTwitter, FaBehance, FaInstagram } from 'react-icons/fa';
import './TeamShowcase.css';

const DEFAULT_MEMBERS = [
  {
    id: '1',
    name: 'Максим',
    role: 'Основатель',
    image: 'https://placehold.co/400x400/0ABAB5/ffffff?text=1',
    social: { twitter: '#', linkedin: '#', behance: '#' },
  },
  {
    id: '2',
    name: 'Владислав',
    role: 'Ведущий разработчик',
    image: 'https://placehold.co/400x400/0ABAB5/ffffff?text=2',
    social: { twitter: '#', linkedin: '#' },
  },
  {
    id: '3',
    name: 'Андрей',
    role: 'Ведущий разработчик',
    image: 'https://placehold.co/400x400/0ABAB5/ffffff?text=3',
    social: { twitter: '#', linkedin: '#' },
  },
  {
    id: '4',
    name: 'Кто-то 1',
    role: 'Команда',
    image: 'https://placehold.co/400x400/0ABAB5/ffffff?text=4',
    social: { linkedin: '#' },
  },
  {
    id: '5',
    name: 'Кто-то 2',
    role: 'Команда',
    image: 'https://placehold.co/400x400/0ABAB5/ffffff?text=5',
    social: { twitter: '#', linkedin: '#' },
  },
  {
    id: '6',
    name: 'Кто-то 3',
    role: 'Команда',
    image: 'https://placehold.co/400x400/0ABAB5/ffffff?text=6',
    social: { instagram: '#' },
  },
];

export default function TeamShowcase({ members = DEFAULT_MEMBERS }) {
  const [hoveredId, setHoveredId] = useState(null);

  const col1 = members.filter((_, i) => i % 3 === 0);
  const col2 = members.filter((_, i) => i % 3 === 1);
  const col3 = members.filter((_, i) => i % 3 === 2);

  return (
    <div className="team-showcase">
      <div className="team-showcase__grid">
        <div className="team-showcase__col">
          {col1.map((member) => (
            <PhotoCard
              key={member.id}
              member={member}
              sizeClass="team-showcase__card--col1"
              hoveredId={hoveredId}
              onHover={setHoveredId}
            />
          ))}
        </div>
        <div className="team-showcase__col team-showcase__col--offset-mid">
          {col2.map((member) => (
            <PhotoCard
              key={member.id}
              member={member}
              sizeClass="team-showcase__card--col2"
              hoveredId={hoveredId}
              onHover={setHoveredId}
            />
          ))}
        </div>
        <div className="team-showcase__col team-showcase__col--offset-sm">
          {col3.map((member) => (
            <PhotoCard
              key={member.id}
              member={member}
              sizeClass="team-showcase__card--col3"
              hoveredId={hoveredId}
              onHover={setHoveredId}
            />
          ))}
        </div>
      </div>

      <div className="team-showcase__list">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            hoveredId={hoveredId}
            onHover={setHoveredId}
          />
        ))}
      </div>
    </div>
  );
}

function PhotoCard({ member, sizeClass, hoveredId, onHover }) {
  const isActive = hoveredId === member.id;
  const isDimmed = hoveredId !== null && !isActive;

  return (
    <div
      className={`team-showcase__card ${sizeClass} ${isDimmed ? 'team-showcase__card--dimmed' : ''} ${isActive ? 'team-showcase__card--active' : ''}`}
      onMouseEnter={() => onHover(member.id)}
      onMouseLeave={() => onHover(null)}
    >
      <img src={member.image} alt={member.name} />
    </div>
  );
}

function MemberRow({ member, hoveredId, onHover }) {
  const isActive = hoveredId === member.id;
  const isDimmed = hoveredId !== null && !isActive;
  const hasSocial = member.social?.twitter ?? member.social?.linkedin ?? member.social?.instagram ?? member.social?.behance;

  return (
    <div
      className={`team-showcase__row ${isDimmed ? 'team-showcase__row--dimmed' : 'team-showcase__row--active'}`}
      onMouseEnter={() => onHover(member.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="team-showcase__row-head">
        <span className="team-showcase__row-marker" />
        <span className="team-showcase__row-name">{member.name}</span>

        {hasSocial && (
          <div className="team-showcase__row-social">
            {member.social?.twitter && (
              <a
                href={member.social.twitter}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="X / Twitter"
              >
                <FaTwitter size={10} />
              </a>
            )}
            {member.social?.linkedin && (
              <a
                href={member.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="LinkedIn"
              >
                <FaLinkedinIn size={10} />
              </a>
            )}
            {member.social?.instagram && (
              <a
                href={member.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Instagram"
              >
                <FaInstagram size={10} />
              </a>
            )}
            {member.social?.behance && (
              <a
                href={member.social.behance}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Behance"
              >
                <FaBehance size={10} />
              </a>
            )}
          </div>
        )}
      </div>

      <p className="team-showcase__row-role">{member.role}</p>
    </div>
  );
}
