import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
// 한글 웹폰트는 자체 호스팅 (외부 폰트 서버로 접속 정보가 나가지 않게)
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
// 주아체: 화면 문구용 작은 파일(Jua UI, 빌드 때 생성·미리 불러옴) + 그 밖의 글자는 조각으로 나뉜 전체 폰트에서 필요한 부분만
import '@fontsource/jua/400.css';
import './styles.css';

// 첫 접속 때 기본 글꼴(맑은 고딕)로 그렸다가 바뀌는 깜빡임 방지:
// 폰트를 바로 요청하고, 첫 화면에 쓰인 폰트가 준비되면 보여 줌 (최대 1.5초, CSS 에도 2초 안전장치)
const SAMPLE = '토이북 읽는 책이 손에 쥐는 장난감으로 우리 아이 그림책 가나다라마바사 0123456789';
const fontLoads = [
  document.fonts.load("400 20px 'Pretendard Variable'", SAMPLE),
  document.fonts.load("700 20px 'Pretendard Variable'", SAMPLE),
  document.fonts.load("400 20px 'Jua UI'", SAMPLE),
];
const reveal = () => document.documentElement.classList.remove('fonts-loading');

const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// 공개 페이지는 빌드 때 미리 그린 HTML(검색·AI 로봇용)을 그대로 이어받고(hydrate),
// 그 밖의 경로는 같은 HTML 이 내려와도 비우고 새로 그림 (scripts/prerender.mjs)
const root = document.getElementById('root')!;
if (root.dataset.prerendered === window.location.pathname) {
  hydrateRoot(root, app);
} else {
  root.textContent = '';
  delete root.dataset.prerendered;
  createRoot(root).render(app);
}

// 첫 화면이 그려진 다음 프레임에 그 화면이 쓰는 폰트까지 기다림
requestAnimationFrame(() => {
  Promise.race([
    Promise.allSettled(fontLoads).then(() => document.fonts.ready),
    new Promise((done) => setTimeout(done, 1500)),
  ]).then(reveal);
});
