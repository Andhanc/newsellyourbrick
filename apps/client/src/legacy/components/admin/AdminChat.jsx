import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSend, FiSearch, FiZap, FiMessageCircle, FiCpu } from 'react-icons/fi';
import './AdminChat.css';
import { askPropertyAssistant } from '../../services/aiService';
import { getApiBaseUrl, getApiBaseUrlSync, getEventsBaseUrl } from '../../utils/apiConfig';
import {
  ensureAdminLiveChatSessionForUser,
  fetchAdminLiveChatMessages,
  fetchAdminLiveChatSessions,
  fetchAdminLiveChatUsers,
  markAdminLiveChatSessionRead,
  markAllAdminLiveChatSessionsRead,
  sendAdminLiveChatMessage,
} from '../../services/liveChatApi';
import { markLiveChatAllViewed, requestAdminSidebarBadgesRefresh } from '../../utils/adminSidebarBadges';
import { getUiIntlLocale } from '../../utils/uiIntlLocale'

function resolveClientAvatarUrl(row) {
  if (!row) return null;
  const raw = [row.client_user_photo, row.client_telegram_photo_url]
    .map((x) => (x != null && String(x).trim() ? String(x).trim() : ''))
    .find(Boolean);
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  // В dev Vite проксирует /uploads на бэкенд — достаточно origin текущей страницы
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  const base = getApiBaseUrlSync().replace(/\/api\/?$/, '') || '';
  return `${String(base).replace(/\/$/, '')}${path}`;
}

function initialsFromClientRow(s) {
  const fn = [s?.client_first_name, s?.client_last_name].filter(Boolean);
  if (fn.length) {
    const a = (fn[0][0] || '').toUpperCase();
    const b = fn.length > 1 && fn[1][0] ? fn[1][0].toUpperCase() : '';
    return (a + b).slice(0, 2) || '?';
  }
  const em = s?.client_email || s?.lead_email;
  if (em && String(em)[0]) return String(em)[0].toUpperCase();
  if (s?.client_phone || s?.lead_phone) {
    const p = String(s.client_phone || s.lead_phone).replace(/\D/g, '');
    if (p.length >= 2) return p.slice(-2);
  }
  return '?';
}

