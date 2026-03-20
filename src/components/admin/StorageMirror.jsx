import React, { useState } from 'react';
import { FaDatabase, FaCloudUploadAlt, FaExternalLinkAlt } from 'react-icons/fa';
import { getApiBaseUrlSync } from '../../utils/apiConfig';
import { showNotification } from '../../utils/toastHelper';
import './StorageMirror.css';

const API_BASE = getApiBaseUrlSync();

const StorageMirror = () => {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleImport = async () => {
    if (
      !window.confirm(
        'Отправить полный снимок базы во внешнее хранилище? Пароли и данные карт в снимке маскируются.'
      )
    ) {
      return;
    }
    setLoading(true);
    setLastResult(null);
    try {
      const res = await fetch(`${API_BASE}/admin/storage/mirror-push`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Ошибка ${res.status}`);
      }
      setLastResult(data);
      showNotification('Данные успешно отправлены в хранилище');
    } catch (e) {
      console.error(e);
      showNotification(e.message || 'Не удалось выполнить импорт');
      setLastResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="storage-mirror">
      <div className="storage-mirror__hero">
        <div className="storage-mirror__icon-wrap">
          <FaDatabase className="storage-mirror__icon" aria-hidden />
        </div>
        <div>
          <h2 className="storage-mirror__title">Хранилище</h2>
          <p className="storage-mirror__lead">
            Копия структуры и данных сайта (SQLite) отправляется на отдельный сервис «хранилище» и
            отображается там в виде таблиц по блокам. На сервере основного сайта должны быть заданы
            переменные <code>STORAGE_MIRROR_URL</code> и <code>STORAGE_MIRROR_SECRET</code>.
          </p>
        </div>
      </div>

      <div className="storage-mirror__actions">
        <button
          type="button"
          className="storage-mirror__btn storage-mirror__btn--primary"
          disabled={loading}
          onClick={handleImport}
        >
          {loading ? (
            <>Отправка…</>
          ) : (
            <>
              <FaCloudUploadAlt aria-hidden /> Импортировать в хранилище
            </>
          )}
        </button>
      </div>

      {lastResult && !lastResult.error && (
        <div className="storage-mirror__ok">
          <strong>Готово.</strong> Таблиц: {lastResult.tables}, строк всего: {lastResult.rowsTotal}.
          Откройте сайт хранилища, чтобы увидеть таблицу.
        </div>
      )}

      {lastResult?.error && (
        <div className="storage-mirror__err" role="alert">
          {lastResult.error}
        </div>
      )}

      <div className="storage-mirror__hint">
        <FaExternalLinkAlt aria-hidden />
        <span>
          URL хранилища задаётся в <code>STORAGE_MIRROR_URL</code> (например, ваш деплой на Railway).
        </span>
      </div>
    </div>
  );
};

export default StorageMirror;
