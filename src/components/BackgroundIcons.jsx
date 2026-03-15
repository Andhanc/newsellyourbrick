import React from 'react';
import { Percent, Home, DollarSign, Sun, TrendingUp, Plus, Minus, X, Divide } from 'lucide-react';

const BackgroundIcons = () => {
  const icons = [
    { Icon: Percent, position: { top: '8%', left: '8%' }, size: 32, opacity: 0.05, rotation: 12, delay: 0 },
    { Icon: Home, position: { top: '12%', right: '10%' }, size: 40, opacity: 0.06, rotation: -8, delay: 0.5 },
    { Icon: DollarSign, position: { top: '28%', left: '5%' }, size: 36, opacity: 0.05, rotation: 15, delay: 1 },
    { Icon: Sun, position: { top: '22%', right: '15%' }, size: 48, opacity: 0.06, rotation: 0, delay: 1.5 },
    { Icon: TrendingUp, position: { top: '42%', left: '8%' }, size: 44, opacity: 0.06, rotation: -12, delay: 2 },
    { Icon: Plus, position: { top: '48%', right: '6%' }, size: 28, opacity: 0.04, rotation: 20, delay: 0.3 },
    { Icon: Minus, position: { top: '62%', left: '6%' }, size: 28, opacity: 0.04, rotation: -15, delay: 0.8 },
    { Icon: X, position: { top: '68%', right: '12%' }, size: 32, opacity: 0.05, rotation: 25, delay: 1.2 },
    { Icon: Divide, position: { top: '78%', left: '8%' }, size: 32, opacity: 0.04, rotation: -20, delay: 1.8 },
    { Icon: Home, position: { top: '82%', right: '9%' }, size: 36, opacity: 0.05, rotation: 12, delay: 2.3 },
    { Icon: Percent, position: { top: '18%', left: '52%' }, size: 30, opacity: 0.04, rotation: 8, delay: 0.6 },
    { Icon: DollarSign, position: { top: '58%', left: '52%' }, size: 34, opacity: 0.05, rotation: -10, delay: 1.4 },
    { Icon: TrendingUp, position: { top: '38%', right: '22%' }, size: 38, opacity: 0.05, rotation: 15, delay: 0.9 },
    { Icon: Sun, position: { top: '72%', left: '48%' }, size: 42, opacity: 0.05, rotation: -6, delay: 2.1 },
  ];

  return (
    <div 
      className="background-icons-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {icons.map((icon, index) => {
        const IconComponent = icon.Icon;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              ...icon.position,
              opacity: icon.opacity,
              transform: `rotate(${icon.rotation}deg)`,
              transition: 'opacity 0.3s ease',
              animationDelay: `${icon.delay}s`,
            }}
            className="background-icon"
          >
            <IconComponent 
              size={icon.size} 
              style={{
                color: 'rgba(255, 255, 255, 0.08)',
                filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.15))',
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default BackgroundIcons;

