import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/admin/Sidebar';
import Header from '../components/admin/Header';
import Statistics from '../components/admin/Statistics';
import Operations from '../components/admin/Operations';
import Promotions from '../components/admin/Promotions';
import UsersModal from '../components/admin/UsersModal';
import UsersList from '../components/admin/UsersList';
import Moderation from '../components/admin/Moderation';
import ObjectsList from '../components/admin/ObjectsList';
import AdminChat from '../components/admin/AdminChat';
import WhatsApp from '../components/admin/WhatsApp';
import SmartAssistant from '../components/admin/SmartAssistant';
import Clients from '../components/admin/Clients';
import PurchaseRequests from '../components/admin/PurchaseRequests';
import BonusesSubmissions from '../components/admin/BonusesSubmissions';
import AccessManagement from '../components/admin/AccessManagement';
import Testing from '../components/admin/Testing';
import StorageMirror from '../components/admin/StorageMirror';
import DebtReasons from '../components/admin/DebtReasons';
import DebtDocuments from '../components/admin/DebtDocuments';
import AdminAddition from '../components/admin/AdminAddition';
import AdminTestDrive from '../components/admin/AdminTestDrive';
import AdminAuctions from '../components/admin/AdminAuctions';
import AdminPrivateClub from '../components/admin/AdminPrivateClub';
import { mockBusinessInfo } from '../data/mockData';
import { clearUserData, clearUserDataWithoutAdmin } from '../services/authService';
import { getApiBaseUrl } from '../utils/apiConfig';
import {
  countUnseenPurchasePending,
  countUnseenTestDriveCancellations,
  readAdminLs,
  LS_LIVE_CHAT_ALL_READ,
} from '../utils/adminSidebarBadges';
import { subscribeBonusSubmissionsChanged } from '../utils/bonusSubmissionsSync';
import { showNotification } from '../utils/toastHelper';
import '../styles/admin/global.css';
import './AdminPanelPage.css';

const AdminPanelPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('statistics');
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState(null);
  const [clientsMenuOpen, setClientsMenuOpen] = useState(false);
  const [sidebarBadges, setSidebarBadges] = useState({
    test_drive: 0,
    moderation: 0,
    chat: 0,
    purchase_requests: 0,
    bonuses: 0,
  });
  const [testDriveCancelStats, setTestDriveCancelStats] = useState({
    totalCancelledInDb: null,
  });
  const [adminBadgeTick, setAdminBadgeTick] = useState(0);
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
    auctions: 'Аукционы'
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
      auctions: adminPermissions.can_access_objects
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
      setActiveSection(section);
    } else {
      showNotification('У вас нет прав доступа к этому разделу');
    }
  };

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
    const base = await getApiBaseUrl();
    const [test_drive, moderation, chat, purchase_requests, bonuses] = await Promise.all([
      (async () => {
        try {
          const r = await fetch(`${base}/admin/test-drive/cancellations-badge`);
          const j = await r.json();
          if (j.success && Array.isArray(j.data)) {
            const total =
              j.meta && typeof j.meta.total_cancelled === 'number'
                ? j.meta.total_cancelled
                : j.data.length;
            setTestDriveCancelStats({ totalCancelledInDb: total });
            return countUnseenTestDriveCancellations(j.data);
          }
        } catch {
          /* ignore */
        }
        return 0;
      })(),
      (async () => {
        try {
          const [r1, r2] = await Promise.all([
            fetch(`${base}/documents/pending`),
            fetch(`${base}/properties/pending`),
          ]);
          let usersN = 0;
          let propsN = 0;
          if (r1.ok) {
            const j1 = await r1.json();
            if (j1.success && Array.isArray(j1.data)) {
              const ids = new Set();
              for (const doc of j1.data) {
                if ((doc.verification_status || 'pending') === 'pending') {
                  ids.add(doc.user_id);
                }
              }
              usersN = ids.size;
            }
          }
          if (r2.ok) {
            const j2 = await r2.json();
            if (j2.success && Array.isArray(j2.data)) {
              propsN = j2.data.filter((p) => {
                const st = p.moderation_status || p.moderationStatus;
                return st === 'pending' || st == null || st === undefined;
              }).length;
            }
          }
          return usersN + propsN;
        } catch {
          return 0;
        }
      })(),
      (async () => {
        try {
          const sinceRaw = readAdminLs(LS_LIVE_CHAT_ALL_READ);
          const since = sinceRaw || '1970-01-01T00:00:00.000Z';
          const r = await fetch(
            `${base}/admin/live-chat/user-messages-since?since=${encodeURIComponent(since)}`,
          );
          const j = await r.json();
          if (j.success && j.data && typeof j.data.count === 'number') {
            return j.data.count;
          }
        } catch {
          /* ignore */
        }
        return 0;
      })(),
      (async () => {
        try {
          const r = await fetch(`${base}/purchase-requests?limit=1000`);
          if (!r.ok) return 0;
          const j = await r.json();
          if (j.success && Array.isArray(j.data)) {
            return countUnseenPurchasePending(j.data);
          }
        } catch {
          /* ignore */
        }
        return 0;
      })(),
      (async () => {
        try {
          const r = await fetch(`${base}/bonus-submissions/pending`);
          const j = await r.json();
          if (j.success && Array.isArray(j.data)) {
            return j.data.length;
          }
        } catch {
          /* ignore */
        }
        return 0;
      })(),
    ]);
    setSidebarBadges({ test_drive, moderation, chat, purchase_requests, bonuses });
    setAdminBadgeTick((t) => t + 1);
  }, []);

  useEffect(() => {
    void refreshSidebarBadges();
    const id = setInterval(() => void refreshSidebarBadges(), 90000);
    return () => clearInterval(id);
  }, [activeSection, refreshSidebarBadges]);

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
        return <Moderation />;
      case 'chat':
        return <AdminChat onAdminSectionBadgeRefresh={refreshSidebarBadges} />;
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
        return <PurchaseRequests onAdminSectionBadgeRefresh={refreshSidebarBadges} />;
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
      <div ref={mainContentRef} className="main-content">
        <Header 
          title={sectionTitles[activeSection] || 'Статистика'} 
          onLogout={handleLogout}
          onBack={handleBack}
        />
        {renderContent()}
      </div>
      <UsersModal
        isOpen={showUsersModal}
        onClose={() => setShowUsersModal(false)}
      />
    </div>
  );
};

export default AdminPanelPage;


