import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaGem } from 'react-icons/fa'
import { getApiBaseUrl } from '../../utils/apiConfig'
import { showNotification } from '../../utils/toastHelper'
import './AdminPrivateClub.css'
import { getUiIntlLocale } from '../../utils/uiIntlLocale'

function formatDt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleString(getUiIntlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const AdminPrivateClub = () => {
  const { t } = useTranslation()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const API_BASE_URL = await getApiBaseUrl()
      const res = await fetch(`${API_BASE_URL}/admin/private-club/members`)
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setList(data.data)
      } else {
        showNotification(data.error || t('admin_privateClub_listFail'))
      }
    } catch (e) {
      console.error(e)
      showNotification(t('admin_privateClub_networkLoad'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const revoke = async (row) => {
    if (!row.can_revoke_db) return
    if (!window.confirm(t('admin_snyat_dostup_zakrytogo_kluba_85dccb28', { id: row.id }))) {
      return
    }
    try {
      setBusyId(row.id)
      const API_BASE_URL = await getApiBaseUrl()
      const res = await fetch(`${API_BASE_URL}/admin/private-club/members/${row.id}/revoke`, { method: 'POST' })
      const data = await res.json()
      if (!data.success) {
        showNotification(data.error || t('admin_error'))
        return
      }
      if (data.data?.still_has_vip_access) {
        showNotification(
          t('admin_privateClub_stripeStillActive'),
          'info',
          8000,
        )
      } else {
        showNotification(t('admin_privateClub_accessRevoked'), 'success')
      }
      await load()
    } catch (e) {
      console.error(e)
      showNotification(t('admin_networkError'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-private-club">
      <div className="admin-private-club__header">
        <h2>
          <FaGem style={{ marginRight: 8, verticalAlign: 'middle', color: '#0099A9' }} size={20} />
          {t('admin_panel_privateClub')}
        </h2>
        <p>
          {t('admin_uchastniki_s_aktivnym_srokom_265db5ee')}
        </p>
      </div>
      <div className="admin-private-club__toolbar">
        <button type="button" disabled={loading} onClick={() => void load()}>
          {t('admin_sa_refresh')}
        </button>
      </div>
      {loading ? (
        <div className="admin-private-club__loading">{t('admin_loadingEllipsis')}</div>
      ) : list.length === 0 ? (
        <div className="admin-private-club__empty">{t('admin_net_aktivnyh_uchastnikov_be0a2f84')}</div>
      ) : (
        <div className="admin-private-club__table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>{t('admin_polzovatel_51aff185')}</th>
                <th>{t('admin_sa_contacts')}</th>
                <th>vip_until</th>
                <th>vip_granted_at</th>
                <th>Stripe</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((row) => {
                const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || '—'
                return (
                  <tr key={row.id}>
                    <td className="admin-private-club__mono">{row.id}</td>
                    <td>
                      {name}
                      {row.user_id_number ? (
                        <div className="admin-private-club__hint">№ {row.user_id_number}</div>
                      ) : null}
                    </td>
                    <td>
                      <div>{row.email || '—'}</div>
                      <div className="admin-private-club__hint">{row.phone_number || ''}</div>
                    </td>
                    <td className="admin-private-club__mono">{formatDt(row.vip_until)}</td>
                    <td className="admin-private-club__mono">{formatDt(row.vip_granted_at)}</td>
                    <td>
                      {row.stripe_vip_active ? (
                        <span className="admin-private-club__pill">VIP {row.stripe_status || ''}</span>
                      ) : (
                        <span className="admin-private-club__pill admin-private-club__pill--muted">—</span>
                      )}
                      {row.stripe_period_end ? (
                        <div className="admin-private-club__hint">{t('admin_period_do_41c4965c')} {String(row.stripe_period_end)}</div>
                      ) : null}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-private-club__btn-danger"
                        disabled={!row.can_revoke_db || busyId === row.id}
                        title={
                          row.can_revoke_db
                            ? t('admin_snyat_status_v_bd_3c035611')
                            : t('admin_net_aktivnogo_sroka_v_0c605908')
                        }
                        onClick={() => void revoke(row)}
                      >
                        {busyId === row.id ? '…' : t('admin_isklyuchit_85961c9f')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminPrivateClub
