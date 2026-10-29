import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Promotions.css';

const Promotions = ({ businessInfo }) => {
  const { t, i18n } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [promotions, setPromotions] = useState(businessInfo.promotions || []);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language || 'en', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleAddPromo = () => {
    setSelectedPromo(null);
    setShowModal(true);
  };

  const handleEditPromo = (promo) => {
    setSelectedPromo(promo);
    setShowModal(true);
  };

  const handleDeletePromo = (promo) => {
    setSelectedPromo(promo);
    setShowDeleteModal(true);
  };

  const handleSavePromo = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const promoData = {
      id: selectedPromo ? selectedPromo.id : Date.now(),
      title: formData.get('title'),
      description: formData.get('description'),
      start_date: formData.get('startDate'),
      end_date: formData.get('endDate'),
      is_active: formData.get('status') === 'active'
    };

    if (selectedPromo) {
      setPromotions(promotions.map(p => p.id === selectedPromo.id ? promoData : p));
    } else {
      setPromotions([...promotions, promoData]);
    }

    setShowModal(false);
    setSelectedPromo(null);
  };

  const handleConfirmDelete = () => {
    if (selectedPromo) {
      setPromotions(promotions.filter(p => p.id !== selectedPromo.id));
      setShowDeleteModal(false);
      setSelectedPromo(null);
    }
  };

  return (
    <>
      <div className="content-section" id="promotions-section">
        <div className="promotions-header">
          <h2 className="page-title">{t('admin_upravlenie_akciyami_ab701886')}</h2>
          <button className="btn btn-primary" onClick={handleAddPromo}>
            <i className="fas fa-plus"></i> {t('admin_novaya_akciya_92620bdd')}
          </button>
        </div>

        <div className="promotions-grid">
          {promotions.length > 0 ? (
            promotions.map(promo => (
              <div key={promo.id} className="promo-card">
                <div className="promo-card-header">
                  <span className={`promo-status ${promo.is_active ? 'active' : 'archived'}`}>
                    {promo.is_active ? t('admin_aktivna_c1ae5163') : t('admin_arhiv_3789b399')}
                  </span>
                  <div className="promo-actions">
                    <button className="btn-icon" onClick={() => handleEditPromo(promo)}>
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="btn-icon" onClick={() => handleDeletePromo(promo)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <img src="https://via.placeholder.com/400x200" className="promo-image" alt={t('promoImageAlt')} />
                <div className="promo-card-body">
                  <h3 className="promo-title">{promo.title}</h3>
                  <div className="promo-dates">
                    <i className="fas fa-calendar-alt"></i>
                    {formatDate(promo.start_date)} - {formatDate(promo.end_date)}
                  </div>
                  <p className="promo-description">{promo.description || t('admin_opisanie_otsutstvuet_abb327ed')}</p>
                  <div className="promo-discount">
                    <span className="discount-badge">{t('admin_akciya_b45e3d76')}</span>
                    <span className="usage-count"><i className="fas fa-calendar"></i> ID: {promo.id}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--gray-dark)' }}>
              <i className="fas fa-tags" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}></i>
              <p>{t('admin_u_vas_poka_net_397f9995')}</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal" onClick={(e) => e.target.classList.contains('modal') && setShowModal(false)}>
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            <div className="modal-header">
              <h3 className="modal-title">{selectedPromo ? t('admin_redaktirovanie_akcii_3e250da6') : t('admin_novaya_akciya_92620bdd')}</h3>
            </div>
            <form className="promo-form" onSubmit={handleSavePromo}>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('admin_nazvanie_akcii_c9e40fd3')}</label>
                  <input
                    type="text"
                    className="form-input"
                    name="title"
                    defaultValue={selectedPromo?.title || ''}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('admin_status_f7f293b5')}</label>
                  <select className="form-select" name="status" defaultValue={selectedPromo?.is_active ? 'active' : 'archived'}>
                    <option value="active">{t('admin_aktivna_c1ae5163')}</option>
                    <option value="archived">{t('admin_arhiv_3789b399')}</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('admin_data_nachala_e77a981e')}</label>
                  <input
                    type="date"
                    className="form-input"
                    name="startDate"
                    defaultValue={selectedPromo?.start_date || ''}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('admin_data_okonchaniya_4bb7cb72')}</label>
                  <input
                    type="date"
                    className="form-input"
                    name="endDate"
                    defaultValue={selectedPromo?.end_date || ''}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>{t('admin_description')}</label>
                <textarea
                  className="form-textarea"
                  name="description"
                  rows="3"
                  defaultValue={selectedPromo?.description || ''}
                ></textarea>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  {t('admin_otmena_0ec753be')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('admin_save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal" onClick={(e) => e.target.classList.contains('modal') && setShowDeleteModal(false)}>
          <div className="modal-content small-modal">
            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>&times;</button>
            <div className="modal-header">
              <h3 className="modal-title">{t('admin_udalenie_akcii_d4d58adf')}</h3>
            </div>
            <div className="modal-body">
              <p>{t('admin_vy_uvereny_chto_hotite_5a7c9d9c')}</p>
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={() => setShowDeleteModal(false)}>
                  {t('admin_otmena_0ec753be')}
                </button>
                <button className="btn btn-danger" onClick={handleConfirmDelete}>
                  {t('admin_delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Promotions;


