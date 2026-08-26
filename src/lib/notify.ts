/**
 * Bildirim yardımcıları.
 *
 * Üç kanal birlikte kullanılır:
 *  1) Sesli uyarı — gürültülü mutfakta/serviste en güvenilir olan
 *  2) Uygulama içi banner (store.showToast) — ekrana bakan görür
 *  3) Tarayıcı bildirimi — uygulama arka plandayken telefona düşer
 *
 * Ses için dosya yerine Web Audio ile kısa bir ton üretiliyor: ek varlık
 * indirmeye gerek yok, çevrimdışı da çalışır.
 */

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    audioCtx ??= new AC();
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Tarayıcılar ses çalmadan önce bir kullanıcı etkileşimi bekler.
 * İlk dokunuşta çağrılır ki sonraki otomatik uyarılar susmasın.
 */
export function unlockAudio() {
  const c = ctx();
  if (c && c.state === 'suspended') void c.resume();
}

/** Kısa uyarı tonu. tone: 'new' (mutfak) daha alçak, 'ready' (garson) daha tiz */
export function beep(tone: 'new' | 'ready' = 'new') {
  if (!notifyEnabled()) return;
  const c = ctx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();

  const notes = tone === 'ready' ? [880, 1175] : [523, 659];
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = c.currentTime + i * 0.16;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.18);
  });
}

/**
 * Uygulama ana ekrandan (standalone) mı açıldı?
 * iOS'ta bildirim API'si yalnızca ana ekrana eklenmiş uygulamada çalışır;
 * normal Safari sekmesinde `Notification` tanımsızdır.
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Bu cihaz/tarayıcı bildirimi destekliyor mu */
export function notifySupported(): boolean {
  return typeof Notification !== 'undefined';
}

// ---------------------------------------------------------------------------
// Uygulama içi aç/kapa tercihi.
// Tarayıcı izni bir kez verildikten sonra koddan geri alınamaz; kullanıcının
// uyarıları kapatabilmesi için ayrı bir tercih tutuyoruz.
// ---------------------------------------------------------------------------
const ENABLED_KEY = 'latia_notify_enabled';

export function notifyEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setNotifyEnabled(v: boolean) {
  try {
    localStorage.setItem(ENABLED_KEY, v ? '1' : '0');
  } catch {
    /* yoksay */
  }
}

/** Tarayıcı bildirim izni — kullanıcı etkileşimiyle bir kez istenir */
export async function requestNotifyPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export function notifyPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/** Sistem bildirimi (uygulama arka plandayken telefonda görünür) */
export function systemNotify(title: string, body: string) {
  if (!notifyEnabled()) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'latia-order' });
  } catch {
    /* bazı tarayıcılar sayfa içi Notification'ı engeller — sessizce geç */
  }
}
