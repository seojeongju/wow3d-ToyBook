// 빌드 전 실행: 주아체에서 사이트 화면 문구에 실제로 쓰인 글자만 뽑아 작은 폰트(public/fonts/jua-ui.woff2)를 만든다.
// 첫 화면 제목이 이 작은 파일 하나로 바로 그려져 폰트 대기 시간이 줄어듦 (성능·SEO Core Web Vitals).
// 여기 없는 글자(새 책 제목 등)는 조각으로 나뉜 전체 주아체(@fontsource/jua/400.css)가 필요한 부분만 받아 채움.
import fs from 'node:fs';
import path from 'node:path';
import subsetFont from 'subset-font';

const SRC_DIRS = ['src'];
const OUT = path.resolve('public/fonts/jua-ui.woff2');
const FONT_DIR = path.resolve('node_modules/@fontsource/jua/files');

// 화면 문구가 들어 있는 소스에서 글자 모으기
function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (/\.(tsx?|css)$/.test(e.name)) files.push(p);
  }
  return files;
}

const chars = new Set();
for (const f of SRC_DIRS.flatMap((d) => walk(path.resolve(d)))) {
  for (const ch of fs.readFileSync(f, 'utf8')) {
    const cp = ch.codePointAt(0);
    const hangul = cp >= 0xac00 && cp <= 0xd7a3;
    const printable = cp >= 0x20 && cp <= 0x7e;
    const punct = '·…~!?.,()「」『』“”‘’♥%'.includes(ch);
    if (hangul || printable || punct) chars.add(ch);
  }
}
// 숫자·영문은 항상 포함
for (let cp = 0x20; cp <= 0x7e; cp++) chars.add(String.fromCodePoint(cp));
const text = [...chars].join('');

// 한글 파일과 라틴 파일에서 각각 뽑아 합침 (주아체는 두 파일로 나뉘어 배포됨)
const korean = fs.readFileSync(path.join(FONT_DIR, 'jua-korean-400-normal.woff2'));
const subset = await subsetFont(korean, text, { targetFormat: 'woff2' });

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, subset);
console.log(`주아체 화면용 글자 ${chars.size}자 → ${(subset.length / 1024).toFixed(1)}KB (원본 한글 파일 ${(korean.length / 1024).toFixed(0)}KB)`);
