import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import './AccessManagement.css';
import { getApiBaseUrlSync } from '../../utils/apiConfig';

const API_BASE_URL = getApiBaseUrlSync();

const AccessManagement = () => {
  const { t } = useTranslation();
  const [administrators, setAdministrators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    can_access_statistics: false,
    can_access_users: false,
    can_access_moderation: false,
    can_access_chat: false,
    can_access_objects: false,
    can_access_seo: false,
    seo_role: 'editor'
  });

  useEffect(() => {
    loadAdministrators();
  }, []);

  const loadAdministrators = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/administrators`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAdministrators(data.data || []);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке администраторов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      username: '',
      password: '',
      email: '',
      full_name: '',
      can_access_statistics: false,
      can_access_users: false,
      can_access_moderation: false,
      can_access_chat: false,
      can_access_objects: false
    });
    setEditingAdmin(null);
    setShowCreateModal(true);
  };

  const handleEdit = (admin) => {
    setFormData({
      username: admin.username,
      password: '', // Не показываем пароль
      email: admin.email || '',
      full_name: admin.full_name || '',
      can_access_statistics: admin.can_access_statistics,
      can_access_users: admin.can_access_users,
      can_access_moderation: admin.can_access_moderation,
      can_access_chat: admin.can_access_chat,
      can_access_objects: admin.can_access_objects,
      can_access_seo: admin.can_access_seo,
      seo_role: admin.seo_role || 'editor'
    });
    setEditingAdmin(admin);
    setShowCreateModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin_vy_uvereny_chto_hotite_536feb78'))) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/administrators/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert(t('admin_administrator_uspeshno_udalen_6917d720'));
          loadAdministrators();
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || t('admin_oshibka_pri_udalenii_administratora_035d614a'));
      }
    } catch (error) {
      console.error('Ошибка при удалении администратора:', error);
      alert(t('admin_oshibka_pri_udalenii_administratora_035d614a'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || (!formData.password && !editingAdmin)) {
      alert(t('admin_neobhodimo_ukazat_username_i_1bad80d5'));
      return;
    }

    try {
      let response;
      if (editingAdmin) {
        // Обновление
        response = await fetch(`${API_BASE_URL}/admin/administrators/${editingAdmin.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: formData.email,
            full_name: formData.full_name,
            can_access_statistics: formData.can_access_statistics,
            can_access_users: formData.can_access_users,
            can_access_moderation: formData.can_access_moderation,
            can_access_chat: formData.can_access_chat,
            can_access_objects: formData.can_access_objects,
            can_access_seo: formData.can_access_seo,
            seo_role: formData.can_access_seo ? formData.seo_role : null
          })
        });
      } else {
        // Создание
        response = await fetch(`${API_BASE_URL}/admin/administrators`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert(editingAdmin ? t('admin_administrator_uspeshno_obnovlen_e1e6e358') : t('admin_administrator_uspeshno_sozdan_3db3cf9d'));
          setShowCreateModal(false);
          setEditingAdmin(null);
          loadAdministrators();
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || t('admin_oshibka_pri_sohranenii_administrator_5e8ff105'));
      }
    } catch (error) {
      console.error('Ошибка при сохранении администратора:', error);
      alert(t('admin_oshibka_pri_sohranenii_administrator_5e8ff105'));
    }
  };

  const handleCheckboxChange = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return <div className="access-management-loading">{t('admin_loading')}</div>;
  }

  return (
    <div className="access-management">
      <div className="access-management-header">
        <h2>{t('admin_upravlenie_dostupami_d9aae4e3')}</h2>
        <button 
          className="btn btn-primary access-create-btn" 
          onClick={handleCreate}
        >
          <FaPlus style={{ fontSize: '0.75rem' }} /> {t('admin_sozdat_administratora_3ac094f2')}
        </button>
      </div>

      <div className="access-management-list">
        {administrators.length === 0 ? (
          <div className="access-management-empty">
            {t('admin_net_administratorov_sozdayte_pervogo_98315f24')}
          </div>
        ) : (
          <table className="access-management-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>{t('admin_polnoe_imya_ce215315')}</th>
                <th>{t('admin_status_f7f293b5')}</th>
                <th>{t('admin_panel_access')}</th>
                <th>{t('admin_deystviya_9978ac34')}</th>
              </tr>
            </thead>
            <tbody>
              {administrators.map(admin => (
                <tr key={admin.id}>
                  <td>{admin.username}</td>
                  <td>{admin.email || '-'}</td>
                  <td>{admin.full_name || '-'}</td>
                  <td>
                    {admin.is_super_admin ? (
                      <span className="badge badge-super">{t('admin_super_admin_38283fb6')}</span>
                    ) : (
                      <span className="badge badge-admin">{t('admin_administrator_36d00fd7')}</span>
                    )}
                  </td>
                  <td>
                    <div className="permissions-list">
                      {admin.can_access_statistics && <span className="permission-tag">{t('admin_panel_statistics')}</span>}
                      {admin.can_access_users && <span className="permission-tag">{t('admin_panel_users')}</span>}
                      {admin.can_access_moderation && <span className="permission-tag">{t('admin_panel_moderation')}</span>}
                      {admin.can_access_chat && <span className="permission-tag">{t('admin_panel_chat')}</span>}
                      {admin.can_access_objects && <span className="permission-tag">{t('admin_panel_objects')}</span>}
                      {admin.can_access_seo && (
                        <span className="permission-tag">
                          SEO{admin.seo_role ? ` (${admin.seo_role})` : ''}
                        </span>
                      )}
                      {admin.can_access_access_management && <span className="permission-tag">{t('admin_panel_access')}</span>}
                      {!admin.can_access_statistics && !admin.can_access_users && 
                       !admin.can_access_moderation && !admin.can_access_chat && 
                       !admin.can_access_objects && !admin.can_access_seo &&
                       !admin.can_access_access_management && (
                        <span className="permission-tag permission-tag--none">{t('admin_net_dostupa_fabe7ed7')}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {!admin.is_super_admin && (
                        <>
                          <button
                            className="btn btn-icon btn-edit"
                            onClick={() => handleEdit(admin)}
                            title={t('admin_edit')}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn btn-icon btn-delete"
                            onClick={() => handleDelete(admin.id)}
                            title={t('admin_delete')}
                          >
                            <FaTrash />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAdmin ? t('admin_redaktirovat_administratora_a7d90f78') : t('admin_sozdat_administratora_3ac094f2')}</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="access-management-form">
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  disabled={!!editingAdmin}
                />
              </div>

              {!editingAdmin && (
                <div className="form-group">
                  <label>{t('admin_parol_15889b08')}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>{t('admin_polnoe_imya_ce215315')}</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="permissions-label">{t('admin_prava_dostupa_99625f1e')}</label>
                <div className="permissions-checkboxes">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.can_access_statistics}
                      onChange={() => handleCheckboxChange('can_access_statistics')}
                    />
                    <span>{t('admin_panel_statistics')}</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.can_access_users}
                      onChange={() => handleCheckboxChange('can_access_users')}
                    />
                    <span>{t('admin_panel_users')}</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.can_access_moderation}
                      onChange={() => handleCheckboxChange('can_access_moderation')}
                    />
                    <span>{t('admin_panel_moderation')}</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.can_access_chat}
                      onChange={() => handleCheckboxChange('can_access_chat')}
                    />
                    <span>{t('admin_panel_chat')}</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.can_access_objects}
                      onChange={() => handleCheckboxChange('can_access_objects')}
                    />
                    <span>{t('admin_panel_objects')}</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.can_access_seo}
                      onChange={() => handleCheckboxChange('can_access_seo')}
                    />
                    <span>{t('admin__kabinet_268c0b65')}</span>
                  </label>
                  {formData.can_access_seo && (
                    <div className="form-group">
                      <label>{t('admin_rol__f3535302')}</label>
                      <select
                        value={formData.seo_role}
                        onChange={(e) => setFormData({ ...formData, seo_role: e.target.value })}
                      >
                        <option value="editor">{t('admin_redaktor_65d42cf1')}</option>
                        <option value="marketer">{t('admin_marketolog_ee657e73')}</option>
                        <option value="admin">{t('admin_admin__eb73c9f3')}</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  {t('admin_otmena_0ec753be')}
                </button>
                <button type="submit" className="btn btn-primary">
                  <FaSave /> {editingAdmin ? t('admin_save') : t('admin_sozdat_84370a20')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessManagement;


