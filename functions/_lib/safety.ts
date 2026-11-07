/**
 * 어린이 안전 필터 (연락처·외부 링크·부적절 표현 자동 차단)
 * 도서관·서점 출품 글(제목, 작가 필명, 한줄 소개, 본문) 검증에 공통 사용
 */

const CONTACT_PATTERNS: { re: RegExp; msg: string }[] = [
  { re: /01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}/, msg: '휴대폰 번호는 공개 도서에 넣을 수 없어요. 안전을 위해 지워 주세요.' },
  { re: /\b0\d{1,2}[\s.-]\d{3,4}[\s.-]\d{4}\b/, msg: '전화번호는 공개 도서에 넣을 수 없어요.' },
  { re: /[\w.+-]+@[\w-]+\.[\w.]+/, msg: '이메일 주소는 공개 도서에 넣을 수 없어요.' },
  { re: /(open\.kakao\.com|t\.me\/|discord\.gg|http:\/\/|https:\/\/)/i, msg: '외부 웹사이트 주소나 오픈채팅 링크는 넣을 수 없어요.' },
  { re: /\d{6}[\s-]?\d{7}/, msg: '주민등록번호 형식의 숫자는 넣을 수 없어요.' },
];

const BAD_WORDS = [
  '바보멍청이',
  '죽어라',
  '죽일',
  '살인',
  '자살',
  '씨발',
  '시발',
  '병신',
  '개새끼',
  '미친놈',
  '미친년',
  '꺼져',
  '닥쳐',
  '도박',
  '마약',
  '성인용',
  '혐오',
];

export function checkChildSafeText(...texts: (string | null | undefined)[]): { ok: true } | { ok: false; reason: string } {
  const joined = texts.filter(Boolean).join(' ');
  for (const { re, msg } of CONTACT_PATTERNS) {
    if (re.test(joined)) return { ok: false, reason: msg };
  }
  const compact = joined.replace(/\s+/g, '').toLowerCase();
  for (const word of BAD_WORDS) {
    if (compact.includes(word)) {
      return {
        ok: false,
        reason: '어린이 도서관·서점에 어울리지 않는 부적절한 표현이 포함되어 있어요. 다정한 말로 고쳐 주세요.',
      };
    }
  }
  return { ok: true };
}

