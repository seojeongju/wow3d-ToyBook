// 부모 잠금 통과 여부 (탭을 닫으면 다시 잠김). 아이가 실수로 들어오는 것만 막는 UX 장치이고,
// 결제·주문 같은 민감한 동작은 로그인 연동 후 서버에서 부모 PIN 으로 따로 확인해야 함
const KEY = 'toybook.parentUnlocked';

export function isParentUnlocked(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setParentUnlocked(on: boolean) {
  try {
    if (on) sessionStorage.setItem(KEY, '1');
    else sessionStorage.removeItem(KEY);
  } catch {
    /* 저장소를 못 써도 이번 화면 흐름에는 영향 없음 */
  }
}
