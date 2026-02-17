import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiSearch, FiZap, FiUser, FiMessageCircle, FiCpu } from 'react-icons/fi';
import { getApiBaseUrl } from '../../utils/apiConfig';
import './AdminChat.css';

const AdminChat = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Загрузка списка чатов
  const loadChats = async () => {
    try {
      const API_BASE_URL = await getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/admin/chat/list`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const formattedChats = data.data.map(chat => ({
            id: chat.id,
            name: chat.first_name && chat.last_name 
              ? `${chat.first_name} ${chat.last_name}` 
              : chat.email || chat.phone_number || `Пользователь #${chat.user_id}`,
            userId: chat.user_id,
            email: chat.email,
            phoneNumber: chat.phone_number,
            chatType: chat.chat_type,
            status: 'online', // Можно добавить проверку онлайн статуса
            lastMessage: chat.lastMessage ? chat.lastMessage.text : 'Нет сообщений',
            timestamp: chat.lastMessage 
              ? formatTimestamp(chat.lastMessage.timestamp) 
              : formatTimestamp(chat.updated_at),
            unread: chat.unreadCount || 0
          }));
          setChats(formattedChats);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке чатов:', error);
    }
  };

  // Загрузка сообщений чата
  const loadMessages = async (chatId) => {
    try {
      const API_BASE_URL = await getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/admin/chat/${chatId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const formattedMessages = data.data.messages.map(msg => ({
            id: msg.id,
            text: msg.message_text,
            sender: msg.sender_type === 'user' ? 'user' : (msg.sender_type === 'ai' ? 'ai' : 'admin'),
            timestamp: new Date(msg.created_at)
          }));
          setMessages(formattedMessages);
          
          // Отмечаем сообщения как прочитанные
          await fetch(`${API_BASE_URL}/admin/chat/${chatId}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isAdmin: true })
          });
          
          // Обновляем список чатов
          loadChats();
          loadUnreadCount();
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке сообщений:', error);
    }
  };

  // Загрузка количества непрочитанных сообщений
  const loadUnreadCount = async () => {
    try {
      const API_BASE_URL = await getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/admin/chat/unread`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUnreadCount(data.data.count);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке непрочитанных сообщений:', error);
    }
  };

  // Отправка сообщения
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedChat) return;

    const messageText = inputMessage.trim();
    setInputMessage('');

    // Добавляем сообщение локально
    const newMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'admin',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);

    try {
      const API_BASE_URL = await getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/admin/chat/${selectedChat.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageText,
          adminId: null // Можно добавить ID админа если нужно
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Обновляем сообщения из ответа
          const formattedMessages = data.data.messages.map(msg => ({
            id: msg.id,
            text: msg.message_text,
            sender: msg.sender_type === 'user' ? 'user' : (msg.sender_type === 'ai' ? 'ai' : 'admin'),
            timestamp: new Date(msg.created_at)
          }));
          setMessages(formattedMessages);
          
          // Обновляем список чатов
          loadChats();
        }
      }
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
    }
  };

  // Форматирование времени
  const formatTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diff = now - messageDate;

    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) {
      return messageDate.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return messageDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  // Форматирование timestamp для списка чатов
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 86400000) {
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    if (diff < 172800000) {
      return 'Вчера';
    }
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  // Получение иконки чата
  const getChatIcon = (chatType) => {
    switch (chatType) {
      case 'manager':
        return <FiUser size={20} />;
      case 'ai':
        return <FiCpu size={20} />;
      default:
        return <FiMessageCircle size={20} />;
    }
  };

  // Обработка выбора чата
  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    loadMessages(chat.id);
  };

  // Фильтрация чатов
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.email && chat.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Загрузка данных при монтировании
  useEffect(() => {
    loadChats();
    loadUnreadCount();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(() => {
      loadChats();
      loadUnreadCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const currentMessages = selectedChat ? messages : [];

  return (
    <div className="admin-chat">
      <div className="admin-chat__sidebar">
        <div className="admin-chat__header">
          <h2 className="admin-chat__title">Чаты</h2>
          {unreadCount > 0 && (
            <span className="admin-chat__unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </div>
        
        <div className="admin-chat__search">
          <FiSearch size={18} className="admin-chat__search-icon" />
          <input
            type="text"
            placeholder="Поиск чатов..."
            className="admin-chat__search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="admin-chat__list">
          {filteredChats.length === 0 ? (
            <div className="admin-chat__empty-list">
              <p>Нет активных чатов</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <div
                key={chat.id}
                className={`admin-chat__item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                onClick={() => handleChatSelect(chat)}
              >
                <div className="admin-chat__item-avatar">
                  <div className="admin-chat__item-avatar-placeholder">
                    {getChatIcon(chat.chatType)}
                  </div>
                  {chat.status === 'online' && (
                    <span className="admin-chat__status-dot"></span>
                  )}
                  {chat.chatType === 'ai' && (
                    <div className="admin-chat__ai-badge">
                      <FiZap size={12} />
                    </div>
                  )}
                </div>
                <div className="admin-chat__item-content">
                  <div className="admin-chat__item-header">
                    <h3 className="admin-chat__item-name">
                      {getChatIcon(chat.chatType)}
                      {chat.name}
                    </h3>
                    <span className="admin-chat__item-time">{chat.timestamp}</span>
                  </div>
                  <p className="admin-chat__item-message">{chat.lastMessage}</p>
                </div>
                {chat.unread > 0 && (
                  <div className="admin-chat__item-badge">{chat.unread}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="admin-chat__main">
        {selectedChat ? (
          <>
            <div className="admin-chat__main-header">
              <div className="admin-chat__main-header-info">
                <div className="admin-chat__main-avatar">
                  <div className="admin-chat__main-avatar-placeholder">
                    {getChatIcon(selectedChat.chatType)}
                  </div>
                  {selectedChat.status === 'online' && (
                    <span className="admin-chat__status-dot"></span>
                  )}
                </div>
                <div>
                  <h3 className="admin-chat__main-name">
                    {getChatIcon(selectedChat.chatType)}
                    {selectedChat.name}
                  </h3>
                  <span className="admin-chat__main-status">
                    {selectedChat.chatType === 'ai' ? 'AI Консультант' : 'Менеджер'} • {selectedChat.status === 'online' ? 'Онлайн' : 'Офлайн'}
                  </span>
                  {selectedChat.email && (
                    <span className="admin-chat__main-email">{selectedChat.email}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="admin-chat__messages">
              {currentMessages.map(message => (
                <div
                  key={message.id}
                  className={`admin-chat__message ${
                    message.sender === 'admin' ? 'admin-chat__message--sent' : 'admin-chat__message--received'
                  }`}
                >
                  <div className="admin-chat__message-content">
                    <p className="admin-chat__message-text">{message.text}</p>
                    <span className="admin-chat__message-time">{formatTime(message.timestamp)}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="admin-chat__input-container">
              <form className="admin-chat__input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="admin-chat__input"
                  placeholder="Написать сообщение..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                />
                <button
                  type="submit"
                  className="admin-chat__send-btn"
                  disabled={!inputMessage.trim()}
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
