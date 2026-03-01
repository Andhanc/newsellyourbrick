import React, { useState, useEffect } from 'react';
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
import Clients from '../components/admin/Clients';
import PurchaseRequests from '../components/admin/PurchaseRequests';
import BonusesSubmissions from '../components/admin/BonusesSubmissions';
import AccessManagement from '../components/admin/AccessManagement';
import Testing from '../components/admin/Testing';
import { mockBusinessInfo } from '../data/mockData';
import { clearUserData, clearUserDataWithoutAdmin } from '../services/authService';
import { showNotification } from '../utils/toastHelper';
import '../styles/admin/global.css';
import './AdminPanelPage.css';

const AdminPanelPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('statistics');
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState(null);

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
    moderation: 'Модерация',
    chat: 'Чат',
    objects: 'Объекты',
    whatsapp: 'WhatsApp',
    clients: 'Клиенты',
    purchase_requests: 'Запросы на покупку',
    bonuses: 'Бонусные задания',
    testing: 'Тестирование',
    access_management: 'Доступы'
  };

  // Проверка прав доступа к разделу
  const hasAccess = (section) => {
    if (!adminPermissions) return false;
    const isSuperAdmin = adminPermissions.is_super_admin || false;
    
    if (isSuperAdmin) return true;

    const accessMap = {
      statistics: adminPermissions.can_access_statistics,
      users: adminPermissions.can_access_users,
      moderation: adminPermissions.can_access_moderation,
      chat: adminPermissions.can_access_chat,
      objects: adminPermissions.can_access_objects,
      whatsapp: adminPermissions.can_access_whatsapp,
      clients: adminPermissions.can_access_clients,
      purchase_requests: adminPermissions.can_access_purchase_requests,
      bonuses: adminPermissions.can_access_moderation,
      testing: adminPermissions.can_access_objects,
      access_management: adminPermissions.can_access_access_management
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
      setActiveSection(section);
    } else {
      showNotification('У вас нет прав доступа к этому разделу');
    }
  };

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
      case 'moderation':
        return <Moderation />;
      case 'chat':
        return <AdminChat />;
      case 'objects':
        return <ObjectsList />;
      case 'whatsapp':
        return <WhatsApp />;
      case 'clients':
        return <Clients />;
      case 'purchase_requests':
        return <PurchaseRequests />;
      case 'bonuses':
        return <BonusesSubmissions />;
      case 'testing':
        return <Testing />;
      case 'access_management':
        return <AccessManagement />;
      default:
        return <Statistics businessInfo={mockBusinessInfo} onShowUsers={() => setShowUsersModal(true)} />;
    }
  };

  return (
    <div className="admin-panel-app">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange}
        onLogout={handleLogout}
        adminPermissions={adminPermissions}
      />
      <div className="main-content">
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


