'use client';

import { Linkedin, Mail, Twitter } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { AgentProfile } from '../types';

interface AgentCardProps {
  agent: AgentProfile;
  index?: number;
}

export function AgentCard({ agent, index = 0 }: AgentCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="al-agent-card"
    >
      <div className="al-agent-card__photo">
        <img src={agent.image} alt="" loading="lazy" decoding="async" />
      </div>
      <div className="al-agent-card__body">
        <h3>{agent.name}</h3>
        <p className="al-agent-card__role">{agent.position}</p>
        <div className="al-agent-card__socials">
          <a href={`mailto:${agent.email}`} className="al-agent-card__social" aria-label={`Email ${agent.name}`}>
            <Mail size={16} />
          </a>
          <span className="al-agent-card__social" aria-hidden>
            <Linkedin size={16} />
          </span>
          <span className="al-agent-card__social" aria-hidden>
            <Twitter size={16} />
          </span>
        </div>
        <a href={`mailto:${agent.email}`} className="al-btn al-btn--dark al-btn--block">
          Contact Agent
        </a>
      </div>
    </motion.article>
  );
}
