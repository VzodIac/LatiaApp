import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/tokens.css';
import './theme/global.css';
import { App } from './App';
import { unlockAudio } from './lib/notify';

// Mutfak ekranı ayrı bir PWA olarak kurulabilsin diye manifest değiştirilir.
// Aynı adres tek uygulama olarak kurulduğu için mutfak ve adisyon
// birbirinin yerine geçiyordu; farklı id/start_url ile ikisi ayrı kurulur.
// Tarayıcılar ses çalmadan önce bir kullanıcı etkileşimi bekler
['pointerdown', 'keydown'].forEach((ev) =>
  window.addEventListener(ev, () => unlockAudio(), { once: true, passive: true }),
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
