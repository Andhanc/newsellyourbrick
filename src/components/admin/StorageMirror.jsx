import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDatabase, FaCloudUploadAlt, FaExternalLinkAlt } from 'react-icons/fa';
import { getApiBaseUrlSync } from '../../utils/apiConfig';
import { showNotification } from '../../utils/toastHelper';
import './StorageMirror.css';

const API_BASE = getApiBaseUrlSync();

const StorageMirror = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleImport = async () => {
    if (
      !window.confirm(
        t('admin_otpravit_polnyy_snimok_bazy_89e67d32')
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
        throw new Error(data.error || t('admin_errorStatus_tmpl', { status: res.status }));
      }
      setLastResult(data);
      showNotification(t('admin_storage_pushOk'));
    } catch (e) {
      console.error(e);
      showNotification(e.message || t('admin_storage_pushFail'));
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
          <h2 className="storage-mirror__title">{t('admin_panel_storage')}</h2>
          <p className="storage-mirror__lead">
            {t('admin_storage_mirror_lead')}{' '}
            <code>STORAGE_MIRROR_URL</code> {t('admin_i_a59e2c24')} <code>STORAGE_MIRROR_SECRET</code>.
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
            <>{t('admin_sending')}</>
          ) : (
            <>
              <FaCloudUploadAlt aria-hidden /> {t('admin_importirovat_v_hranilische_726d6869')}
            </>
          )}
        </button>
      </div>

      {lastResult && !lastResult.error && (
        <div className="storage-mirror__ok">
          <strong>{t('admin_gotovo_cbdfd0ab')}</strong>{' '}
          {t('admin_storage_tables_rows', { tables: lastResult.tables, rows: lastResult.rowsTotal })}{' '}
          {t('admin_otkroyte_sayt_hranilischa_chtoby_96209c70')}
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
          {t('admin__hranilischa_zadaetsya_v_5e80a10c')} <code>STORAGE_MIRROR_URL</code> {t('admin_naprimer_vash_deploy_na_96db88c6')}
        </span>
      </div>
    </div>
  );
};

export default StorageMirror;
