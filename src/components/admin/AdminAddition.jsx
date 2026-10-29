import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next';
import AddProperty from '../../pages/AddProperty'
import './AdminAddition.css'

const AdminAddition = ({ onPublishComplete = null }) => {
  const { t } = useTranslation();
  const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'
  const [sellers, setSellers] = useState([])
  const [loadingSellers, setLoadingSellers] = useState(false)
  const [sellersError, setSellersError] = useState(null)
  const [selectedOwnerId, setSelectedOwnerId] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadSellers = async () => {
      setLoadingSellers(true)
      setSellersError(null)
      try {
        const res = await fetch(`${API_BASE_URL}/users/role/seller`)
        const data = await res.json().catch(() => ({}))
        if (!cancelled && data.success && Array.isArray(data.data)) {
          setSellers(data.data)
        }
        if (!cancelled && !data.success) {
          setSellersError(data.error || t('admin_ne_udalos_zagruzit_spisok_7f82d147'))
        }
      } catch (e) {
        if (!cancelled) setSellersError(e?.message || t('admin_ne_udalos_zagruzit_spisok_7f82d147'))
      } finally {
        if (!cancelled) setLoadingSellers(false)
      }
    }

    loadSellers()
    return () => {
      cancelled = true
    }
  }, [API_BASE_URL])

  const selectedOwner = useMemo(() => {
    if (!selectedOwnerId) return null
    return sellers.find(u => String(u.id) === String(selectedOwnerId)) || null
  }, [sellers, selectedOwnerId])

  const formatUserName = (u) => {
    const first = u?.first_name ?? u?.firstName ?? ''
    const last = u?.last_name ?? u?.lastName ?? ''
    const name = `${first} ${last}`.trim()
    return name || `#${u?.id}`
  }

  return (
    <div className="admin-addition">
      {!selectedOwnerId ? (
        <div className="admin-addition__card">
          <h2 className="admin-addition__title">{t('admin_panel_addition')}</h2>
          <p className="admin-addition__text">
            {t('admin_vyberite_prodavca_kotoromu_budet_b4a2b605')}
          </p>

          {loadingSellers && <div className="admin-addition__hint">{t('admin_zagruzka_prodavcov_e26858bb')}</div>}
          {sellersError && <div className="admin-addition__error">{sellersError}</div>}

          {!loadingSellers && !sellersError && (
            <>
              <label className="admin-addition__label" htmlFor="admin-addition-owner">
                {t('admin_seller')}
              </label>
              <select
                id="admin-addition-owner"
                className="admin-addition__select"
                value={selectedOwnerId || ''}
                onChange={(e) => {
                  const v = e.target.value
                  setSelectedOwnerId(v ? Number(v) : null)
                }}
              >
                <option value="" disabled>
                  {t('admin_vyberite_polzovatelya_0c01b818')}
                </option>
                {sellers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {formatUserName(u)} (id: {u.id})
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="admin-addition__owner-bar">
            <div className="admin-addition__owner-bar-text">
              <div className="admin-addition__owner-bar-title">{t('admin_vladelec_obekta_1256d645')}</div>
              <div className="admin-addition__owner-bar-subtitle">
                {formatUserName(selectedOwner)} (id: {selectedOwner?.id})
              </div>
            </div>

            <button
              type="button"
              className="admin-addition__btn admin-addition__btn--ghost"
              onClick={() => setSelectedOwnerId(null)}
            >
              {t('admin_smenit_279c2c3c')}
            </button>
          </div>

          <AddProperty
            key={selectedOwnerId}
            adminOwnerId={selectedOwnerId}
            adminMode
            onAdminBack={() => setSelectedOwnerId(null)}
            onAdminComplete={onPublishComplete}
          />
        </>
      )}
    </div>
  )
}

export default AdminAddition

