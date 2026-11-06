import { useEffect, useState } from 'react';
import ClayArt from './ClayArt';

/** 인터넷이 끊기면 화면 아래에 안내 (오프라인 보기, PRD R-03) */
export default function OfflineNotice() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="offline-notice" role="status">
      <ClayArt name="moon" size={36} />
      <span>인터넷이 끊겼어요. 책장에서 본 책은 계속 읽을 수 있어요.</span>
    </div>
  );
}
