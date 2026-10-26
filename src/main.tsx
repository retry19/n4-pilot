import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

const container = document.getElementById('root');
if (!container) throw new Error('root element missing');

createRoot(container).render(<App />);

// Remove the boot shell once React has painted its first frame.
requestAnimationFrame(() => {
  const boot = document.getElementById('boot');
  if (boot) boot.remove();
});

if (!__DEV__ && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((error) => console.warn('[n4pilot] service worker registration failed', error));
  });
}
