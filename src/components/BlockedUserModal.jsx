import React, { useEffect } from 'react';
import { useClerk, useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { clearUserData } from '../services/authService';
import { getMainScrollEl, scrollMainTo } from '../utils/mainScroll';
import './BlockedUserModal.css';

const BlockedUserModal = ({ isOpen }) => {
  const { t } = useTranslation();
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();

  // Блокируем прокрутку body когда модальное окно открыто
  useEffect(() => {
    if (isOpen) {
      const main = getMainScrollEl();
      const scrollY = main ? main.scrollTop : window.scrollY;
      const prevOverflow = main ? main.style.overflow : '';
      if (main) {
        main.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'hidden';
      }

      return () => {
        if (main) {
          main.style.overflow = prevOverflow;
          main.scrollTop = scrollY;
        } else {
          document.body.style.overflow = '';
          scrollMainTo(scrollY, 0, 'auto');
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEmailClick = () => {
    // Можно настроить email для оспаривания
    const email = 'support@example.com'; // Замените на реальный email
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(t('blockedUser_mailSubject'))}`;
  };

  const handleClose = async () => {
    // Если есть активная сессия Clerk — выходим и там,
    // чтобы не происходила повторная автоматическая авторизация
    try {
      if (isSignedIn && signOut) {
        await signOut();
      }
    } catch (e) {
      console.warn('⚠️ Ошибка при выходе из Clerk в BlockedUserModal:', e);
    }

    // Очищаем все данные пользователя из localStorage (включая флаги блокировки)
    clearUserData();
    
    // Перенаправляем на главную, чтобы приложение загрузилось "с нуля"
    window.location.href = '/';
  };

  // Предотвращаем закрытие модального окна при клике на затемненный фон
  const handleOverlayClick = (e) => {
    // Разрешаем клики только по самому модальному окну
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div 
      className="blocked-user-modal-overlay"
      onClick={handleOverlayClick}
      onContextMenu={(e) => e.preventDefault()} // Предотвращаем контекстное меню
    >
      <div className="blocked-user-modal">
        <button 
          className="blocked-user-modal-close"
          onClick={handleClose}
          aria-label={t('blockedUser_logoutAria')}
          title={t('blockedUser_logoutAria')}
        >
          <X size={20} />
        </button>
        <div className="blocked-user-modal-content">
          <div className="blocked-user-icon">
            <i className="fas fa-frown"></i>
          </div>
          <h2 className="blocked-user-title">{t('blockedUser_title')}</h2>
          <p className="blocked-user-message">
            {t('blockedUser_message')}
          </p>
          <button 
            className="blocked-user-button"
            onClick={handleEmailClick}
          >
            {t('blockedUser_cta')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockedUserModal;

