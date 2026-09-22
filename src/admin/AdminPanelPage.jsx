import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/admin/Sidebar';
import Header from '../components/admin/Header';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { mockBusinessInfo } from '../data/mockData';
import { clearUserData, clearUserDataWithoutAdmin } from '../services/authService';
import {
  ADMIN_SIDEBAR_BADGES_REFRESH_EVENT,
  applyAdminSidebarBadgePatch,
  buildSectionViewBadgePatch,
  markAdminSectionViewed,
} from '../utils/adminSidebarBadges';
import {
  ADMIN_SIDEBAR_BADGE_IDS,
  createEmptyAdminSidebarBadges,
  fetchAdminSidebarBadges,
} from '../utils/fetchAdminSidebarBadges';
import { subscribeBonusSubmissionsChanged } from '../utils/bonusSubmissionsSync';
import { showNotification } from '../utils/toastHelper';
import '../styles/admin/global.css';
import './AdminPanelPage.css';

const Statistics = lazyWithRetry(() => import('../components/admin/Statistics'));
const UsersModal = lazyWithRetry(() => import('../components/admin/UsersModal'));
const UsersList = lazyWithRetry(() => import('../components/admin/UsersList'));
const Moderation = lazyWithRetry(() => import('../components/admin/Moderation'));
const ObjectsList = lazyWithRetry(() => import('../components/admin/ObjectsList'));
const AdminChat = lazyWithRetry(() => import('../components/admin/AdminChat'));
const WhatsApp = lazyWithRetry(() => import('../components/admin/WhatsApp'));
const SmartAssistant = lazyWithRetry(() => import('../components/admin/SmartAssistant'));
const Clients = lazyWithRetry(() => import('../components/admin/Clients'));
const PurchaseRequests = lazyWithRetry(() => import('../components/admin/PurchaseRequests'));
const BonusesSubmissions = lazyWithRetry(() => import('../components/admin/BonusesSubmissions'));
const AccessManagement = lazyWithRetry(() => import('../components/admin/AccessManagement'));
const Testing = lazyWithRetry(() => import('../components/admin/Testing'));
const StorageMirror = lazyWithRetry(() => import('../components/admin/StorageMirror'));
const DebtReasons = lazyWithRetry(() => import('../components/admin/DebtReasons'));
const DebtDocuments = lazyWithRetry(() => import('../components/admin/DebtDocuments'));
const AdminAddition = lazyWithRetry(() => import('../components/admin/AdminAddition'));
const AdminTestDrive = lazyWithRetry(() => import('../components/admin/AdminTestDrive'));
const AdminAuctions = lazyWithRetry(() => import('../components/admin/AdminAuctions'));
const AdminPrivateClub = lazyWithRetry(() => import('../components/admin/AdminPrivateClub'));
const SeoPanel = lazyWithRetry(() => import('../components/admin/SeoPanel'));

