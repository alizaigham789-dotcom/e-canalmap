import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// Service worker — only register in production builds. In dev, a stale worker
// from a previous build can cache old Vite chunks and cause null-React / hook
// crashes (e.g. "Cannot read properties of null (reading 'useRef')"), so we
// unregister any existing workers and clear caches instead.
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister().then(() => console.info('[dev] unregistered stale SW:', r.scope)));
      }).catch(() => {});
      if (caches) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      }
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage('SKIP_WAITING');
            }
          });
        });
        reg.update().catch(() => {});
        setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
      }).catch((err) => console.warn('SW registration failed:', err));
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
}