import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMe, type Me } from '../auth';
import { PinGate } from '../pages/ParentGate';
import { SubHeader } from './SiteHeader';
import Tobi from './Tobi';

/**
 * 운영자 화면 문지기 (functions/_lib/admin.ts 와 같은 규칙):
 * 로그인 → 운영자 이메일(ADMIN_EMAILS) → 부모 PIN 만들기 → 이 세션에서 PIN 확인(30분) 순서로 통과해야 열림.
 * 화면만 막는 게 아니라 운영자 API 도 같은 조건을 서버에서 다시 확인함
 */
export default function AdminGate({ children }: { children: (me: Me) => ReactNode }) {
  const { loading, user, reload } = useMe();

  if (user?.status === 'active' && user.isAdmin && user.hasPin && user.unlocked) return <>{children(user)}</>;

  let body: ReactNode;
  if (loading) {
    body = <p aria-busy="true">확인하는 중…</p>;
  } else if (!user || user.status !== 'active') {
    body = (
      <>
        <h1 className="title-sm">운영자 로그인이 필요해요</h1>
        <p>운영자로 등록된 계정으로 로그인해 주세요.</p>
        <Link to="/login?next=/admin" className="primary-btn">
          로그인하기
        </Link>
      </>
    );
  } else if (!user.isAdmin) {
    body = (
      <>
        <h1 className="title-sm">운영자만 볼 수 있어요</h1>
        <p>이 계정은 운영자로 등록되어 있지 않아요.</p>
        <Link to="/" className="primary-btn">
          메인으로
        </Link>
      </>
    );
  } else if (!user.hasPin) {
    body = (
      <>
        <h1 className="title-sm">운영자는 PIN 이 필요해요</h1>
        <p>
          운영자 화면에서는 API 키 같은 중요한 설정을 바꿔요.
          <br />
          부모 모드 → 설정에서 숫자 4자리 PIN 을 먼저 만들어 주세요.
        </p>
        <Link to="/parent?next=/dashboard/account" className="primary-btn">
          PIN 만들러 가기
        </Link>
      </>
    );
  } else {
    return (
      <main className="screen gate-screen">
        <SubHeader />
        <div className="gate-body">
          <PinGate onPass={reload} />
        </div>
      </main>
    );
  }

  return (
    <main className="screen gate-screen">
      <SubHeader />
      <div className="gate-body">
        <div className="gate admin-gate">
          <Tobi pose="peek" size={110} />
          {body}
        </div>
      </div>
    </main>
  );
}
