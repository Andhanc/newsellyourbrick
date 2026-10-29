import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import { getApiBaseUrlSync } from '../../utils/apiConfig';
import './DebtReasons.css';

const API_BASE_URL = getApiBaseUrlSync();

const DebtReasons = () => {
  const { t } = useTranslation();
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
    if (!window.confirm(t('admin_udalit_etu_prichinu_dolga_80837164'))) return;
    try {
      const response = await fetch(`${API_BASE_URL}/admin/debt-reasons/${id}`, { method: 'DELETE' });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          loadReasons();
        }
      } else {
        const err = await response.json();
        alert(err.error || t('admin_oshibka_pri_udalenii_746c5012'));
      }
    } catch (error) {
      console.error(error);
      alert(t('admin_oshibka_pri_udalenii_746c5012'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title_ru?.trim()) {
      alert(t('admin_ukazhite_nazvanie_prichiny_dolga_e438bd76'));
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
        alert(err.error || t('admin_oshibka_pri_sohranenii_9ed7753c'));
      }
    } catch (error) {
      console.error(error);
      alert(t('admin_oshibka_pri_sohranenii_9ed7753c'));
    }
  };

  if (loading) {
    return <div className="debt-reasons-loading">{t('admin_loading')}</div>;
  }

  return (
    <div className="debt-reasons">
      <div className="debt-reasons-header">
        <h2>{t('admin_prichiny_dolga_d84b8063')}</h2>
        <p className="debt-reasons-desc">
          {t('admin_spisok_prichin_vidov_dolga_117a0f59')}
        </p>
        <button type="button" className="btn btn-primary debt-reasons-create" onClick={handleCreate}>
          <FaPlus /> {t('admin_dobavit_prichinu_6ade0f0d')}
        </button>
      </div>

      <div className="debt-reasons-list">
        {reasons.length === 0 ? (
          <div className="debt-reasons-empty">{t('admin_net_prichin_dolga_dobavte_be74639e')}</div>
        ) : (
          <table className="debt-reasons-table">
            <thead>
              <tr>
                <th>{t('admin_poryadok_f6f1e527')}</th>
                <th>{t('admin_title')}</th>
                <th>{t('admin_kod_67088374')}</th>
                <th>{t('admin_deystviya_9978ac34')}</th>
              </tr>
            </thead>
            <tbody>
              {reasons.map((r) => (
                <tr key={r.id}>
                  <td>{r.sort_order ?? r.id}</td>
                  <td>{r.title_ru}</td>
                  <td>{r.code || '—'}</td>
                  <td>
                    <button type="button" className="btn btn-icon btn-edit" onClick={() => handleEdit(r)} title={t('admin_edit')}>
                      <FaEdit />
                    </button>
                    <button type="button" className="btn btn-icon btn-delete" onClick={() => handleDelete(r.id)} title={t('admin_delete')}>
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
              <h3>{editingItem ? t('admin_redaktirovat_prichinu_dolga_b57bc21c') : t('admin_dobavit_prichinu_dolga_04d9c341')}</h3>
              <button type="button" className="modal-close" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="debt-reasons-form">
              <div className="form-group">
                <label>{t('admin_nazvanie_rus_83866e10')}</label>
                <input
                  type="text"
                  value={formData.title_ru}
                  onChange={(e) => setFormData({ ...formData, title_ru: e.target.value })}
                  placeholder={t('admin_debtReasonNamePlaceholder')}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('admin_kod_latinica_dlya_svyazi_4b10db5d')}</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder={t('admin_debtReasonCodePlaceholder')}
                />
              </div>
              <div className="form-group">
                <label>{t('admin_poryadok_otobrazheniya_db7b5744')}</label>
                <input
                  type="number"
                  min={0}
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {t('admin_otmena_0ec753be')}
                </button>
                <button type="submit" className="btn btn-primary">
                  <FaSave /> {editingItem ? t('admin_save') : t('admin_dobavit_559a87f7')}
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
