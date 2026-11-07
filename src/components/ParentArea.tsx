import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError, lockParentMode, type Me } from '../auth';
import { setParentUnlocked } from '../parentLock';
import type { DashMenuItem } from './DashLayout';
import Tobi from './Tobi';

/** 부모 화면 공통 메뉴 (대시보드·우리 아이·설정) */
export const PARENT_MENU: DashMenuItem[] = [
  { icon: 'grid', label: '대시보드', to: '/dashboard' },
  { icon: 'smile', label: '우리 아이', to: '/dashboard/kids' },
  { icon: 'book', label: '책장', to: '/profiles' },
  { icon: 'heart', label: '도서관·서점', to: '/market' },
  { icon: 'cube', label: '3D 모델' },
  { icon: 'box', label: '주문·배송' },
  { icon: 'gear', label: '설정', to: '/dashboard/account' },
];

/** 왼쪽 위 프로필: 로그인했으면 이름, 아니면 데모 (불러오는 동안은 비워 둠) */
export function parentProfile(user: Me | null, loading = false) {
  if (loading) return { avatar: <Tobi pose="peek" size={76} />, name: '…', sub: '' };
  return {
    avatar: <Tobi pose="peek" size={76} />,
    name: user?.status === 'active' ? `${user.name}님` : '데모 부모님',
    sub: user?.status === 'active' ? '안녕하세요!' : '둘러보는 중이에요',
  };
}

/** 부모 화면에서 나가기: 서버의 부모 모드도 닫음 */
export function useLeaveParent() {
  const navigate = useNavigate();
  return useCallback(() => {
    setParentUnlocked(false);
    lockParentMode();
    navigate('/');
  }, [navigate]);
}

/** 서버가 "PIN 다시 입력"(423)이라고 하면 잠금 화면으로 보내고 true */
export function useRelock() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 423) {
        setParentUnlocked(false);
        navigate(`/parent?next=${encodeURIComponent(pathname)}`, { replace: true });
        return true;
      }
      return false;
    },
    [navigate, pathname],
  );
}