function readAdminSectionFromHash() {
  if (typeof window === 'undefined') return 'statistics';
  const id = String(window.location.hash || '').replace(/^#/, '');
  return ADMIN_SIDEBAR_BADGE_IDS.includes(id) ? id : 'statistics';
}

const AdminPanelPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(readAdminSectionFromHash);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState(null);
  const [clientsMenuOpen, setClientsMenuOpen] = useState(false);
  const [sidebarBadges, setSidebarBadges] = useState(createEmptyAdminSidebarBadges);
  const [testDriveCancelStats, setTestDriveCancelStats] = useState({
    totalCancelledInDb: null,
  });
  const [adminBadgeTick, setAdminBadgeTick] = useState(0);
  const [chatTargetUserId, setChatTargetUserId] = useState(null);
  const mainContentRef = useRef(null);

  const isClientsSection = activeSection === 'clients';

  const closeClientsAdminMenu = useCallback(() => {
    setClientsMenuOpen(false);
    if (typeof document === 'undefined') return;
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('active');
  }, []);

  // Проверка авторизации администратора и загрузка прав доступа
  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
    
    // Если пользователь не авторизован как администратор, перенаправляем на главную
    if (!isAdminLoggedIn || userRole !== 'admin') {
      console.warn('⚠️ Доступ к админ-панели запрещен. Необходима авторизация администратора.')
      navigate('/', { replace: true });
      return;
    }

    // Загружаем права доступа из localStorage
    const savedPermissions = localStorage.getItem('adminPermissions');
    if (savedPermissions) {
      try {
        const permissions = JSON.parse(savedPermissions);
        setAdminPermissions(permissions);
      } catch (e) {
        console.error('Ошибка при загрузке прав доступа:', e);
      }
    }
    
    document.body.classList.add('admin-panel-active');
    return () => {
      document.body.classList.remove('admin-panel-active');
    };
  }, [navigate]);

  const sectionTitles = {
    statistics: 'Статистика',
    users: 'Пользователи',
    private_club: 'Закрытый клуб',
    moderation: 'Модерация',
    chat: 'Чат',
    smart_assistant: 'Умный помощник',
    addition: 'Добавление',
    objects: 'Объекты',
    test_drive: 'Тест-драйв',
    debt_reasons: 'Причина долга',
    debt_documents: 'Необходимые документы',
    whatsapp: 'WhatsApp',
    clients: 'Клиенты и CRM',
    purchase_requests: 'Запросы на покупку',
    bonuses: 'Бонусные задания',
    testing: 'Тестирование',
    access_management: 'Доступы',
    storage: 'Хранилище',
    auctions: 'Аукционы',
    seo: 'SEO'
  };

  // Проверка прав доступа к разделу
  const hasAccess = (section) => {
    if (!adminPermissions) return false;
    const isSuperAdmin = adminPermissions.is_super_admin || false;
    
    if (isSuperAdmin) return true;

    const accessMap = {
      statistics: adminPermissions.can_access_statistics,
      users: adminPermissions.can_access_users,
      private_club: adminPermissions.can_access_users,
      moderation: adminPermissions.can_access_moderation,
      chat: adminPermissions.can_access_chat,
      smart_assistant: adminPermissions.can_access_chat,
      addition: adminPermissions.can_access_objects,
      objects: adminPermissions.can_access_objects,
      test_drive: adminPermissions.can_access_objects,
      debt_reasons: adminPermissions.can_access_objects,
      debt_documents: adminPermissions.can_access_objects,
      whatsapp: adminPermissions.can_access_whatsapp,
      clients: adminPermissions.can_access_clients,
      purchase_requests: adminPermissions.can_access_purchase_requests,
      bonuses: adminPermissions.can_access_moderation,
      testing: adminPermissions.can_access_objects,
      access_management: adminPermissions.can_access_access_management,
      storage: adminPermissions.can_access_objects,
      auctions: adminPermissions.can_access_objects,
      seo: adminPermissions.can_access_seo
    };

    return accessMap[section] || false;
  };

  const handleLogout = () => {
    if (window.confirm('Вы уверены, что хотите выйти?')) {
      // Полностью завершаем сессию, включая админскую
      clearUserData();
      navigate('/');
      // Перезагружаем страницу для полной очистки состояния
      setTimeout(() => {
        window.location.reload();
      }, 50);
    }
  };

  const handleBack = () => {
    // При переходе на главную сохраняем сессию администратора
    clearUserDataWithoutAdmin();
    navigate('/');
  };

  const handleSectionChange = (section) => {
    // Проверяем права доступа перед сменой секции
    if (hasAccess(section)) {
      closeClientsAdminMenu();
      markAdminSectionViewed(section);
      const viewPatch = buildSectionViewBadgePatch(section);
      if (viewPatch) {
        setSidebarBadges((prev) => applyAdminSidebarBadgePatch(prev, viewPatch));
      }
      setActiveSection(section);
      if (typeof window !== 'undefined' && window.location.hash !== `#${section}`) {
        window.history.replaceState(null, '', `#${section}`);
      }
    } else {
      showNotification('У вас нет прав доступа к этому разделу');
    }
  };

  useEffect(() => {
    const onHashChange = () => {
      const next = readAdminSectionFromHash();
      setActiveSection((prev) => (prev === next ? prev : next));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    // При смене раздела начинаем новую вкладку с самого верха.
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
    const appLayout = document.querySelector('.app-layout');
    if (appLayout) {
      appLayout.scrollTo({ top: 0, behavior: 'auto' });
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeSection]);

  const refreshSidebarBadges = useCallback(async () => {
    try {
      const { badges, meta } = await fetchAdminSidebarBadges();
      setSidebarBadges(badges);
      setTestDriveCancelStats({
        totalCancelledInDb: meta.testDriveTotalCancelled,
      });
      setAdminBadgeTick((t) => t + 1);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onBadgesRefresh = (event) => {
      const patch = event?.detail?.patch;
      if (patch && typeof patch === 'object') {
        setSidebarBadges((prev) => applyAdminSidebarBadgePatch(prev, patch));
      }
      void refreshSidebarBadges();
    };
    window.addEventListener(ADMIN_SIDEBAR_BADGES_REFRESH_EVENT, onBadgesRefresh);
    return () => window.removeEventListener(ADMIN_SIDEBAR_BADGES_REFRESH_EVENT, onBadgesRefresh);
  }, [refreshSidebarBadges]);

  useEffect(() => {
    void refreshSidebarBadges();
    const id = setInterval(() => void refreshSidebarBadges(), 90000);
    return () => clearInterval(id);
  }, [refreshSidebarBadges]);

  useEffect(() => {
    return subscribeBonusSubmissionsChanged(() => {
      void refreshSidebarBadges();
    });
  }, [refreshSidebarBadges]);

  const renderContent = () => {
    // Проверяем права доступа перед рендерингом
    if (!hasAccess(activeSection)) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Доступ запрещен</h2>
          <p>У вас нет прав доступа к этому разделу.</p>
        </div>
      );
    }

    switch (activeSection) {
      case 'statistics':
        return <Statistics businessInfo={mockBusinessInfo} onShowUsers={() => setShowUsersModal(true)} />;
      case 'users':
        return <UsersList />;
      case 'private_club':
        return <AdminPrivateClub />;
      case 'moderation':
        return <Moderation onAdminSectionBadgeRefresh={refreshSidebarBadges} />;
      case 'chat':
        return (
          <AdminChat
            onAdminSectionBadgeRefresh={refreshSidebarBadges}
            targetUserId={chatTargetUserId}
            onTargetHandled={() => setChatTargetUserId(null)}
          />
        );
      case 'smart_assistant':
        return <SmartAssistant />;
      case 'addition':
        return <AdminAddition onPublishComplete={() => handleSectionChange('statistics')} />;
      case 'objects':
        return <ObjectsList />;
      case 'test_drive':
        return (
          <AdminTestDrive
            adminBadgeTick={adminBadgeTick}
            onAdminSectionBadgeRefresh={refreshSidebarBadges}
            testDriveMenuBadge={sidebarBadges.test_drive}
            testDriveTotalCancelledInDb={testDriveCancelStats.totalCancelledInDb}
          />
        );
      case 'debt_reasons':
        return <DebtReasons />;
      case 'debt_documents':
        return <DebtDocuments />;
      case 'whatsapp':
        return <WhatsApp />;
      case 'clients':
        return <Clients onOpenAdminNav={() => setClientsMenuOpen(true)} />;
      case 'purchase_requests':
        return (
          <PurchaseRequests
            onAdminSectionBadgeRefresh={refreshSidebarBadges}
            onOpenUserChat={(userId) => {
              setChatTargetUserId(Number(userId));
              handleSectionChange('chat');
            }}
          />
        );
      case 'bonuses':
        return (
          <BonusesSubmissions onAdminSectionBadgeRefresh={refreshSidebarBadges} />
        );
      case 'testing':
        return <Testing />;
      case 'access_management':
        return <AccessManagement />;
      case 'storage':
        return <StorageMirror />;
      case 'auctions':
        return <AdminAuctions />;
      case 'seo':
        return <SeoPanel />;
      default:
        return <Statistics businessInfo={mockBusinessInfo} onShowUsers={() => setShowUsersModal(true)} />;
    }
  };

  return (
    <div className={`admin-panel-app${isClientsSection ? ' admin-panel-app--crm-layout' : ''}`}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange}
        onLogout={handleLogout}
        adminPermissions={adminPermissions}
        crmLayout={isClientsSection}
        crmMenuOpen={clientsMenuOpen}
        onCrmMenuClose={closeClientsAdminMenu}
        sectionBadges={sidebarBadges}
      />
      <div ref={mainContentRef} className="main-content" data-admin-section={activeSection}>
        <Header 
          title={sectionTitles[activeSection] || 'Статистика'} 
          onLogout={handleLogout}
          onBack={handleBack}
        />
        <Suspense fallback={<div className="admin-section-fallback" aria-busy="true" />}>
          {renderContent()}
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <UsersModal
          isOpen={showUsersModal}
          onClose={() => setShowUsersModal(false)}
        />
      </Suspense>
    </div>
  );
};

export default AdminPanelPage;

