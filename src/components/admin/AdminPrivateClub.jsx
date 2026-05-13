import React, { useCallback, useEffect, useState } from 'react'
import { FaGem } from 'react-icons/fa'
import { getApiBaseUrl } from '../../utils/apiConfig'
import { showNotification } from '../../utils/toastHelper'
import './AdminPrivateClub.css'

function formatDt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const AdminPrivateClub = () => {
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
        showNotification(data.error || 'Не удалось загрузить список')
      }
    } catch (e) {
      console.error(e)
      showNotification('Ошибка сети при загрузке')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const revoke = async (row) => {
    if (!row.can_revoke_db) return
    if (!window.confirm(`Снять доступ закрытого клуба у пользователя #${row.id}? Будут обнулены vip_until и vip_granted_at.`)) {
      return
    }
    try {
      setBusyId(row.id)
      const API_BASE_URL = await getApiBaseUrl()
      const res = await fetch(`${API_BASE_URL}/admin/private-club/members/${row.id}/revoke`, { method: 'POST' })
      const data = await res.json()
      if (!data.success) {
        showNotification(data.error || 'Ошибка')
        return
      }
      if (data.data?.still_has_vip_access) {
        showNotification(
          'Поля в БД сброшены, но у пользователя остаётся активная подписка Stripe VIP — доступ к клубу сохраняется.',
          'info',
          8000,
        )
      } else {
        showNotification('Доступ снят, пользователь получит уведомление в кабинете.', 'success')
      }
      await load()
    } catch (e) {
      console.error(e)
      showNotification('Ошибка сети')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-private-club">
      <div className="admin-private-club__header">
        <h2>
          <FaGem style={{ marginRight: 8, verticalAlign: 'middle', color: '#0abab5' }} size={20} />
          Закрытый клуб
        </h2>
        <p>
          Участники с активным сроком в базе (vip_until) или активной подпиской VIP в Stripe. «Исключить» обнуляет даты в
          БД; если остаётся только Stripe VIP, кнопка недоступна — отмена подписки в Stripe.
        </p>
      </div>
      <div className="admin-private-club__toolbar">
        <button type="button" disabled={loading} onClick={() => void load()}>
          Обновить
        </button>
      </div>
      {loading ? (
        <div className="admin-private-club__loading">Загрузка…</div>
      ) : list.length === 0 ? (
        <div className="admin-private-club__empty">Нет активных участников.</div>
      ) : (
        <div className="admin-private-club__table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Пользователь</th>
                <th>Контакты</th>
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
                        <div className="admin-private-club__hint">период до {String(row.stripe_period_end)}</div>
                      ) : null}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-private-club__btn-danger"
                        disabled={!row.can_revoke_db || busyId === row.id}
                        title={
                          row.can_revoke_db
                            ? 'Снять статус в БД (vip_until, vip_granted_at)'
                            : 'Нет активного срока в БД — только Stripe VIP или доступ уже снят'
                        }
                        onClick={() => void revoke(row)}
                      >
                        {busyId === row.id ? '…' : 'Исключить'}
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
