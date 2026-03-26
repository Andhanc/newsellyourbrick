import React from 'react';
import './StatCard.css';

const StatCard = ({ title, value, change, changeType, icon, iconClass, onClick, ariaLabel }) => {
  const Comp = onClick ? 'button' : 'div'
  const extraProps = onClick
    ? {
        type: 'button',
        onClick,
        'aria-label': ariaLabel || title,
        className: 'stat-card stat-card--clickable',
      }
    : { className: 'stat-card' }
  return (
    <Comp {...extraProps}>
      <div className={`stat-icon ${iconClass}`}>
        <i className={icon}></i>
      </div>
      <div className="stat-header">
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
        {change && (
          <div className={`stat-change ${changeType}`}>
            <i className={`fas fa-arrow-${changeType === 'positive' ? 'up' : 'down'}`}></i>
            <span>{change}</span>
          </div>
        )}
      </div>
    </Comp>
  );
};

export default StatCard;

