import React, { useState } from 'react';
import './Promotions.css';

const Promotions = ({ businessInfo }) => {
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [promotions, setPromotions] = useState(businessInfo.promotions || []);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
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
          <h2 className="page-title">Управление акциями</h2>
          <button className="btn btn-primary" onClick={handleAddPromo}>
            <i className="fas fa-plus"></i> Новая акция
          </button>
        </div>

        <div className="promotions-grid">
          {promotions.length > 0 ? (
            promotions.map(promo => (
              <div key={promo.id} className="promo-card">
                <div className="promo-card-header">
                  <span className={`promo-status ${promo.is_active ? 'active' : 'archived'}`}>
                    {promo.is_active ? 'Активна' : 'Архив'}
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
                <img src="https://via.placeholder.com/400x200" className="promo-image" alt="Акция" />
                <div className="promo-card-body">
                  <h3 className="promo-title">{promo.title}</h3>
                  <div className="promo-dates">
                    <i className="fas fa-calendar-alt"></i>
                    {formatDate(promo.start_date)} - {formatDate(promo.end_date)}
                  </div>
                  <p className="promo-description">{promo.description || 'Описание отсутствует'}</p>
                  <div className="promo-discount">
                    <span className="discount-badge">Акция</span>
                    <span className="usage-count"><i className="fas fa-calendar"></i> ID: {promo.id}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--gray-dark)' }}>
              <i className="fas fa-tags" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}></i>
              <p>У вас пока нет акций. Создайте первую акцию, нажав кнопку "Новая акция"</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal" onClick={(e) => e.target.classList.contains('modal') && setShowModal(false)}>
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            <div className="modal-header">
              <h3 className="modal-title">{selectedPromo ? 'Редактирование акции' : 'Новая акция'}</h3>
            </div>
            <form className="promo-form" onSubmit={handleSavePromo}>
              <div className="form-row">
                <div className="form-group">
                  <label>Название акции</label>
                  <input
                    type="text"
                    className="form-input"
                    name="title"
                    defaultValue={selectedPromo?.title || ''}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Статус</label>
                  <select className="form-select" name="status" defaultValue={selectedPromo?.is_active ? 'active' : 'archived'}>
                    <option value="active">Активна</option>
                    <option value="archived">Архив</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Дата начала</label>
                  <input
                    type="date"
                    className="form-input"
                    name="startDate"
                    defaultValue={selectedPromo?.start_date || ''}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Дата окончания</label>
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
                <label>Описание</label>
                <textarea
                  className="form-textarea"
                  name="description"
                  rows="3"
                  defaultValue={selectedPromo?.description || ''}
                ></textarea>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  Сохранить
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
              <h3 className="modal-title">Удаление акции</h3>
            </div>
            <div className="modal-body">
              <p>Вы уверены, что хотите удалить эту акцию?</p>
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={() => setShowDeleteModal(false)}>
                  Отмена
                </button>
                <button className="btn btn-danger" onClick={handleConfirmDelete}>
                  Удалить
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


