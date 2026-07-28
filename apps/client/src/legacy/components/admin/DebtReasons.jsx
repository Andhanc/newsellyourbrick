import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import { getApiBaseUrlSync } from '../../utils/apiConfig';
import './DebtReasons.css';

const API_BASE_URL = getApiBaseUrlSync();

const DebtReasons = () => {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title_ru: '',
    code: '',
    sort_order: 0
  });

  useEffect(() => {
    loadReasons();
  }, []);

  const loadReasons = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/debt-reasons`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReasons(data.data || []);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке причин долга:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({ title_ru: '', code: '', sort_order: reasons.length ? Math.max(...reasons.map(r => r.sort_order || 0)) + 1 : 0 });
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setFormData({
      title_ru: item.title_ru || '',
      code: item.code || '',
      sort_order: item.sort_order != null ? item.sort_order : 0
    });
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить эту причину долга? Она может использоваться в объявлениях.')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/admin/debt-reasons/${id}`, { method: 'DELETE' });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          loadReasons();
        }
      } else {
        const err = await response.json();
        alert(err.error || 'Ошибка при удалении');
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка при удалении');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title_ru?.trim()) {
      alert('Укажите название причины долга');
      return;
    }
    try {
      const payload = {
        title_ru: formData.title_ru.trim(),
        code: formData.code?.trim() || null,
        sort_order: parseInt(formData.sort_order, 10) || 0
      };
      let response;
      if (editingItem) {
        response = await fetch(`${API_BASE_URL}/admin/debt-reasons/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${API_BASE_URL}/admin/debt-reasons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setShowModal(false);
          setEditingItem(null);
          loadReasons();
        }
      } else {
        const err = await response.json();
        alert(err.error || 'Ошибка при сохранении');
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка при сохранении');
    }
  };

  if (loading) {
    return <div className="debt-reasons-loading">Загрузка...</div>;
  }

  return (
    <div className="debt-reasons">
      <div className="debt-reasons-header">
        <h2>Причины долга</h2>
        <p className="debt-reasons-desc">
          Список причин (видов долга), которые продавец может выбрать при добавлении объекта «Долги». Порядок отображения задаётся полем «Порядок».
        </p>
        <button type="button" className="btn btn-primary debt-reasons-create" onClick={handleCreate}>
          <FaPlus /> Добавить причину
        </button>
      </div>

      <div className="debt-reasons-list">
        {reasons.length === 0 ? (
          <div className="debt-reasons-empty">Нет причин долга. Добавьте первую.</div>
        ) : (
          <table className="debt-reasons-table">
            <thead>
              <tr>
                <th>Порядок</th>
                <th>Название</th>
                <th>Код</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {reasons.map((r) => (
                <tr key={r.id}>
                  <td>{r.sort_order ?? r.id}</td>
                  <td>{r.title_ru}</td>
                  <td>{r.code || '—'}</td>
                  <td>
                    <button type="button" className="btn btn-icon btn-edit" onClick={() => handleEdit(r)} title="Редактировать">
                      <FaEdit />
                    </button>
                    <button type="button" className="btn btn-icon btn-delete" onClick={() => handleDelete(r.id)} title="Удалить">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay debt-reasons-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content debt-reasons-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingItem ? 'Редактировать причину долга' : 'Добавить причину долга'}</h3>
              <button type="button" className="modal-close" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="debt-reasons-form">
              <div className="form-group">
                <label>Название (рус) *</label>
                <input
                  type="text"
                  value={formData.title_ru}
                  onChange={(e) => setFormData({ ...formData, title_ru: e.target.value })}
                  placeholder="Например: Долги по коммунальным услугам"
                  required
                />
              </div>
              <div className="form-group">
                <label>Код (латиница, для связи с формой)</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Например: utilities"
                />
              </div>
              <div className="form-group">
                <label>Порядок отображения</label>
                <input
                  type="number"
                  min={0}
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  <FaSave /> {editingItem ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtReasons;
