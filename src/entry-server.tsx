import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from './App';

export { PAGE_META, PUBLIC_ROUTES, PRIVATE_PREFIXES, SITE_URL, OG_IMAGE, BRAND, llmsTxt } from './seo';

/** 빌드 때 공개 페이지를 완성된 HTML 로 미리 그림 (scripts/prerender.mjs 에서 사용) */
export function render(url: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );
}
