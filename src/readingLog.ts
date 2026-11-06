/**
 * 읽은 기록 (이 기기에만 저장). 로그인 연동 전이라 서버 대신 기기에 날짜별로 읽은 쪽을 모음.
 * 부모 대시보드 "이번 주 읽은 쪽 수" 차트에 씀. 로그인 후에는 서버로 옮길 것.
 * 같은 날 같은 쪽을 여러 번 봐도 한 번으로 셈.
 */
const KEY = 'toybook.readingLog';
const KEEP_DAYS = 60;

type Log = Record<string, Record<string, string[]>>; // 날짜(YYYY-MM-DD) → 아이 id → "책id:쪽id" 목록

function today(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function load(): Log {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

function save(log: Log) {
  // 오래된 날짜는 정리
  const cutoff = today(new Date(Date.now() - KEEP_DAYS * 86400000));
  for (const day of Object.keys(log)) if (day < cutoff) delete log[day];
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    /* 저장 못 해도 읽기에는 영향 없음 */
  }
}

/** 한 쪽을 펼쳐 봤을 때 기록 */
export function logPageRead(childId: string | null | undefined, bookId: string, pageId: string) {
  const who = childId || 'default';
  const log = load();
  const day = today();
  const list = ((log[day] ??= {})[who] ??= []);
  const key = `${bookId}:${pageId}`;
  if (!list.includes(key)) {
    list.push(key);
    save(log);
  }
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 오늘을 포함한 최근 7일 동안 날마다 읽은 쪽 수 (childId 없으면 모든 아이 합계) */
export function weeklyPages(childId?: string): { label: string; value: number }[] {
  const log = load();
  const out: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const day = log[today(d)] ?? {};
    const value = childId ? (day[childId]?.length ?? 0) : Object.values(day).reduce((s, l) => s + l.length, 0);
    out.push({ label: i === 0 ? '오늘' : WEEKDAYS[d.getDay()], value });
  }
  return out;
}
