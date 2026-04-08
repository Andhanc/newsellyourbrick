import { useEffect, useRef } from 'react';
import { getApiBaseUrl } from '../utils/apiConfig';

const VISITOR_STORAGE_KEY = 'visitor_global_id';
const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 секунд

/**
 * Отправляет периодический heartbeat на сервер для учёта посетителей "Онлайн" в админке.
 * Один браузер = один посетитель (id в localStorage), чтобы несколько вкладок
 * одного пользователя не завышали "Онлайн".
 */
export default function VisitorHeartbeat() {
  const intervalRef = useRef(null);

  useEffect(() => {
    let visitorId = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!visitorId) {
      visitorId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
    }

    const sendHeartbeat = async () => {
      try {
        const API_BASE_URL = await getApiBaseUrl();
        await fetch(`${API_BASE_URL}/visitor-heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: visitorId }),
          cache: 'no-store',
          keepalive: true,
        });
      } catch (e) {
        // тихо игнорируем ошибки сети
      }
    };

    // Отправляем сразу, чтобы "Онлайн" не отставал на 10+ секунд.
    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    const onFocus = () => sendHeartbeat();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sendHeartbeat();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
