import React from 'react';
import { FaChartBar, FaUsers, FaShieldAlt, FaComment, FaBuilding, FaSignOutAlt, FaKey, FaWhatsapp, FaAddressBook, FaShoppingCart, FaFlask, FaTimes, FaGift, FaRobot, FaFileInvoiceDollar, FaFileAlt, FaWarehouse, FaPlusSquare } from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ activeSection, onSectionChange, onLogout, adminPermissions }) => {
  // Получаем права доступа из localStorage или пропсов
  const permissions = adminPermissions || JSON.parse(localStorage.getItem('adminPermissions') || '{}');
  const isSuperAdmin = permissions.is_super_admin || false;

  const allMenuItems = [
    { id: 'statistics', icon: FaChartBar, label: 'Статистика', permission: 'can_access_statistics' },
    { id: 'users', icon: FaUsers, label: 'Пользователи', permission: 'can_access_users' },
    { id: 'moderation', icon: FaShieldAlt, label: 'Модерация', permission: 'can_access_moderation' },
    { id: 'chat', icon: FaComment, label: 'Чат', permission: 'can_access_chat' },
    { id: 'smart_assistant', icon: FaRobot, label: 'Умный помощник', permission: 'can_access_chat' },
    { id: 'addition', icon: FaPlusSquare, label: 'Добавление', permission: 'can_access_objects' },
    { id: 'objects', icon: FaBuilding, label: 'Объекты', permission: 'can_access_objects' },
    { id: 'debt_reasons', icon: FaFileInvoiceDollar, label: 'Причина долга', permission: 'can_access_objects' },
    { id: 'debt_documents', icon: FaFileAlt, label: 'Необходимые документы', permission: 'can_access_objects' },
    { id: 'whatsapp', icon: FaWhatsapp, label: 'WhatsApp', permission: 'can_access_whatsapp' },
    { id: 'clients', icon: FaAddressBook, label: 'Клиенты / CRM', permission: 'can_access_clients' },
    { id: 'purchase_requests', icon: FaShoppingCart, label: 'Запросы на покупку', permission: 'can_access_purchase_requests' },
    { id: 'bonuses', icon: FaGift, label: 'Бонусные задания', permission: 'can_access_moderation' },
    { id: 'testing', icon: FaFlask, label: 'Тестирование', permission: 'can_access_objects' },
    { id: 'access_management', icon: FaKey, label: 'Доступы', permission: 'can_access_access_management' },
    { id: 'storage', icon: FaWarehouse, label: 'Хранилище', permission: 'can_access_objects' }
  ];

  // Фильтруем пункты меню в зависимости от прав доступа
  const menuItems = allMenuItems.filter(item => {
    if (item.id === 'access_management') {
      return isSuperAdmin || permissions.can_access_access_management;
    }
    return permissions[item.permission] || isSuperAdmin;
  });

  const isMobile =
    typeof window !== 'undefined' ? window.innerWidth <= 992 : false;

  const removeSidebarBackdrop = () => {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('admin-sidebar-backdrop');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  };

  const handleCloseSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.remove('active');
    }
    removeSidebarBackdrop();
  };

  return (
    <div className="sidebar" id="sidebar">
      <div className="sidebar-header">
        <h2>Sellyourbrick</h2>
        <button
          type="button"
          className="sidebar-close"
          aria-label="Закрыть меню"
          onClick={handleCloseSidebar}
        >
          <FaTimes size={18} />
        </button>
      </div>
      <div className="sidebar-menu">
        {menuItems.map(item => {
          const IconComponent = item.icon;
          return (
            <div
              key={item.id}
              className={`menu-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => onSectionChange(item.id)}
            >
              <IconComponent size={20} />
              <span>{item.label}</span>
            </div>
          );
        })}
        <div
          className="menu-item menu-item--logout"
          onClick={onLogout}
        >
          <FaSignOutAlt size={20} />
          <span>Выйти</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;


