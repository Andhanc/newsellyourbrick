import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import './AccessManagement.css';
import { getApiBaseUrlSync } from '../../utils/apiConfig';

const API_BASE_URL = getApiBaseUrlSync();

const AccessManagement = () => {
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
    can_access_objects: false
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
      can_access_objects: admin.can_access_objects
    });
    setEditingAdmin(admin);
    setShowCreateModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого администратора?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/administrators/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('Администратор успешно удален');
          loadAdministrators();
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Ошибка при удалении администратора');
      }
    } catch (error) {
      console.error('Ошибка при удалении администратора:', error);
      alert('Ошибка при удалении администратора');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || (!formData.password && !editingAdmin)) {
      alert('Необходимо указать username и пароль');
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
            can_access_objects: formData.can_access_objects
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
          alert(editingAdmin ? 'Администратор успешно обновлен' : 'Администратор успешно создан');
          setShowCreateModal(false);
          setEditingAdmin(null);
          loadAdministrators();
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Ошибка при сохранении администратора');
      }
    } catch (error) {
      console.error('Ошибка при сохранении администратора:', error);
      alert('Ошибка при сохранении администратора');
    }
  };

  const handleCheckboxChange = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return <div className="access-management-loading">Загрузка...</div>;
  }

  return (
    <div className="access-management">
      <div className="access-management-header">
        <h2>Управление доступами</h2>
        <button 
          className="btn btn-primary access-create-btn" 
          onClick={handleCreate}
        >
          <FaPlus style={{ fontSize: '0.75rem' }} /> Создать администратора
        </button>
      </div>

      <div className="access-management-list">
        {administrators.length === 0 ? (
          <div className="access-management-empty">
            Нет администраторов. Создайте первого администратора.
          </div>
        ) : (
          <table className="access-management-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Полное имя</th>
                <th>Статус</th>
                <th>Доступы</th>
                <th>Действия</th>
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
                      <span className="badge badge-super">Супер-админ</span>
                    ) : (
                      <span className="badge badge-admin">Администратор</span>
                    )}
                  </td>
                  <td>
                    <div className="permissions-list">
                      {admin.can_access_statistics && <span className="permission-tag">Статистика</span>}
                      {admin.can_access_users && <span className="permission-tag">Пользователи</span>}
                      {admin.can_access_moderation && <span className="permission-tag">Модерация</span>}
                      {admin.can_access_chat && <span className="permission-tag">Чат</span>}
                      {admin.can_access_objects && <span className="permission-tag">Объекты</span>}
                      {admin.can_access_access_management && <span className="permission-tag">Доступы</span>}
                      {!admin.can_access_statistics && !admin.can_access_users && 
                       !admin.can_access_moderation && !admin.can_access_chat && 
                       !admin.can_access_objects && !admin.can_access_access_management && (
                        <span className="permission-tag permission-tag--none">Нет доступа</span>
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
                            title="Редактировать"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn btn-icon btn-delete"
                            onClick={() => handleDelete(admin.id)}
                            title="Удалить"
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
              <h3>{editingAdmin ? 'Редактировать администратора' : 'Создать администратора'}</h3>
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
                  <label>Пароль *</label>
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
                <label>Полное имя</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="permissions-label">Права доступа:</label>
                <div className="permissions-checkboxes">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.can_access_statistics}
                      onChange={() => handleCheckboxChange('can_access_statistics')}
                    />
                    <span>Статистика</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.can_access_users}
                      onChange={() => handleCheckboxChange('can_access_users')}
                    />
                    <span>Пользователи</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.can_access_moderation}
                      onChange={() => handleCheckboxChange('can_access_moderation')}
                    />
                    <span>Модерация</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.can_access_chat}
                      onChange={() => handleCheckboxChange('can_access_chat')}
                    />
                    <span>Чат</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.can_access_objects}
                      onChange={() => handleCheckboxChange('can_access_objects')}
                    />
                    <span>Объекты</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  <FaSave /> {editingAdmin ? 'Сохранить' : 'Создать'}
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


