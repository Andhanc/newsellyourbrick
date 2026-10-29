import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft } from 'react-icons/fi';
import './Header.css';

const Header = ({ title, onLogout, onBack }) => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  const removeSidebarBackdrop = () => {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('admin-sidebar-backdrop');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;

      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);

      if (!mobile) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
          sidebar.classList.remove('active');
        }
        removeSidebarBackdrop();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      removeSidebarBackdrop();
    };
  }, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  const handleBurgerClick = () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('active');
      removeSidebarBackdrop();
    }
  };

  return (
    <div className={`header ${isMobile ? 'header--mobile' : ''}`}>
      <div className="header-left">
        {isMobile ? (
          <h1 className="page-title page-title--mobile">{title}</h1>
        ) : (
          <>
            <button 
              className="btn btn-back" 
              onClick={handleBack}
              aria-label={t('admin_backToHome')}
              title={t('admin_backToHome')}
            >
              <FiArrowLeft size={20} />
            </button>
            <h1 className="page-title">{title}</h1>
          </>
        )}
      </div>
      <div className="header-actions">
        {!isMobile && (
          <>
            <button className="btn btn-outline header-export-btn">
              <i className="fas fa-download"></i> {t('admin_eksport_v_excel_a22b4be5')}
            </button>
            <div className="user-avatar">AD</div>
          </>
        )}
        {isMobile && (
          <button
            className="btn header-burger"
            type="button"
            aria-label={t('admin_openMenu')}
            onClick={handleBurgerClick}
          >
            <svg
              className="header-burger__icon"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect x="3" y="7" width="18" height="3" rx="1.5" fill="#0f172a" />
              <rect x="3" y="11" width="18" height="3" rx="1.5" fill="#0f172a" />
              <rect x="3" y="15" width="18" height="3" rx="1.5" fill="#0f172a" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;


