import { useState } from 'react';
import {
  beep,
  isStandalone,
  notifyEnabled,
  notifyPermission,
  notifySupported,
  requestNotifyPermission,
  setNotifyEnabled,
} from '@/lib/notify';
import { useT } from '@/i18n/useT';

/**
 * Bildirim ayarı — hem cihaz kurulumunda hem Ayarlar'da kullanılır.
 *
 * İki ayrı kavram var:
 *  - Tarayıcı izni: bir kez verilir, koddan geri alınamaz.
 *  - Uygulama tercihi: kullanıcı uyarıları istediği zaman kapatıp açabilsin.
 *
 * iOS'ta bildirim API'si yalnızca uygulama ana ekrana eklendiğinde bulunur;
 * normal Safari sekmesinde buton yerine bunu anlatan bir not gösterilir.
 */
export function NotificationSetting({ compact = false }: { compact?: boolean }) {
  const tr = useT();
  const [perm, setPerm] = useState(notifyPermission());
  const [enabled, setEnabled] = useState(notifyEnabled());
  const [busy, setBusy] = useState(false);

  const supported = notifySupported();
  const standalone = isStandalone();

  const ask = async () => {
    setBusy(true);
    const ok = await requestNotifyPermission();
    setPerm(notifyPermission());
    setBusy(false);
    if (ok) {
      setNotifyEnabled(true);
      setEnabled(true);
      beep('ready'); // izin verildiğini duyulur şekilde doğrula
    }
  };

  const toggle = (v: boolean) => {
    setNotifyEnabled(v);
    setEnabled(v);
    if (v) beep('ready');
  };

  const primaryBtn: React.CSSProperties = {
    width: '100%',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 13.5,
    fontWeight: 700,
    opacity: busy ? 0.6 : 1,
  };

  const note = (text: string, color = 'var(--fg2)') => (
    <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color, lineHeight: 1.5 }}>{text}</div>
  );

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
      {!compact && (
        <div style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.5 }}>
          {tr('Sipariş hazır olduğunda sesli ve ekranda uyarı al. Uygulama arka plandayken telefona bildirim düşmesi için izin ver.')}
        </div>
      )}

      {/* iOS: ana ekrana eklenmeden bildirim API'si yok */}
      {!supported && !standalone ? (
        note(tr('Bildirimler için uygulamayı önce ana ekrana ekle, sonra ana ekrandaki ikondan aç.'))
      ) : !supported ? (
        note(tr('Bu tarayıcı bildirimleri desteklemiyor. Sesli uyarı yine de çalışır.'))
      ) : perm === 'denied' ? (
        note(tr('Bildirimler engellenmiş — tarayıcı ayarlarından açabilirsin'), 'var(--danger)')
      ) : perm === 'granted' ? (
        // İzin verilmiş: aç/kapa
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          {[true, false].map((v) => (
            <button
              key={String(v)}
              onClick={() => toggle(v)}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                fontSize: 13.5,
                fontWeight: 700,
                border: `1.5px solid ${enabled === v ? 'var(--accent)' : 'var(--line)'}`,
                background: enabled === v ? 'var(--accent)' : 'var(--surface)',
                color: enabled === v ? '#fff' : 'var(--fg)',
              }}
            >
              {v ? tr('Açık') : tr('Kapalı')}
            </button>
          ))}
        </div>
      ) : (
        <button onClick={() => void ask()} disabled={busy} style={primaryBtn}>
          {busy ? tr('Bekleniyor…') : tr('Bildirimlere izin ver')}
        </button>
      )}
    </div>
  );
}
