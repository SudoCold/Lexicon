import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: './',
  plugins: [
    { name:'local-dev-csp', transformIndexHtml: { order:'pre', handler(html,context){return context.server?html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"):html;} } },
    react()
  ],
  server: { host: '127.0.0.1', port: 5173, strictPort: true }
});
