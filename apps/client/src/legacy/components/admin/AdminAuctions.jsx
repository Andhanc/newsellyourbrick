import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  isAuctionListingEnded,
  isPreAuctionPhaseActive,
} from '../../utils/auctionReminderBounds';
import { getApiBaseUrlSync } from '../../utils/apiConfig';
import './AdminAuctions.css';

const API_BASE = getApiBaseUrlSync();

/** @param {Record<string, unknown>} p */
function resolveBidSourceTable(p) {
  const st = p?.source_table;
  if (st === 'properties_apartments' || st === 'apartments') return 'properties_apartments';
  if (st === 'properties_houses' || st === 'houses') return 'properties_houses';
  const t = String(p?.property_type || '').toLowerCase();
  if (t === 'house' || t === 'villa') return 'properties_houses';
  return 'properties_apartments';
}

function formatMoney(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}`;
}

function formatDateTime(iso) {
  if (iso == null || iso === '') return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

function AdminAuctionBidsModal({ property, bidSourceTable, onClose }) {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const pid = property?.id;
  const title = property?.title || property?.name || `Объект #${pid}`;
  const img =
    property?.image ||
    (Array.isArray(property?.images) && property.images[0]) ||
    property?.photos?.[0] ||
    null;

  const load = useCallback(async () => {
    if (pid == null) return;
    setLoading(true);
    setError(null);
    try {
      const q = bidSourceTable
        ? `?source_table=${encodeURIComponent(bidSourceTable)}`
        : '';
      const res = await fetch(`${API_BASE}/admin/auctions/${pid}/bids${q}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Ошибка ${res.status}`);
      }
      setBids(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e?.message || 'Не удалось загрузить ставки');
      setBids([]);
    } finally {
      setLoading(false);
    }
  }, [pid, bidSourceTable]);

  useEffect(() => {
    load();
  }, [load]);

  const userCell = (u) => {
    if (!u) return <span className="admin-auctions-modal__muted">—</span>;
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    const lines = [
      name || '—',
      u.email ? `Email: ${u.email}` : null,
      u.phone_number ? `Тел.: ${u.phone_number}` : null,
      u.country ? `Страна: ${u.country}` : null,
      u.telegram_username ? `TG: @${String(u.telegram_username).replace(/^@/, '')}` : null,
      u.user_id_number ? `ID: ${u.user_id_number}` : null,
      u.role ? `Роль: ${u.role}` : null,
    ].filter(Boolean);
    return (
      <div>
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    );
  };

  return (
    <div
      className="admin-auctions-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="admin-auctions-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-auction-bids-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-auctions-modal__head">
          {img ? (
            <img src={typeof img === 'string' ? img : img?.url || ''} alt="" />
          ) : null}
          <div className="admin-auctions-modal__head-text">
            <h2 id="admin-auction-bids-title">Ставки: {title}</h2>
            <p>
              Лот #{pid}
              {bidSourceTable ? ` · ${bidSourceTable}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="admin-auctions-modal__close"
            aria-label="Закрыть"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="admin-auctions-modal__body">
          {loading && <p>Загрузка ставок…</p>}
          {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
          {!loading && !error && bids.length === 0 && (
            <p className="admin-auctions-modal__muted">По этому лоту ставок пока нет.</p>
          )}
          {!loading && !error && bids.length > 0 && (
            <div className="admin-auctions-modal__table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Сумма</th>
                    <th>Дата</th>
                    <th>User DB id</th>
                    <th>Участник</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map((b) => (
                    <tr key={b.id}>
                      <td className="admin-auctions-modal__amount">
                        {formatMoney(b.bid_amount)}
                      </td>
                      <td>{formatDateTime(b.created_at)}</td>
                      <td>{b.user_id}</td>
                      <td>{userCell(b.user)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const AdminAuctions = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('active');
  const [search, setSearch] = useState('');
  const [modalProperty, setModalProperty] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const lang = (localStorage.getItem('i18nextLng') || 'ru').split('-')[0];
        const res = await fetch(`${API_BASE}/properties/auctions?lang=${lang}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Ошибка ${res.status}`);
        }
        if (!cancelled) {
          setList(Array.isArray(json.data) ? json.data : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Не удалось загрузить аукционы');
          setList([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return list.filter((p) => {
      if (!normalizedSearch) return true;
      const title = String(p.title || p.name || '').toLowerCase();
      const loc = String(p.location || '').toLowerCase();
      return title.includes(normalizedSearch) || loc.includes(normalizedSearch);
    });
  }, [list, normalizedSearch]);

  const { active, completed } = useMemo(() => {
    const a = [];
    const c = [];
    for (const p of filtered) {
      if (isAuctionListingEnded(p)) c.push(p);
      else a.push(p);
    }
    return { active: a, completed: c };
  }, [filtered]);

  const shown = tab === 'active' ? active : completed;

  if (loading && list.length === 0) {
    return (
      <div className="admin-auctions">
        <p className="admin-auctions__empty">Загрузка аукционов…</p>
      </div>
    );
  }

  if (error && list.length === 0) {
    return (
      <div className="admin-auctions">
        <p className="admin-auctions__empty" style={{ color: '#b91c1c' }}>
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="admin-auctions">
      <div className="admin-auctions__toolbar">
        <div className="admin-auctions__tabs">
          <button
            type="button"
            className={`admin-auctions__tab${tab === 'active' ? ' admin-auctions__tab--active' : ''}`}
            onClick={() => setTab('active')}
          >
            Текущие ({active.length})
          </button>
          <button
            type="button"
            className={`admin-auctions__tab${tab === 'completed' ? ' admin-auctions__tab--active' : ''}`}
            onClick={() => setTab('completed')}
          >
            Завершённые ({completed.length})
          </button>
        </div>
        <div className="admin-auctions__search">
          <input
            type="search"
            placeholder="Поиск по названию или локации…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Поиск"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="admin-auctions__empty">
          {tab === 'active'
            ? 'Нет активных аукционов по текущим фильтрам.'
            : 'Нет завершённых аукционов по текущим фильтрам.'}
        </p>
      ) : (
        <div className="admin-auctions__grid">
          {shown.map((p) => {
            const ended = isAuctionListingEnded(p);
            const pre = !ended && isPreAuctionPhaseActive(p);
            const phaseLabel = ended
              ? 'Завершён'
              : pre
                ? 'Преаукцион'
                : 'Аукцион';
            const phaseClass = ended
              ? 'admin-auctions__badge--done'
              : pre
                ? 'admin-auctions__badge--pre'
                : 'admin-auctions__badge--live';
            const thumb =
              p.image ||
              (Array.isArray(p.images) && p.images[0]) ||
              (Array.isArray(p.photos) && p.photos[0]) ||
              null;
            const thumbUrl =
              typeof thumb === 'string' ? thumb : thumb?.url || '';

            return (
              <article
                key={`${resolveBidSourceTable(p)}:${p.id}`}
                className="admin-auctions__card"
              >
                <button
                  type="button"
                  className="admin-auctions__thumb-wrap"
                  onClick={() => setModalProperty(p)}
                  title="Показать все ставки"
                >
                  <img
                    src={
                      thumbUrl ||
                      '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'
                    }
                    alt=""
                  />
                  <span className="admin-auctions__thumb-hint">Ставки — нажмите</span>
                </button>
                <div className="admin-auctions__body">
                  <div className="admin-auctions__badges">
                    <span className={`admin-auctions__badge ${phaseClass}`}>{phaseLabel}</span>
                  </div>
                  <h3 className="admin-auctions__title">{p.title || p.name || `Лот #${p.id}`}</h3>
                  <p className="admin-auctions__meta">{p.location || '—'}</p>
                  <p className="admin-auctions__meta">
                    Старт: {formatMoney(p.auction_starting_price ?? p.auctionStartingPrice)}
                    {p.price != null && Number(p.price) > 0 && (
                      <> · Купить сейчас: {formatMoney(p.price)}</>
                    )}
                  </p>
                  <a
                    className="admin-auctions__link"
                    href={`/property/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Открыть карточку на сайте
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modalProperty && (
        <AdminAuctionBidsModal
          property={modalProperty}
          bidSourceTable={resolveBidSourceTable(modalProperty)}
          onClose={() => setModalProperty(null)}
        />
      )}
    </div>
  );
};

export default AdminAuctions;
