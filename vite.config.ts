import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run dev` 는 화면만 띄움. API 는 별도 터미널에서 `npm run dev:api` (8788) 로 띄우면 프록시됨
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8788' },
  },
});
