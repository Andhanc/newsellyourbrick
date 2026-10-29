import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { countries } from '../data/countries';
import {
  getLocalizedCountryName,
  normalizeCountryLocale,
} from '../utils/localizeCountryName';
import './CountrySelect.css';

export { countries };

const CountrySelect = ({ value, onChange, placeholder, className = '' }) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const resolvedPlaceholder = placeholder ?? t('modalSelectCountry');

  const locale = useMemo(
    () => normalizeCountryLocale(i18n.language || 'en'),
    [i18n.language]
  );

  const getCountryName = (code) => getLocalizedCountryName(code, locale);

  // Sync when parent changes selection
  useEffect(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Filter by localized name or country code
  const filteredCountries = countries.filter(country => {
    const name = getCountryName(country.code);
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || country.code.toLowerCase().includes(q);
  });

  // Selected country (value may be Russian name or ISO code for backward compatibility)
  const selectedCountry = countries.find(c => c.name === value || c.code === value);

  // Pass Russian storage name to parent for API compatibility
  const handleSelect = (country, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setSearchQuery('');
    setIsOpen(false);
    onChange(country.name);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
    }
  };

  return (
    <div className={`country-select ${className}`} ref={containerRef}>
      <div 
        className={`country-select__trigger ${isOpen ? 'country-select__trigger--open' : ''}`}
        onMouseDown={(e) => {
          if (e.target.closest('.country-select__input')) return;
          e.preventDefault();
          handleToggle();
        }}
      >
        <div className="country-select__value">
          {selectedCountry && !searchQuery && (
            <>
              <span className="country-select__code">{selectedCountry.code}</span>
            </>
          )}
          <input
            ref={inputRef}
            type="text"
            className="country-select__input"
            placeholder={resolvedPlaceholder}
            value={
              isOpen
                ? searchQuery
                : selectedCountry
                  ? getCountryName(selectedCountry.code)
                  : ''
            }
            onChange={(e) => {
              const newValue = e.target.value;
              setSearchQuery(newValue);
              if (!isOpen) {
                setIsOpen(true);
              }
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onFocus={() => {
              if (!isOpen) setIsOpen(true);
            }}
          />
        </div>
        <svg 
          className={`country-select__arrow ${isOpen ? 'country-select__arrow--open' : ''}`}
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          fill="none"
        >
          <path 
            d="M4 6L8 10L12 6" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {isOpen && (
        <div className="country-select__dropdown">
          <div className="country-select__list">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <div
                  key={country.code}
                  role="option"
                  aria-selected={selectedCountry?.code === country.code}
                  className={`country-select__option ${
                    selectedCountry?.code === country.code ? 'country-select__option--selected' : ''
                  }`}
                  onMouseDown={(e) => handleSelect(country, e)}
                >
                  <span className="country-select__flag">{country.flag}</span>
                  <span className="country-select__name">{getCountryName(country.code)}</span>
                  {selectedCountry?.code === country.code && (
                    <svg 
                      className="country-select__check" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 16 16" 
                      fill="none"
                    >
                      <path 
                        d="M13.5 4L6 11.5L2.5 8" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              ))
            ) : (
              <div className="country-select__no-results">
                {t('countryNoResults')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountrySelect;

