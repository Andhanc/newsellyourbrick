import React from 'react';
import {
  BarChart3,
  Users,
  Gem,
  Shield,
  MessageCircle,
  Bot,
  PlusSquare,
  Building2,
  Gavel,
  Car,
  FileText,
  File,
  Contact,
  ShoppingCart,
  Gift,
  Search,
  FlaskConical,
  Key,
  Warehouse,
  X,
  LogOut,
} from 'lucide-react';
import { WhatsAppIcon } from '../icons/ContactChannelIcons';
import './Sidebar.css';

function sidebarBadgeToneClass() {
  return 'menu-item__badge menu-item__badge--tone-red';
}

const Sidebar = ({
  activeSection,
  onSectionChange,
  onLogout,
  adminPermissions,
  crmLayout = false,
  crmMenuOpen = false,
  onCrmMenuClose,
  sectionBadges = {},
}) => {
  // Получаем права доступа из localStorage или пропсов
  const permissions = adminPermissions || JSON.parse(localStorage.getItem('adminPermissions') || '{}');
  const isSuperAdmin = permissions.is_super_admin || false;

  const allMenuItems = [
    { id: 'statistics', icon: BarChart3, label: 'Статистика', permission: 'can_access_statistics' },
    { id: 'users', icon: Users, label: 'Пользователи', permission: 'can_access_users' },
    { id: 'private_club', icon: Gem, label: 'Закрытый клуб', permission: 'can_access_users' },
    { id: 'moderation', icon: Shield, label: 'Модерация', permission: 'can_access_moderation' },
    { id: 'chat', icon: MessageCircle, label: 'Поддержка', permission: 'can_access_chat' },
    { id: 'smart_assistant', icon: Bot, label: 'Умный помощник', permission: 'can_access_chat' },
    { id: 'addition', icon: PlusSquare, label: 'Добавление', permission: 'can_access_objects' },
    { id: 'objects', icon: Building2, label: 'Объекты', permission: 'can_access_objects' },
    { id: 'auctions', icon: Gavel, label: 'Аукционы', permission: 'can_access_objects' },
    { id: 'test_drive', icon: Car, label: 'Тест-драйв', permission: 'can_access_objects' },
    { id: 'debt_reasons', icon: FileText, label: 'Причина долга', permission: 'can_access_objects' },
    { id: 'debt_documents', icon: File, label: 'Необходимые документы', permission: 'can_access_objects' },
    { id: 'whatsapp', icon: WhatsAppIcon, label: 'WhatsApp', permission: 'can_access_whatsapp' },
    { id: 'clients', icon: Contact, label: 'Клиенты / CRM', permission: 'can_access_clients' },
    { id: 'purchase_requests', icon: ShoppingCart, label: 'Запросы на покупку', permission: 'can_access_purchase_requests' },
    { id: 'bonuses', icon: Gift, label: 'Бонусные задания', permission: 'can_access_moderation' },
    { id: 'seo', icon: Search, label: 'SEO', permission: 'can_access_seo' },
    { id: 'testing', icon: FlaskConical, label: 'Тестирование', permission: 'can_access_objects' },
    { id: 'access_management', icon: Key, label: 'Доступы', permission: 'can_access_access_management' },
    { id: 'storage', icon: Warehouse, label: 'Хранилище', permission: 'can_access_objects' }
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
    if (crmLayout && typeof onCrmMenuClose === 'function') {
      onCrmMenuClose();
    }
  };

  const sidebarClass = [
    'sidebar',
    crmLayout ? 'sidebar--crm-drawer' : '',
    crmLayout && crmMenuOpen ? 'sidebar--crm-drawer-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={sidebarClass} id="sidebar">
      <div className="sidebar-header">
        <h2>Sellyourbrick</h2>
        <button
          type="button"
          className="sidebar-close"
          aria-label="Закрыть меню"
          onClick={handleCloseSidebar}
        >
          <X size={18} />
        </button>
      </div>
      <div className="sidebar-menu">
        {menuItems.map(item => {
          const IconComponent = item.icon;
          const rawBadge = Number(sectionBadges[item.id]) || 0;
          const badge =
            rawBadge > 99 ? '99+' : rawBadge > 0 ? String(rawBadge) : null;
          return (
            <div
              key={item.id}
              data-section={item.id}
              className={['menu-item', activeSection === item.id ? 'active' : ''].filter(Boolean).join(' ')}
              onClick={() => {
                onSectionChange(item.id);
                if (isMobile) {
                  handleCloseSidebar();
                }
              }}
            >
              <IconComponent size={20} />
              <span className="menu-item__label">{item.label}</span>
              {badge ? (
                <span
                  className={sidebarBadgeToneClass()}
                  aria-label={`Необработано: ${rawBadge}`}
                >
                  {badge}
                </span>
              ) : null}
            </div>
          );
        })}
        <div
          className="menu-item menu-item--logout"
          onClick={() => {
            if (crmLayout && typeof onCrmMenuClose === 'function') {
              onCrmMenuClose();
            }
            onLogout();
          }}
        >
          <LogOut size={20} />
          <span className="menu-item__label">Выйти</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;