function formatSessionTime(iso) {
  if (!iso) return '';
  const messageDate = new Date(iso);
  const now = new Date();
  const diff = now - messageDate;
  if (diff < 60000) return t('admin_tolko_chto_c47cbe7f');
  if (diff < 3600000) return t('admin_minAgo_tmpl', { n: Math.floor(diff / 60000) });
  if (diff < 86400000) {
    return messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  return messageDate.toLocaleDateString(getUiIntlLocale(), { day: '2-digit', month: '2-digit' });
}

function clientTitleFromRow(s) {
  if (!s) return t('admin_gost_75f0b58e');
  const fn = [s.client_first_name, s.client_last_name].filter(Boolean).join(' ').trim();
  if (fn) return fn;
  if (s.client_email) return s.client_email;
  if (s.lead_email) return s.lead_email;
  if (s.display_label) return s.display_label;
  return t('admin_chatNum_tmpl', { id: s.id });
}

function mapServerRowToMessage(r) {
  return {
    id: r.id,
    text: r.body,
    role: r.sender_role === 'system' ? 'system' : r.sender_role === 'manager' ? 'manager' : 'user',
    timestamp: new Date(r.created_at),
  };
}

function sortLiveSessions(sessions) {
  return [...sessions].sort((a, b) => {
    const aVip = Boolean(a.client_vip_club_active);
    const bVip = Boolean(b.client_vip_club_active);
    if (aVip !== bVip) return aVip ? -1 : 1;
    const aTs = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const bTs = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return bTs - aTs;
  });
}

function isVisitorSenderRole(role) {
  const value = String(role || '').toLowerCase();
  return value === 'user' || value === 'client' || value === 'visitor';
}

function liveRowToChatItem(s) {
  return {
    id: `live-${s.id}`,
    sessionId: s.id,
    liveRow: s,
    name: clientTitleFromRow(s),
    avatarUrl: resolveClientAvatarUrl(s),
    avatarInitials: initialsFromClientRow(s),
    type: 'live',
    status: 'online',
    vipClubActive: Boolean(s.client_vip_club_active),
    lastMessage: s.last_message_preview || t('admin_sa_noMessages'),
    timestamp: formatSessionTime(s.updated_at),
    unread: Math.max(0, Number(s.unread_count) || 0),
  };
}

function directoryUserToChatItem(u) {
  const asLiveRow = {
    id: u.session_id || null,
    user_id: u.id,
    client_first_name: u.first_name,
    client_last_name: u.last_name,
    client_email: u.email,
    client_phone: u.phone_number,
    client_user_photo: u.user_photo,
    client_telegram_photo_url: u.telegram_photo_url,
    client_vip_club_active: Boolean(u.vip_club_active),
    last_message_preview: u.session_id ? t('admin_otkryt_dialog_c96664b1') : t('admin_napisat_pervym_76c5dfb7'),
    updated_at: u.session_updated_at || u.created_at,
    unread_count: 0,
  };
  return {
    id: `user-${u.id}`,
    sessionId: u.session_id || null,
    userId: u.id,
    liveRow: asLiveRow,
    name: clientTitleFromRow(asLiveRow),
    avatarUrl: resolveClientAvatarUrl(asLiveRow),
    avatarInitials: initialsFromClientRow(asLiveRow),
    type: 'user',
    status: 'online',
    vipClubActive: Boolean(u.vip_club_active),
    lastMessage: u.session_id ? t('admin_est_dialog_0e5d40c6') : t('admin_esche_net_dialoga_mozhno_dcce4841'),
    timestamp: formatSessionTime(u.session_updated_at || u.created_at),
    unread: 0,
    role: u.role || null,
  };
}

function AdminChatVipAvatarBadge() {
  const { t } = useTranslation();
  return (
    <span
      className="admin-chat__vip-avatar-badge"
      title={t('admin_vipClubMember')}
      aria-label="VIP Club"
    >
      VIP
    </span>
  );
}

const AdminChat = ({ onAdminSectionBadgeRefresh, targetUserId = null, onTargetHandled }) => {
  const { t } = useTranslation();
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilter, setListFilter] = useState('all');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [openingUserId, setOpeningUserId] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const [liveSessions, setLiveSessions] = useState([]);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [directoryTotal, setDirectoryTotal] = useState(0);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [messagesByKey, setMessagesByKey] = useState({});

  const loadLiveSessionsRef = useRef(async () => {});
  const loadLiveThreadRef = useRef(async () => {});
  const markSessionReadRef = useRef(async () => {});
  const liveSessionsRef = useRef([]);
  const openUserChatRef = useRef(async () => {});

  const loadLiveSessions = useCallback(async () => {
    try {
      const list = await fetchAdminLiveChatSessions();
      setLiveSessions(Array.isArray(list) ? sortLiveSessions(list) : []);
    } catch {
      /* ignore */
    }
  }, []);

  loadLiveSessionsRef.current = loadLiveSessions;

  useEffect(() => {
    liveSessionsRef.current = liveSessions;
  }, [liveSessions]);

  useEffect(() => {
    loadLiveSessions();
  }, [loadLiveSessions]);

  const loadDirectoryUsers = useCallback(async (query = '') => {
    setDirectoryLoading(true);
    try {
      const data = await fetchAdminLiveChatUsers({ q: query, limit: 150, offset: 0 });
      setDirectoryUsers(Array.isArray(data?.users) ? data.users : []);
      setDirectoryTotal(Number(data?.total) || 0);
    } catch {
      setDirectoryUsers([]);
      setDirectoryTotal(0);
    } finally {
      setDirectoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (listFilter !== 'users') return undefined;
    const timer = window.setTimeout(() => {
      void loadDirectoryUsers(searchQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [listFilter, searchQuery, loadDirectoryUsers]);

  const chats = useMemo(() => {
    const ai = {
      id: 'ai-assistant',
      name: t('admin_sa_title'),
      avatarUrl: null,
      avatarInitials: 'AI',
      type: 'ai',
      status: 'online',
      lastMessage: t('admin_gotov_pomoch_s_voprosami_aedaeb95'),
      timestamp: '—',
      unread: 0,
    };
    if (listFilter === 'users') {
      return (directoryUsers || []).map((u) => directoryUserToChatItem(u));
    }
    const live = sortLiveSessions(liveSessions || []).map((s) => liveRowToChatItem(s));
    return [ai, ...live];
  }, [directoryUsers, listFilter, liveSessions]);

  const openUserChat = useCallback(async (userId) => {
    const uid = Number(userId);
    if (!Number.isFinite(uid) || uid <= 0) return null;
    setOpeningUserId(uid);
    try {
      const existing = liveSessionsRef.current.find((session) => Number(session.user_id) === uid);
      if (existing) {
        const item = liveRowToChatItem(existing);
        setSelectedChat(item);
        setListFilter((prev) => (prev === 'users' ? 'all' : prev));
        void markSessionReadRef.current(existing.id);
        return item;
      }
      const data = await ensureAdminLiveChatSessionForUser(uid);
      const row = data?.session;
      if (!row) return null;
      setLiveSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === row.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...row };
          return sortLiveSessions(next);
        }
        return sortLiveSessions([row, ...prev]);
      });
      const item = liveRowToChatItem(row);
      setSelectedChat(item);
      setListFilter('all');
      void markSessionReadRef.current(row.id);
      void loadLiveThreadRef.current(row.id);
      return item;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setOpeningUserId(null);
    }
  }, []);

  openUserChatRef.current = openUserChat;

  useEffect(() => {
    const target = Number(targetUserId);
    if (!Number.isFinite(target) || target <= 0) return undefined;
    let cancelled = false;
    void (async () => {
      await openUserChatRef.current(target);
      if (!cancelled) onTargetHandled?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [onTargetHandled, targetUserId]);

  useEffect(() => {
    if (listFilter === 'users') return;
    if (!selectedChat && chats.length > 0) {
      setSelectedChat(chats[0]);
    }
  }, [chats, listFilter, selectedChat]);

  /** Подтягиваем карточку клиента и превью при обновлении списка с сервера / SSE */
  useEffect(() => {
    setSelectedChat((prev) => {
      if (!prev || prev.type !== 'live') return prev;
      const row = liveSessions.find((x) => x.id === prev.sessionId);
      if (!row) return prev;
      return {
        ...prev,
        liveRow: row,
        name: clientTitleFromRow(row),
        avatarUrl: resolveClientAvatarUrl(row),
        avatarInitials: initialsFromClientRow(row),
        vipClubActive: Boolean(row.client_vip_club_active),
        lastMessage: row.last_message_preview || t('admin_sa_noMessages'),
        timestamp: formatSessionTime(row.updated_at),
        unread: Math.max(0, Number(row.unread_count) || 0),
      };
    });
  }, [liveSessions]);

  const loadLiveThread = useCallback(async (sessionId) => {
    const key = `live-${sessionId}`;
    try {
      const rows = await fetchAdminLiveChatMessages(sessionId);
      const mapped = (rows || []).map((r) => mapServerRowToMessage(r));
      setMessagesByKey((prev) => ({ ...prev, [key]: mapped }));
    } catch {
      setMessagesByKey((prev) => ({ ...prev, [key]: prev[key] || [] }));
    }
  }, []);

  loadLiveThreadRef.current = loadLiveThread;

  const selectedChatRef = useRef(selectedChat);
  selectedChatRef.current = selectedChat;

  useEffect(() => {
    if (!selectedChat || selectedChat.type !== 'live') return undefined;
    loadLiveThread(selectedChat.sessionId);
    return undefined;
  }, [selectedChat?.id, selectedChat?.type, loadLiveThread]);

  const applyLiveChatMessage = useCallback((sessionId, row) => {
    if (!row || row.id == null) return;
    const key = `live-${sessionId}`;
    const entry = mapServerRowToMessage(row);
    const isVisitor = isVisitorSenderRole(row.sender_role);
    const viewing =
      selectedChatRef.current?.type === 'live' && selectedChatRef.current.sessionId === sessionId;
    setMessagesByKey((prev) => {
      const list = prev[key] || [];
      if (list.some((m) => m.id === entry.id)) return prev;
      return { ...prev, [key]: [...list, entry] };
    });
    setLiveSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === sessionId);
      const preview = String(row.body || '').slice(0, 160);
      const ts = row.created_at || new Date().toISOString();
      if (idx < 0) {
        queueMicrotask(() => loadLiveSessionsRef.current());
        return prev;
      }
      const currentUnread = Math.max(0, Number(prev[idx].unread_count) || 0);
      const updated = {
        ...prev[idx],
        last_message_preview: preview,
        updated_at: ts,
        unread_count: isVisitor ? (viewing ? 0 : currentUnread + 1) : currentUnread,
      };
      const rest = prev.filter((_, i) => i !== idx);
      return sortLiveSessions([updated, ...rest]);
    });
    if (isVisitor && viewing) {
      queueMicrotask(() => markSessionReadRef.current(sessionId));
    } else if (isVisitor) {
      queueMicrotask(() => requestAdminSidebarBadgesRefresh());
    }
  }, []);

  const applyLiveChatSession = useCallback((session) => {
    if (!session || session.id == null) return;
    setLiveSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === session.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...session };
        return sortLiveSessions(next);
      }
      return sortLiveSessions([session, ...prev]);
    });
  }, []);

  const markSessionRead = useCallback(async (sessionId) => {
    if (!sessionId) return;
    setLiveSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId ? { ...session, unread_count: 0 } : session,
      ),
    );
    try {
      const row = await markAdminLiveChatSessionRead(sessionId);
      if (row) {
        setLiveSessions((prev) => {
          const idx = prev.findIndex((session) => session.id === row.id);
          if (idx < 0) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], ...row, unread_count: Number(row.unread_count) || 0 };
          return next;
        });
      }
    } catch {
      /* ignore */
    }
    requestAdminSidebarBadgesRefresh();
    void onAdminSectionBadgeRefresh?.();
  }, [onAdminSectionBadgeRefresh]);

  markSessionReadRef.current = markSessionRead;

  const sseHandlerRef = useRef({ applyLiveChatMessage, applyLiveChatSession });
  sseHandlerRef.current = { applyLiveChatMessage, applyLiveChatSession };

  useEffect(() => {
    let es = null;
    let cancelled = false;

    const connect = async () => {
      const base = await getEventsBaseUrl();
      const normalized = base.replace(/\/$/, '');
      const path = `${normalized}/events/live-chat-admin`;
      const url = base.startsWith('http') ? path : `${window.location.origin}${path}`;
      if (cancelled) return;
      es = new EventSource(url);
      es.onmessage = (event) => {
        try {
          if (typeof event.data === 'string' && event.data.startsWith(':')) return;
          const data = JSON.parse(event.data);
          const { applyLiveChatMessage: applyMsg, applyLiveChatSession: applySess } = sseHandlerRef.current;
          if (data.type === 'live_chat_message' && data.sessionId != null && data.message) {
            applyMsg(data.sessionId, data.message);
          } else if (data.type === 'live_chat_session' && data.session) {
            applySess(data.session);
          }
        } catch {
          /* ignore */
        }
      };
      es.onopen = () => {
        loadLiveSessionsRef.current();
        const sel = selectedChatRef.current;
        if (sel?.type === 'live') loadLiveThreadRef.current(sel.sessionId);
      };
      es.onerror = () => {
        /* браузер сам переподключит EventSource */
      };
    };

    connect();
    return () => {
      cancelled = true;
      if (es) es.close();
    };
  }, []);

  const scrollMessagesToBottom = useCallback(() => {
    const el = messagesScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollMessagesToBottom();
      });
    });
    return () => cancelAnimationFrame(t);
  }, [selectedChat, messagesByKey, scrollMessagesToBottom]);

  const selectChat = useCallback((chat) => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    if (chat?.type === 'user') {
      void openUserChat(chat.userId);
      return;
    }
    setSelectedChat(chat);
    if (chat?.type === 'live' && chat.sessionId) {
      void markSessionRead(chat.sessionId);
    }
  }, [markSessionRead, openUserChat]);

  const chatMatchesQuery = (chat, q) => {
    if (!q.trim()) return true;
    const n = q.toLowerCase();
    const hay = [
      chat.name,
      chat.lastMessage,
      chat.userId,
      chat.role,
      (chat.type === 'live' || chat.type === 'user') && chat.liveRow?.client_email,
      (chat.type === 'live' || chat.type === 'user') && chat.liveRow?.client_phone,
      chat.type === 'live' && chat.liveRow?.lead_email,
      chat.type === 'live' && chat.liveRow?.lead_phone,
      chat.type === 'live' && chat.liveRow?.assistant_session_id,
      chat.type === 'live' && chat.liveRow?.display_label,
      chat.type === 'live' && chat.liveRow?.lead_summary,
      chat.type === 'live' && chat.liveRow?.user_id,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(n);
  };

  const filteredChats = chats.filter((chat) => {
    if (listFilter === 'users') return true;
    if (!chatMatchesQuery(chat, searchQuery)) return false;
    if (listFilter === 'vip') return chat.type === 'live' && chat.vipClubActive;
    if (listFilter === 'regular') return chat.type === 'live' && !chat.vipClubActive;
    return true;
  });

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedChat) return;
    const text = inputMessage.trim();
    setInputMessage('');

    if (selectedChat.type === 'live') {
      try {
        const row = await sendAdminLiveChatMessage(selectedChat.sessionId, text);
        applyLiveChatMessage(selectedChat.sessionId, row);
      } catch (err) {
        console.error(err);
      }
      return;
    }

    const newMessage = {
      id: (messagesByKey[selectedChat.id]?.length || 0) + 1,
      text,
      sender: 'admin',
      timestamp: new Date(),
    };
    const previousMessages = messagesByKey[selectedChat.id] || [];

    setMessagesByKey((prev) => ({
      ...prev,
      [selectedChat.id]: [...(prev[selectedChat.id] || []), newMessage],
    }));

    if (selectedChat.type === 'ai') {
      try {
        setIsLoadingAI(true);
        const aiResponse = await askPropertyAssistant(
          [...previousMessages, { sender: 'user', text: newMessage.text }],
          {
            purpose: null,
            budget: null,
            location: null,
            propertyType: null,
            rooms: null,
            area: null,
            other: null,
          },
          []
        );
        const botMessage = {
          id: (messagesByKey[selectedChat.id]?.length || 0) + 2,
          text: aiResponse?.text || t('admin_ne_udalos_poluchit_otvet_44786dfa'),
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessagesByKey((prev) => ({
          ...prev,
          [selectedChat.id]: [...(prev[selectedChat.id] || []), botMessage],
        }));
      } catch (error) {
        console.error('Ошибка AI в админ-чате:', error);
        const errorMessage = {
          id: (messagesByKey[selectedChat.id]?.length || 0) + 2,
          text: t('admin_proizoshla_oshibka_pri_obraschenii_bc7d4d3b'),
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessagesByKey((prev) => ({
          ...prev,
          [selectedChat.id]: [...(prev[selectedChat.id] || []), errorMessage],
        }));
      } finally {
        setIsLoadingAI(false);
      }
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diff = now - messageDate;
    if (diff < 60000) return t('admin_tolko_chto_c47cbe7f');
    if (diff < 3600000) return t('admin_minAgo_tmpl', { n: Math.floor(diff / 60000) });
    if (diff < 86400000) {
      return messageDate.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return messageDate.toLocaleDateString(getUiIntlLocale(), {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getChatIcon = (type) => {
    switch (type) {
      case 'ai':
        return <FiCpu size={20} />;
      case 'live':
        return <FiMessageCircle size={20} />;
      default:
        return <FiMessageCircle size={20} />;
    }
  };

  const defaultAiMessages = [
    {
      id: 1,
      text: t('admin_privet_ya_umnyy_pomoschnik_53de1b88'),
      sender: 'ai',
      timestamp: new Date(Date.now() - 7200000),
    },
  ];

  const currentMessages = selectedChat
    ? selectedChat.type === 'live'
      ? messagesByKey[selectedChat.id] || []
      : messagesByKey[selectedChat.id] || defaultAiMessages
    : [];

  const selectedLiveRow =
    selectedChat?.type === 'live'
      ? selectedChat.liveRow || liveSessions.find((x) => x.id === selectedChat.sessionId) || null
      : null;

  return (
    <div className="admin-chat">
      <div className="admin-chat__sidebar">
        <div className="admin-chat__header">
          <h2 className="admin-chat__title">{t('admin_chaty_3ba5efad')}</h2>
          <div className="admin-chat__header-actions">
            <button
              type="button"
              className="admin-chat__mark-read-btn"
              onClick={() => {
                markLiveChatAllViewed();
                setLiveSessions((prev) =>
                  prev.map((session) => ({ ...session, unread_count: 0 })),
                );
                void markAllAdminLiveChatSessionsRead()
                  .then(() => {
                    requestAdminSidebarBadgesRefresh({ patch: { chat: 0 } });
                    void onAdminSectionBadgeRefresh?.();
                  })
                  .catch(() => {
                    requestAdminSidebarBadgesRefresh({ patch: { chat: 0 } });
                  });
              }}
            >
              {t('admin_vse_prosmotreno_03ec7f17')}
            </button>
            <span className="admin-chat__live-badge">Live</span>
          </div>
        </div>

        <div className="admin-chat__search">
          <FiSearch size={18} className="admin-chat__search-icon" />
          <input
            type="text"
            placeholder={
              listFilter === 'users'
                ? t('admin_chatSearchUsersPlaceholder')
                : t('admin_chatSearchSessionsPlaceholder')
            }
            className="admin-chat__search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="admin-chat__filters" role="tablist" aria-label={t('admin_chatFiltersAria')}>
          {[
            { id: 'all', label: t('admin_dialogi_c7da8f31') },
            { id: 'users', label: t('admin_panel_users') },
            { id: 'vip', label: 'VIP' },
            { id: 'regular', label: t('admin_obychnye_1a599143') },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={listFilter === item.id}
              className={`admin-chat__filter ${listFilter === item.id ? 'is-active' : ''}`}
              onClick={() => setListFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="admin-chat__list">
          {listFilter === 'users' && directoryLoading ? (
            <p className="admin-chat__empty">{t('admin_zagruzka_polzovateley_68cb2ce7')}</p>
          ) : filteredChats.length === 0 ? (
            <p className="admin-chat__empty">
              {listFilter === 'users' ? t('admin_polzovateli_ne_naydeny_942d94c3') : t('admin_net_chatov_v_etom_91eb41a7')}
            </p>
          ) : (
            <>
              {listFilter === 'users' && directoryTotal > filteredChats.length ? (
                <p className="admin-chat__directory-hint">
                  {t('admin_chat_showing_of_total', { shown: filteredChats.length, total: directoryTotal })}
                </p>
              ) : null}
              {filteredChats.map((chat) => {
                const isOpening = chat.type === 'user' && openingUserId === chat.userId;
                const isSelectedLive =
                  selectedChat?.type === 'live' &&
                  chat.type === 'user' &&
                  Number(selectedChat?.liveRow?.user_id) === Number(chat.userId);
                return (
            <div
              key={chat.id}
              className={`admin-chat__item ${
                selectedChat?.id === chat.id || isSelectedLive ? 'active' : ''
              } ${chat.unread > 0 ? 'admin-chat__item--unread' : ''} ${
                chat.type === 'user' && !chat.sessionId ? 'admin-chat__item--new' : ''
              } ${isOpening ? 'admin-chat__item--opening' : ''}`}
              onClick={() => selectChat(chat)}
            >
              <div className="admin-chat__item-avatar">
                {chat.type === 'ai' ? (
                  <div className="admin-chat__avatar-fill admin-chat__avatar-fill--ai" aria-hidden>
                    <FiCpu size={22} />
                  </div>
                ) : chat.avatarUrl ? (
                  <img src={chat.avatarUrl} alt="" />
                ) : (
                  <div className="admin-chat__avatar-fill admin-chat__avatar-fill--initials" aria-hidden>
                    {chat.avatarInitials}
                  </div>
                )}
                {chat.status === 'online' && chat.type !== 'user' && (
                  <span className="admin-chat__status-dot"></span>
                )}
                {chat.vipClubActive && <AdminChatVipAvatarBadge />}
                {chat.type === 'ai' && (
                  <div className="admin-chat__ai-badge">
                    <FiZap size={12} />
                  </div>
                )}
              </div>
              <div className="admin-chat__item-content">
                <div className="admin-chat__item-header">
                  <h3 className="admin-chat__item-name">
                    {chat.type === 'ai' && getChatIcon(chat.type)}
                    <span className="admin-chat__item-name-text">{chat.name}</span>
                  </h3>
                  <span className="admin-chat__item-time">{chat.timestamp}</span>
                </div>
                {chat.type === 'user' ? (
                  <p className="admin-chat__item-preview">
                    {isOpening
                      ? t('admin_otkryvaem_dialog_a933a62b')
                      : chat.sessionId
                        ? t('admin_est_dialog_0e5d40c6')
                        : t('admin_napisat_pervym_76c5dfb7')}
                    {chat.liveRow?.client_email ? ` · ${chat.liveRow.client_email}` : ''}
                  </p>
                ) : null}
              </div>
              {chat.unread > 0 && (
                <div className="admin-chat__item-badge" title={t('admin_unreadMessages')}>
                  {chat.unread > 99 ? '99+' : chat.unread}
                </div>
              )}
            </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <div className="admin-chat__main">
        {selectedChat ? (
          <>
            <div className="admin-chat__main-header">
              <div className="admin-chat__main-header-info">
                <div className="admin-chat__main-avatar">
                  {selectedChat.type === 'ai' ? (
                    <div className="admin-chat__avatar-fill admin-chat__avatar-fill--ai" aria-hidden>
                      <FiCpu size={22} />
                    </div>
                  ) : selectedChat.avatarUrl ? (
                    <img src={selectedChat.avatarUrl} alt="" />
                  ) : (
                    <div className="admin-chat__avatar-fill admin-chat__avatar-fill--initials" aria-hidden>
                      {selectedChat.avatarInitials}
                    </div>
                  )}
                  {selectedChat.status === 'online' && <span className="admin-chat__status-dot"></span>}
                  {selectedChat.vipClubActive && <AdminChatVipAvatarBadge />}
                </div>
                <div>
                  <h3 className="admin-chat__main-name">
                    {selectedChat.type === 'ai' && getChatIcon(selectedChat.type)}
                    <span className="admin-chat__main-name-text">{selectedChat.name}</span>
                  </h3>
                  <span className="admin-chat__main-status">
                    {selectedChat.type === 'live'
                      ? selectedLiveRow?.client_vip_club_active
                        ? t('admin_vipClubMember')
                        : t('admin_onlayn_76e9fb6a')
                      : selectedChat.status === 'online'
                        ? t('admin_onlayn_76e9fb6a')
                        : t('admin_oflayn_aba1153e')}
                  </span>
                </div>
              </div>
            </div>

            {selectedChat.type === 'live' && selectedLiveRow && (
              <div className="admin-chat__client-card">
                <div className="admin-chat__client-card-title">{t('admin_sa_client')}</div>
                <p className="admin-chat__client-card-note">
                  {t('admin_dannye_profilya_v_baze_f55d8b1e')}
                </p>

                <div className="admin-chat__client-section-title">{t('admin_profil_v_baze_00e2c623')}</div>
                <dl className="admin-chat__client-dl">
                  {selectedLiveRow.user_id != null && (
                    <>
                      <dt>{t('admin__v_baze_25adda15')}</dt>
                      <dd>{selectedLiveRow.user_id}</dd>
                    </>
                  )}
                  {(selectedLiveRow.client_first_name || selectedLiveRow.client_last_name) && (
                    <>
                      <dt>{t('admin_imya_aee78fe8')}</dt>
                      <dd>
                        {[selectedLiveRow.client_first_name, selectedLiveRow.client_last_name]
                          .filter(Boolean)
                          .join(' ') || '—'}
                      </dd>
                    </>
                  )}
                  {selectedLiveRow.client_email && (
                    <>
                      <dt>Email</dt>
                      <dd>{selectedLiveRow.client_email}</dd>
                    </>
                  )}
                  {selectedLiveRow.client_phone && (
                    <>
                      <dt>{t('admin_phone')}</dt>
                      <dd>{selectedLiveRow.client_phone}</dd>
                    </>
                  )}
                  {selectedLiveRow.client_vip_club_active && (
                    <>
                      <dt>VIP Club</dt>
                      <dd>{t('admin_aktivnyy_uchastnik_62f51007')}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            <div className="admin-chat__messages" ref={messagesScrollRef}>
              {currentMessages.map((message) => {
                const isSent =
                  message.role === 'manager' ||
                  message.sender === 'admin' ||
                  message.sender === 'ai';
                const isSystem = message.role === 'system';
                return (
                  <div
                    key={message.id}
                    className={`admin-chat__message ${
                      isSystem
                        ? 'admin-chat__message--system'
                        : isSent
                          ? 'admin-chat__message--sent'
                          : 'admin-chat__message--received'
                    }`}
                  >
                    <div className="admin-chat__message-content">
                      <p className="admin-chat__message-text">{message.text}</p>
                      <span className="admin-chat__message-time">{formatTime(message.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="admin-chat__input-container">
              <form className="admin-chat__input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="admin-chat__input"
                  placeholder={
                    selectedChat.type === 'live'
                      ? t('admin_napisat_polzovatelyu_4dcfa814')
                      : t('admin_napisat_soobschenie_986720f4')
                  }
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isLoadingAI && selectedChat.type === 'ai'}
                />
                <button
                  type="submit"
                  className="admin-chat__send-btn"
                  disabled={!inputMessage.trim() || (isLoadingAI && selectedChat.type === 'ai')}
                >
                  <FiSend size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="admin-chat__empty">
            <FiMessageCircle size={64} />
            <h3>{t('admin_vyberite_chat_dlya_nachala_7dce27e2')}</h3>
            <p>{t('admin_vyberite_chat_iz_spiska_1c247913')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChat;
