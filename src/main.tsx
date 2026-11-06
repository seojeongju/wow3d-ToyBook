import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
// 한글 웹폰트는 자체 호스팅 (외부 폰트 서버로 접속 정보가 나가지 않게)
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource/jua/korean-400.css';
import '@fontsource/jua/latin-400.css';
import './styles.css';

// 첫 접속 때 기본 글꼴(맑은 고딕)로 그렸다가 바뀌는 깜빡임 방지:
// 폰트를 바로 요청하고, 첫 화면에 쓰인 폰트가 준비되면 보여 줌 (최대 2.5초, CSS 에도 3초 안전장치)
const SAMPLE = '토이북 읽는 책이 손에 쥐는 장난감으로 우리 아이 그림책 가나다라마바사 0123456789';
const fontLoads = [
  document.fonts.load("400 20px 'Pretendard Variable'", SAMPLE),
  document.fonts.load("700 20px 'Pretendard Variable'", SAMPLE),
  document.fonts.load("400 20px 'Jua'", SAMPLE),
];
const reveal = () => document.documentElement.classList.remove('fonts-loading');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

// 첫 화면이 그려진 다음 프레임에 그 화면이 쓰는 폰트까지 기다림
requestAnimationFrame(() => {
  Promise.race([
    Promise.allSettled(fontLoads).then(() => document.fonts.ready),
    new Promise((done) => setTimeout(done, 2500)),
  ]).then(reveal);
});
