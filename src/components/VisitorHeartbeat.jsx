import { useEffect, useRef } from 'react';
import { getApiBaseUrl } from '../utils/apiConfig';

const VISITOR_STORAGE_KEY = 'visitor_session_id';
const HEARTBEAT_INTERVAL_MS = 45 * 1000; // 45 секунд

/**
 * Отправляет периодический heartbeat на сервер для учёта посетителей "Онлайн" в админке.
 * Одна вкладка = один посетитель (sessionId в sessionStorage).
 */
export default function VisitorHeartbeat() {
  const intervalRef = useRef(null);

  useEffect(() => {
    let sessionId = sessionStorage.getItem(VISITOR_STORAGE_KEY);
    if (!sessionId) {
      sessionId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      sessionStorage.setItem(VISITOR_STORAGE_KEY, sessionId);
    }

    const sendHeartbeat = async () => {
      try {
        const API_BASE_URL = await getApiBaseUrl();
        await fetch(`${API_BASE_URL}/visitor-heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
      } catch (e) {
        // тихо игнорируем ошибки сети
      }
    };

    const firstDelayId = setTimeout(sendHeartbeat, 12000);
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => {
      clearTimeout(firstDelayId);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return null;
}
