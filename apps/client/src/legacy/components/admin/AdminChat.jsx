import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FiSend, FiSearch, FiZap, FiMessageCircle, FiCpu } from 'react-icons/fi';
import './AdminChat.css';
import { askPropertyAssistant } from '../../services/aiService';
import { getApiBaseUrl, getApiBaseUrlSync } from '../../utils/apiConfig';
import {
  fetchAdminLiveChatMessages,
  fetchAdminLiveChatSessions,
  sendAdminLiveChatMessage,
} from '../../services/liveChatApi';
import { markLiveChatAllViewed, requestAdminSidebarBadgesRefresh } from '../../utils/adminSidebarBadges';

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
  if (diff < 60000) return 'только что';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
  if (diff < 86400000) {
    return messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  return messageDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function clientTitleFromRow(s) {
  if (!s) return 'Сайт';
  const fn = [s.client_first_name, s.client_last_name].filter(Boolean).join(' ').trim();
  if (fn) return `Сайт · ${fn}`;
  if (s.client_email) return `Сайт · ${s.client_email}`;
  if (s.lead_email) return `Сайт · ${s.lead_email}`;
  if (s.display_label) return `Сайт · ${s.display_label}`;
  return `Сайт · чат #${s.id}`;
}

function mapServerRowToMessage(r) {
  return {
    id: r.id,
    text: r.body,
    role: r.sender_role === 'system' ? 'system' : r.sender_role === 'manager' ? 'manager' : 'user',
    timestamp: new Date(r.created_at),
  };
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
    lastMessage: s.last_message_preview || 'Нет сообщений',
    timestamp: formatSessionTime(s.updated_at),
    unread: 0,
  };
}

