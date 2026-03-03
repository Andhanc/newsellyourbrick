import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiSearch, FiZap, FiUser, FiMessageCircle, FiCpu } from 'react-icons/fi';
import './AdminChat.css';
import { askPropertyAssistant } from '../../services/aiService';

const AdminChat = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const messagesEndRef = useRef(null);

  const [chats] = useState([
    {
      id: 'manager',
      name: 'Менеджер',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
      type: 'manager',
      status: 'online',
      lastMessage: 'Добрый день! Как дела?',
      timestamp: '10:30',
      unread: 2
    },
    {
      id: 'ai-assistant',
      name: 'Умный помощник',
      avatar: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=150&q=80',
      type: 'ai',
      status: 'online',
      lastMessage: 'Готов помочь с любыми вопросами!',
      timestamp: '09:15',
      unread: 0
    },
    {
      id: 'user1',
      name: 'Иван Петров',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      type: 'user',
      status: 'online',
      lastMessage: 'Спасибо за помощь!',
      timestamp: 'Вчера',
      unread: 1
    },
    {
      id: 'user2',
      name: 'Мария Иванова',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      type: 'user',
      status: 'offline',
      lastMessage: 'Интересует квартира на Costa Adeje',
      timestamp: '15:45',
      unread: 0
    },
    {
      id: 'user3',
      name: 'Сергей Волков',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      type: 'user',
      status: 'online',
      lastMessage: 'Когда можем встретиться?',
      timestamp: '12:20',
      unread: 3
    }
  ]);

  const [messages, setMessages] = useState({
    'manager': [
      {
        id: 1,
        text: 'Добрый день! Как дела?',
        sender: 'manager',
        timestamp: new Date(Date.now() - 3600000)
      },
      {
        id: 2,
        text: 'Здравствуйте! Всё отлично, спасибо!',
        sender: 'admin',
        timestamp: new Date(Date.now() - 3300000)
      }
    ],
    'ai-assistant': [
      {
        id: 1,
        text: 'Привет! Я Умный помощник. Готов помочь с любыми вопросами по работе админ-панели!',
        sender: 'ai',
        timestamp: new Date(Date.now() - 7200000)
      },
      {
        id: 2,
        text: 'Отлично! Расскажи о статистике',
        sender: 'admin',
        timestamp: new Date(Date.now() - 7000000)
      },
      {
        id: 3,
        text: 'В разделе статистики вы можете увидеть общую информацию о пользователях, объектах, аукционах и прибыли. Также доступны фильтры по времени и календарь для выбора периода.',
        sender: 'ai',
        timestamp: new Date(Date.now() - 6800000)
      }
    ],
    'user1': [
      {
        id: 1,
        text: 'Здравствуйте! Хочу задать вопрос о недвижимости',
        sender: 'user',
        timestamp: new Date(Date.now() - 86400000)
      },
      {
        id: 2,
        text: 'Конечно! Чем могу помочь?',
        sender: 'admin',
        timestamp: new Date(Date.now() - 86000000)
      },
      {
        id: 3,
        text: 'Спасибо за помощь!',
        sender: 'user',
        timestamp: new Date(Date.now() - 84000000)
      }
    ],
    'user2': [
      {
        id: 1,
        text: 'Интересует квартира на Costa Adeje',
        sender: 'user',
        timestamp: new Date(Date.now() - 1800000)
      }
    ],
    'user3': [
      {
        id: 1,
        text: 'Когда можем встретиться для просмотра объекта?',
        sender: 'user',
        timestamp: new Date(Date.now() - 3600000)
      },
      {
        id: 2,
        text: 'Давайте согласуем время. Когда вам удобно?',
        sender: 'admin',
        timestamp: new Date(Date.now() - 3300000)
      }
    ]
  });

  useEffect(() => {
    if (!selectedChat && chats.length > 0) {
      setSelectedChat(chats[0]);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedChat) return;

    const newMessage = {
      id: messages[selectedChat.id]?.length + 1 || 1,
      text: inputMessage.trim(),
      sender: 'admin',
      timestamp: new Date()
    };

    const previousMessages = messages[selectedChat.id] || [];

    setMessages(prev => ({
      ...prev,
      [selectedChat.id]: [...(prev[selectedChat.id] || []), newMessage]
    }));

    setInputMessage('');

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
            other: null
          },
          []
        );

        const botMessage = {
          id: (messages[selectedChat.id]?.length || 0) + 2,
          text: aiResponse?.text || 'Не удалось получить ответ от AI. Попробуйте ещё раз.',
          sender: 'ai',
          timestamp: new Date()
        };

        setMessages(prev => ({
          ...prev,
          [selectedChat.id]: [...(prev[selectedChat.id] || []), botMessage]
        }));
      } catch (error) {
        console.error('Ошибка AI в админ-чате:', error);
        const errorMessage = {
          id: (messages[selectedChat.id]?.length || 0) + 2,
          text: 'Произошла ошибка при обращении к AI. Попробуйте позже.',
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => ({
          ...prev,
          [selectedChat.id]: [...(prev[selectedChat.id] || []), errorMessage]
        }));
      } finally {
        setIsLoadingAI(false);
      }
    } else {
      setTimeout(() => {
        let responseText = '';
        if (selectedChat.type === 'manager') {
          responseText = 'Хорошо, разберусь и вернусь с ответом.';
        } else {
          responseText = 'Спасибо за сообщение! Я свяжусь с вами в ближайшее время.';
        }

        const response = {
          id: (messages[selectedChat.id]?.length || 0) + 2,
          text: responseText,
          sender: selectedChat.id,
          timestamp: new Date()
        };

        setMessages(prev => ({
          ...prev,
          [selectedChat.id]: [...(prev[selectedChat.id] || []), response]
        }));
      }, 1000);
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
        minute: '2-digit'
      });
    }
    return messageDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getChatIcon = (type) => {
    switch (type) {
      case 'manager':
        return <FiUser size={20} />;
      case 'ai':
        return <FiCpu size={20} />;
      default:
        return <FiMessageCircle size={20} />;
    }
  };

  const currentMessages = selectedChat ? (messages[selectedChat.id] || []) : [];

  return (
    <div className="admin-chat">
      <div className="admin-chat__sidebar">
        <div className="admin-chat__header">
          <h2 className="admin-chat__title">Чаты</h2>
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
          {filteredChats.map(chat => (
            <div
              key={chat.id}
              className={`admin-chat__item ${selectedChat?.id === chat.id ? 'active' : ''}`}
              onClick={() => setSelectedChat(chat)}
            >
              <div className="admin-chat__item-avatar">
                <img src={chat.avatar} alt={chat.name} />
                {chat.status === 'online' && (
                  <span className="admin-chat__status-dot"></span>
                )}
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
              {chat.unread > 0 && (
                <div className="admin-chat__item-badge">{chat.unread}</div>
              )}
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
                  <img src={selectedChat.avatar} alt={selectedChat.name} />
                  {selectedChat.status === 'online' && (
                    <span className="admin-chat__status-dot"></span>
                  )}
                </div>
                <div>
                  <h3 className="admin-chat__main-name">
                    {getChatIcon(selectedChat.type)}
                    {selectedChat.name}
                  </h3>
                  <span className="admin-chat__main-status">
                    {selectedChat.status === 'online' ? 'Онлайн' : 'Офлайн'}
                  </span>
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


