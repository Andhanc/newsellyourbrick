import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  // Получаем права доступа из localStorage или пропсов
  const permissions = adminPermissions || JSON.parse(localStorage.getItem('adminPermissions') || '{}');
  const isSuperAdmin = permissions.is_super_admin || false;

  const allMenuItems = [
    { id: 'statistics', icon: BarChart3, label: t('admin_panel_statistics'), permission: 'can_access_statistics' },
    { id: 'users', icon: Users, label: t('admin_panel_users'), permission: 'can_access_users' },
    { id: 'private_club', icon: Gem, label: t('admin_panel_privateClub'), permission: 'can_access_users' },
    { id: 'moderation', icon: Shield, label: t('admin_panel_moderation'), permission: 'can_access_moderation' },
    { id: 'chat', icon: MessageCircle, label: t('admin_podderzhka_6ae569ea'), permission: 'can_access_chat' },
    { id: 'smart_assistant', icon: Bot, label: t('admin_sa_title'), permission: 'can_access_chat' },
    { id: 'addition', icon: PlusSquare, label: t('admin_panel_addition'), permission: 'can_access_objects' },
    { id: 'objects', icon: Building2, label: t('admin_panel_objects'), permission: 'can_access_objects' },
    { id: 'auctions', icon: Gavel, label: t('admin_panel_auctions'), permission: 'can_access_objects' },
    { id: 'test_drive', icon: Car, label: t('admin_panel_testDrive'), permission: 'can_access_objects' },
    { id: 'debt_reasons', icon: FileText, label: t('admin_panel_debtReasons'), permission: 'can_access_objects' },
    { id: 'debt_documents', icon: File, label: t('admin_panel_debtDocuments'), permission: 'can_access_objects' },
    { id: 'whatsapp', icon: WhatsAppIcon, label: 'WhatsApp', permission: 'can_access_whatsapp' },
    { id: 'clients', icon: Contact, label: t('admin_panel_clients'), permission: 'can_access_clients' },
    { id: 'purchase_requests', icon: ShoppingCart, label: t('admin_pr_title'), permission: 'can_access_purchase_requests' },
    { id: 'bonuses', icon: Gift, label: t('admin_panel_bonuses'), permission: 'can_access_moderation' },
    { id: 'seo', icon: Search, label: 'SEO', permission: 'can_access_seo' },
    { id: 'testing', icon: FlaskConical, label: t('admin_panel_testing'), permission: 'can_access_objects' },
    { id: 'access_management', icon: Key, label: t('admin_panel_access'), permission: 'can_access_access_management' },
    { id: 'storage', icon: Warehouse, label: t('admin_panel_storage'), permission: 'can_access_objects' }
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
          aria-label={t('admin_closeMenu')}
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
                  aria-label={t('admin_unprocessedCount', { count: rawBadge })}
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
          <span className="menu-item__label">{t('admin_vyyti_026abb1e')}</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;