const AdminChat = ({ onAdminSectionBadgeRefresh }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const [liveSessions, setLiveSessions] = useState([]);
  const [messagesByKey, setMessagesByKey] = useState({});

  const loadLiveSessionsRef = useRef(async () => {});
  const loadLiveThreadRef = useRef(async () => {});

  const loadLiveSessions = useCallback(async () => {
    try {
      const list = await fetchAdminLiveChatSessions();
      setLiveSessions(Array.isArray(list) ? list : []);
    } catch {
      /* ignore */
    }
  }, []);

  loadLiveSessionsRef.current = loadLiveSessions;

  useEffect(() => {
    loadLiveSessions();
  }, [loadLiveSessions]);

  const chats = useMemo(() => {
    const ai = {
      id: 'ai-assistant',
      name: 'Умный помощник',
      avatarUrl: null,
      avatarInitials: 'AI',
      type: 'ai',
      status: 'online',
      lastMessage: 'Готов помочь с вопросами по админ-панели',
      timestamp: '—',
      unread: 0,
    };
    const live = (liveSessions || []).map((s) => liveRowToChatItem(s));
    return [ai, ...live];
  }, [liveSessions]);

  useEffect(() => {
    if (!selectedChat && chats.length > 0) {
      setSelectedChat(chats[0]);
    }
  }, [chats, selectedChat]);

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
        lastMessage: row.last_message_preview || 'Нет сообщений',
        timestamp: formatSessionTime(row.updated_at),
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

  useEffect(() => {
    if (!selectedChat || selectedChat.type !== 'live') return undefined;
    loadLiveThread(selectedChat.sessionId);
    return undefined;
  }, [selectedChat?.id, selectedChat?.type, loadLiveThread]);

  const applyLiveChatMessage = useCallback((sessionId, row) => {
    if (!row || row.id == null) return;
    const key = `live-${sessionId}`;
    const entry = mapServerRowToMessage(row);
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
      const updated = {
        ...prev[idx],
        last_message_preview: preview,
        updated_at: ts,
      };
      const rest = prev.filter((_, i) => i !== idx);
      return [updated, ...rest];
    });
  }, []);

  const applyLiveChatSession = useCallback((session) => {
    if (!session || session.id == null) return;
    setLiveSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === session.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...session };
        return next;
      }
      return [session, ...prev];
    });
  }, []);

  const selectedChatRef = useRef(selectedChat);
  selectedChatRef.current = selectedChat;

  const sseHandlerRef = useRef({ applyLiveChatMessage, applyLiveChatSession });
  sseHandlerRef.current = { applyLiveChatMessage, applyLiveChatSession };

  useEffect(() => {
    let es = null;
    let cancelled = false;

    const connect = async () => {
      const base = await getApiBaseUrl();
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
    setSelectedChat(chat);
  }, []);

  const chatMatchesQuery = (chat, q) => {
    if (!q.trim()) return true;
    const n = q.toLowerCase();
    const hay = [
      chat.name,
      chat.lastMessage,
      chat.type === 'live' && chat.liveRow?.client_email,
      chat.type === 'live' && chat.liveRow?.client_phone,
      chat.type === 'live' && chat.liveRow?.lead_email,
      chat.type === 'live' && chat.liveRow?.lead_phone,
      chat.type === 'live' && chat.liveRow?.assistant_session_id,
      chat.type === 'live' && chat.liveRow?.display_label,
      chat.type === 'live' && chat.liveRow?.lead_summary,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(n);
  };

  const filteredChats = chats.filter((chat) => chatMatchesQuery(chat, searchQuery));

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
          text: aiResponse?.text || 'Не удалось получить ответ от AI. Попробуйте ещё раз.',
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
          text: 'Произошла ошибка при обращении к AI. Попробуйте позже.',
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
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) {
      return messageDate.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return messageDate.toLocaleDateString('ru-RU', {
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
      text: 'Привет! Я Умный помощник. Готов помочь с любыми вопросами по работе админ-панели!',
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
          <h2 className="admin-chat__title">Чаты</h2>
          <div className="admin-chat__header-actions">
            <button
              type="button"
              className="admin-chat__mark-read-btn"
              onClick={() => {
                markLiveChatAllViewed();
                requestAdminSidebarBadgesRefresh({ patch: { chat: 0 } });
                void onAdminSectionBadgeRefresh?.();
              }}
            >
              Всё просмотрено
            </button>
            <span className="admin-chat__live-badge">Live</span>
          </div>
        </div>

        <div className="admin-chat__search">
          <FiSearch size={18} className="admin-chat__search-icon" />
          <input
            type="text"
            placeholder="Поиск: имя, email, телефон, сессия…"
            className="admin-chat__search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="admin-chat__list">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`admin-chat__item ${selectedChat?.id === chat.id ? 'active' : ''}`}
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
                {chat.status === 'online' && <span className="admin-chat__status-dot"></span>}
                {chat.type === 'ai' && (
                  <div className="admin-chat__ai-badge">
                    <FiZap size={12} />
                  </div>
                )}
              </div>
              <div className="admin-chat__item-content">
                <div className="admin-chat__item-header">
                  <h3 className="admin-chat__item-name">
                    {getChatIcon(chat.type)}
                    {chat.name}
                  </h3>
                  <span className="admin-chat__item-time">{chat.timestamp}</span>
                </div>
                <p className="admin-chat__item-message">{chat.lastMessage}</p>
              </div>
              {chat.unread > 0 && <div className="admin-chat__item-badge">{chat.unread}</div>}
            </div>
          ))}
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
                </div>
                <div>
                  <h3 className="admin-chat__main-name">
                    {getChatIcon(selectedChat.type)}
                    {selectedChat.name}
                  </h3>
                  <span className="admin-chat__main-status">
                    {selectedChat.type === 'live'
                      ? 'Диалог с сайта · обновления по подключению Live'
                      : selectedChat.status === 'online'
                        ? 'Онлайн'
                        : 'Офлайн'}
                  </span>
                </div>
              </div>
            </div>

            {selectedChat.type === 'live' && selectedLiveRow && (
              <div className="admin-chat__client-card">
                <div className="admin-chat__client-card-title">Клиент</div>
                <p className="admin-chat__client-card-note">
                  Данные профиля в базе (аккаунт на сайте).
                </p>

                <div className="admin-chat__client-section-title">Профиль в базе</div>
                <dl className="admin-chat__client-dl">
                  {selectedLiveRow.user_id != null && (
                    <>
                      <dt>ID в базе</dt>
                      <dd>{selectedLiveRow.user_id}</dd>
                    </>
                  )}
                  {(selectedLiveRow.client_first_name || selectedLiveRow.client_last_name) && (
                    <>
                      <dt>Имя</dt>
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
                      <dt>Телефон</dt>
                      <dd>{selectedLiveRow.client_phone}</dd>
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
                      ? 'Ответить посетителю…'
                      : 'Написать сообщение…'
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
            <h3>Выберите чат для начала общения</h3>
            <p>Выберите чат из списка слева, чтобы начать переписку</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChat;
